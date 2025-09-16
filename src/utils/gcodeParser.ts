import JSZip from 'jszip'

export interface GcodeMetadata {
  printer_model?: string
  printer_brand?: string
  material_name?: string
  material_type?: string
  print_settings_id?: string
  print_settings_name?: string
  application?: string
  creation_date?: string
  designer_user_id?: string
  [key: string]: string | undefined
}

export interface GcodeAnalysis {
  totalLines: number
  printTime: number
  filamentUsed: number
  layerHeight: number
  infillDensity: number
  printSpeed: number
  temperature: number
  bedTemperature: number
  estimatedTime: string
  materialType: string
  printerModel: string
  errors: string[]
  warnings: string[]
  // Proprietà aggiuntive per compatibilità con il database
  peso_grammi?: number
  tempo_stampa_min?: number
  materiale?: string
  stampante?: string
}

export interface ConcatenationCandidate {
  ordineIds: number[]
  gcodeIds: number[]
  stampanteId: string
  materialName: string
  printSettingsName: string
  totalQuantity: number
  isSameGcode: boolean
}

/**
 * Parsa i metadati XML dal file .gcode.3mf
 */
function parseXmlMetadata(xmlContent: string): GcodeMetadata {
  const metadata: GcodeMetadata = {}
  
  try {
    // Estrai i metadati usando regex per semplicità
    // In futuro si potrebbe usare un parser XML più robusto
    
    // Application
    const appMatch = xmlContent.match(/<metadata name="Application">([^<]+)<\/metadata>/)
    if (appMatch) {
      metadata.application = appMatch[1]
    }
    
    // Creation Date
    const dateMatch = xmlContent.match(/<metadata name="CreationDate">([^<]+)<\/metadata>/)
    if (dateMatch) {
      metadata.creation_date = dateMatch[1]
    }
    
    // Designer User ID
    const designerMatch = xmlContent.match(/<metadata name="DesignerUserId">([^<]+)<\/metadata>/)
    if (designerMatch) {
      metadata.designer_user_id = designerMatch[1]
    }
    
    // Verifica se è BambuStudio
    if (metadata.application?.toLowerCase().includes('bambustudio')) {
      metadata.printer_brand = 'Bambu Lab'
      metadata.printer_model = 'Bambu Studio'
    }
    
    // Estrai informazioni dal nome dell'applicazione
    const appName = metadata.application || ''
    if (appName.toLowerCase().includes('bambu')) {
      metadata.printer_brand = 'Bambu Lab'
    }
    
    console.log('📋 Metadati XML estratti:', metadata)
    return metadata
    
  } catch (error) {
    console.error('❌ Errore parsing XML:', error)
    return {
      error: 'Errore parsing XML',
      raw_xml: xmlContent.substring(0, 500)
    }
  }
}

/**
 * Parser semplice per file di configurazione stile INI/TOML (key = value | key: value)
 */
function parseKeyValueConfig(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue
    // Rimuovi eventuali quotes esterne
    const match = line.match(/^(.*?)\s*(?:=|:)\s*(.*)$/)
    if (!match) continue
    const key = match[1].trim().replace(/^"|"$/g, '')
    let value = match[2].trim()
    value = value.replace(/^"|"$/g, '')
    // Solo una prima mappatura basilare, normalizziamo le chiavi comuni
    result[key] = value
    const lowerKey = key.toLowerCase()
    if (lowerKey.includes('printer') && lowerKey.includes('model')) result.printer_model = value
    if (lowerKey.includes('printer') && lowerKey.includes('brand')) result.printer_brand = value
    if (lowerKey.includes('material') && lowerKey.includes('name')) result.material_name = value
    if (lowerKey.includes('material') && lowerKey.endsWith('type')) result.material_type = value
    if (lowerKey.includes('print') && lowerKey.includes('settings') && lowerKey.endsWith('name')) result.print_settings_name = value
    if (lowerKey.includes('print') && lowerKey.includes('settings') && lowerKey.endsWith('id')) result.print_settings_id = value
    if (lowerKey.includes('application')) result.application = value
    if (lowerKey.includes('creation') && lowerKey.includes('date')) result.creation_date = value
  }
  return result
}

/**
 * Estrae metadati dalle prime righe del .gcode (commenti di header)
 */
function parseGcodeHeaderForMetadata(gcodeContent: string): Partial<GcodeMetadata> {
  const meta: Partial<GcodeMetadata> = {}
  const header = gcodeContent.split(/\r?\n/).slice(0, 400).join('\n') // prime righe bastano
  const pairs: Array<[keyof GcodeMetadata, RegExp]> = [
    ['printer_model', /;\s*PRINTER_MODEL\s*[:=]\s*([^;\n]+)/i],
    ['material_name', /;\s*(?:MATERIAL_NAME|MATERIAL)\s*[:=]\s*([^;\n]+)/i],
    ['print_settings_name', /;\s*(?:PRINT_SETTINGS_NAME|PROFILE)\s*[:=]\s*([^;\n]+)/i],
  ]
  for (const [key, regex] of pairs) {
    const m = header.match(regex)
    if (m) meta[key] = m[1].trim()
  }
  // Alcuni slicer mettono Application e CreationDate in commenti
  const app = header.match(/;\s*(?:APPLICATION|SLICER)\s*[:=]\s*([^;\n]+)/i)
  if (app) meta.application = app[1].trim()
  const created = header.match(/;\s*(?:CREATION_DATE|CREATED_AT)\s*[:=]\s*([^;\n]+)/i)
  if (created) meta.creation_date = created[1].trim()
  // Heuristic brand
  if (meta.printer_model && /bambu/i.test(meta.printer_model)) meta.printer_brand = 'Bambu Lab'
  return meta
}

/**
 * Estrae i metadati da un file .gcode.3mf
 * I file .gcode.3mf sono essenzialmente file ZIP che contengono metadati
 */
export async function extractGcodeMetadata(file: File): Promise<GcodeMetadata> {
  try {
    console.log('🔍 Iniziando estrazione metadati...')
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(file)
    
    console.log('📦 File ZIP caricato, file contenuti:')
    const fileNames = Object.keys(zipContent.files)
    console.log('File disponibili:', fileNames)
    
    // Cerca i file di metadati/setting più comuni (Bambu Studio, PrusaSlicer, Orca, ecc.)
    const metadataFiles = [
      'Metadata/metadata.json',
      'Metadata/Metadata.json',
      'metadata.json',
      'Metadata.json',
      'metadata.xml',
      'Metadata.xml',
      // Bambu Studio specific
      'Metadata/project_settings.config',
      'Metadata/slice_info.config',
      'Metadata/model_settings.config',
      // Fallback
      '3D/3dmodel.model'
    ]
    
    let metadataContent: string | null = null
    let foundFile: string | null = null
    
    for (const filename of metadataFiles) {
      const metadataFile = zipContent.file(filename)
      if (metadataFile) {
        console.log('✅ Trovato file metadati:', filename)
        foundFile = filename
        metadataContent = await metadataFile.async('string')
        break
      }
    }
    
    if (!metadataContent) {
      // Se non troviamo i file standard, cerchiamo qualsiasi file che potrebbe contenere metadati
      console.log('🔍 Cercando file alternativi...')
      
      for (const fileName of fileNames) {
        if (fileName.toLowerCase().includes('metadata') || 
            fileName.toLowerCase().includes('config') ||
            fileName.toLowerCase().includes('settings') ||
            fileName.toLowerCase().includes('info') ||
            fileName.toLowerCase().includes('model')) {
          console.log('📄 Provando file:', fileName)
          const file = zipContent.file(fileName)
          if (file) {
            try {
              const content = await file.async('string')
              console.log('📋 Contenuto file:', fileName, ':', content.substring(0, 200) + '...')
              
              // Prova a parsare come JSON
              try {
                JSON.parse(content)
                console.log('✅ File JSON valido trovato:', fileName)
                foundFile = fileName
                metadataContent = content
                break
              } catch {
                // Non è JSON, potrebbe essere XML
                if (content.trim().startsWith('<?xml') || content.trim().startsWith('<model')) {
                  console.log('✅ File XML trovato:', fileName)
                  foundFile = fileName
                  metadataContent = content
                  break
                }
                console.log('❌ File non è JSON o XML valido:', fileName)
              }
            } catch (err) {
              console.log('❌ Errore lettura file:', fileName, err)
            }
          }
        }
      }
    }
    
    if (!metadataContent) {
      console.log('❌ Nessun file di metadati trovato')
      console.log('📋 Tutti i file disponibili:', fileNames)
      
      // Restituisci un oggetto con informazioni di debug
      return {
        debug_files: fileNames.join(', '),
        error: 'Nessun file di metadati trovato nel file .gcode.3mf'
      }
    }
    
    console.log('📋 Metadati estratti da:', foundFile)
    
    // Prova come JSON
    try {
      const parsedMetadata = JSON.parse(metadataContent)
      console.log('✅ Metadati parsati come JSON')
      return parsedMetadata
    } catch {
      // Prova come XML
      if (metadataContent.trim().startsWith('<?xml') || metadataContent.trim().startsWith('<model')) {
        console.log('✅ Parsing come XML...')
        return parseXmlMetadata(metadataContent)
      }
      // Prova come file di configurazione key=value (Bambu .config)
      if (foundFile && foundFile.endsWith('.config')) {
        console.log('✅ Parsing come CONFIG...')
        const cfg = parseKeyValueConfig(metadataContent)
        // Normalizza in GcodeMetadata
        const md: GcodeMetadata = {
          application: cfg.application || cfg['generated_by'] || cfg['app'] || undefined,
          creation_date: cfg.creation_time || cfg['created_at'] || undefined,
          printer_brand: cfg.printer_brand || (cfg.printer?.includes('Bambu') ? 'Bambu Lab' : undefined),
          printer_model: cfg.printer_model || cfg.printer || undefined,
          material_name: cfg.material_name || cfg.material || undefined,
          material_type: cfg.material_type || undefined,
          print_settings_name: cfg.print_settings_name || cfg.profile || undefined,
          print_settings_id: cfg.print_settings_id || undefined,
        }
        return md
      }

      // Ultimo tentativo: leggere i .gcode in Metadata/ e parsare l'header
      const plateGcodes = Object.keys(zipContent.files).filter(n => /Metadata\/plate_\d+\.gcode$/i.test(n))
      if (plateGcodes.length > 0) {
        try {
          const headerContent = await zipContent.file(plateGcodes[0])!.async('string')
          const md = parseGcodeHeaderForMetadata(headerContent)
          if (Object.keys(md).length > 0) {
            console.log('✅ Metadati ricavati dall\'header del G-code')
            return md as GcodeMetadata
          }
        } catch {}
      }

      console.log('❌ Formato metadati non riconosciuto')
      return { 
        raw_metadata: metadataContent,
        source_file: foundFile || undefined,
        error: 'Metadati non riconosciuti (JSON/XML/CONFIG falliti)'
      }
    }
  } catch (error) {
    console.error('❌ Errore estrazione metadati:', error)
    throw new Error(`Impossibile estrarre metadati dal file .gcode.3mf: ${error}`)
  }
}

/**
 * Analizza un file G-code per estrarre informazioni
 */
export async function analyzeGcodeFile(file: File): Promise<GcodeAnalysis> {
  console.log('🔍 [ANALYZE] Inizio analisi file:', file.name, 'tipo:', file.type, 'dimensione:', file.size)
  
  const analysis: GcodeAnalysis = {
    totalLines: 0,
    printTime: 0,
    filamentUsed: 0,
    layerHeight: 0,
    infillDensity: 0,
    printSpeed: 0,
    temperature: 0,
    bedTemperature: 0,
    estimatedTime: '',
    materialType: '',
    printerModel: '',
    errors: [],
    warnings: []
  }

  try {
    let text = ''
    const lowerName = file.name.toLowerCase()
    console.log('🔍 [ANALYZE] Nome file normalizzato:', lowerName)
    
    if (lowerName.endsWith('.gcode.3mf')) {
      console.log('🔍 [ANALYZE] Rilevato file .gcode.3mf, apro come ZIP...')
      // Apri lo ZIP e cerca il plate gcode
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(file)
      const allFiles = Object.keys(zipContent.files)
      console.log('🔍 [ANALYZE] File nel ZIP:', allFiles)
      
      const plate = Object.keys(zipContent.files).find(n => /Metadata\/plate_\w+\.gcode$/i.test(n))
      console.log('🔍 [ANALYZE] Plate gcode trovato:', plate)
      
      if (plate && zipContent.file(plate)) {
        text = await zipContent.file(plate)!.async('string')
        console.log('🔍 [ANALYZE] Contenuto plate gcode caricato, lunghezza:', text.length)
        console.log('🔍 [ANALYZE] Prime 500 caratteri del gcode:', text.substring(0, 500))
      } else {
        // fallback: qualsiasi file .gcode
        const anyGcode = Object.keys(zipContent.files).find(n => n.toLowerCase().endsWith('.gcode'))
        console.log('🔍 [ANALYZE] Fallback gcode trovato:', anyGcode)
        if (anyGcode && zipContent.file(anyGcode)) {
          text = await zipContent.file(anyGcode)!.async('string')
          console.log('🔍 [ANALYZE] Contenuto gcode fallback caricato, lunghezza:', text.length)
        }
      }

      // Prova a leggere anche il file di configurazione per tempo/materiale
      const cfgFile = zipContent.file('Metadata/slice_info.config') || zipContent.file('Metadata/project_settings.config')
      console.log('🔍 [ANALYZE] File config trovato:', cfgFile ? 'sì' : 'no')
      
      if (cfgFile) {
        try {
          const cfgText = await cfgFile.async('string')
          console.log('🔍 [ANALYZE] Contenuto config:', cfgText.substring(0, 1000))
          
          // Prova a parsare come XML per Bambu Studio
          if (cfgText.trim().startsWith('<?xml')) {
            console.log('🔍 [ANALYZE] Config è XML, estraggo valori...')
            
            // Estrai prediction (tempo in secondi)
            const predictionMatch = cfgText.match(/<metadata key="prediction" value="(\d+)"/)
            if (predictionMatch) {
              const timeSec = parseInt(predictionMatch[1])
              analysis.printTime = timeSec
              analysis.tempo_stampa_min = Math.ceil(timeSec / 60)
              console.log('✅ [ANALYZE] Tempo impostato da config XML:', analysis.printTime, 'sec,', analysis.tempo_stampa_min, 'min')
            }
            
            // Estrai weight (peso filamento)
            const weightMatch = cfgText.match(/<metadata key="weight" value="([\d.]+)"/)
            if (weightMatch) {
              const filamentG = parseFloat(weightMatch[1])
              analysis.filamentUsed = filamentG
              analysis.peso_grammi = Math.round(filamentG)
              console.log('✅ [ANALYZE] Filamento impostato da config XML:', analysis.filamentUsed, 'g,', analysis.peso_grammi, 'g')
            }
            
            // Estrai printer model
            const printerMatch = cfgText.match(/<metadata key="printer_model_id" value="([^"]+)"/)
            if (printerMatch) {
              analysis.printerModel = printerMatch[1]
              analysis.stampante = printerMatch[1]
              console.log('✅ [ANALYZE] Stampante impostata da config XML:', analysis.printerModel)
            }
            
            // Estrai materiale dal filament
            const filamentMatch = cfgText.match(/<filament[^>]*type="([^"]+)"[^>]*color="([^"]+)"/)
            if (filamentMatch) {
              analysis.materialType = filamentMatch[1]
              analysis.materiale = filamentMatch[1]
              console.log('✅ [ANALYZE] Materiale impostato da config XML:', analysis.materialType)
            }
          } else {
            // Fallback: prova come key=value
            const cfg = parseKeyValueConfig(cfgText) as Record<string, string>
            console.log('🔍 [ANALYZE] Config parsato come key=value:', Object.keys(cfg))
            
            const timeSec = Number(cfg['total_time_sec'] || cfg['print_time_sec'] || cfg['gcode_time_sec'])
            console.log('🔍 [ANALYZE] Tempo config:', { timeSec, keys: Object.keys(cfg).filter(k => k.includes('time')) })
            if (!isNaN(timeSec) && timeSec > 0) {
              analysis.printTime = Math.round(timeSec)
              analysis.tempo_stampa_min = Math.ceil(timeSec / 60)
              console.log('✅ [ANALYZE] Tempo impostato da config:', analysis.printTime, 'sec,', analysis.tempo_stampa_min, 'min')
            }
            
            const filamentG = Number(cfg['filament_used_g'] || cfg['filament_total_g'] || cfg['filament_weight_g'])
            console.log('🔍 [ANALYZE] Filamento config:', { filamentG, keys: Object.keys(cfg).filter(k => k.includes('filament')) })
            if (!isNaN(filamentG) && filamentG > 0) {
              analysis.filamentUsed = filamentG
              analysis.peso_grammi = Math.round(filamentG)
              console.log('✅ [ANALYZE] Filamento impostato da config:', analysis.filamentUsed, 'g,', analysis.peso_grammi, 'g')
            }
            
            if (cfg['printer_model']) {
              analysis.printerModel = cfg['printer_model']
              analysis.stampante = cfg['printer_model']
              console.log('✅ [ANALYZE] Stampante impostata da config:', analysis.printerModel)
            }
            
            const mat = cfg['material_name'] || cfg['material']
            if (mat) {
              analysis.materialType = mat
              analysis.materiale = mat
              console.log('✅ [ANALYZE] Materiale impostato da config:', analysis.materialType)
            }
          }
        } catch (err) {
          console.log('❌ [ANALYZE] Errore parsing config:', err)
        }
      }
    } else {
      console.log('🔍 [ANALYZE] File .gcode classico, leggo direttamente')
      // File .gcode classico
      text = await file.text()
      console.log('🔍 [ANALYZE] Contenuto gcode caricato, lunghezza:', text.length)
    }
    const lines = text.split('\n')
    analysis.totalLines = lines.length
    console.log('🔍 [ANALYZE] Analizzando', lines.length, 'righe di G-code')

    for (const line of lines) {
      const trimmedLine = line.trim().toUpperCase()
      
      // Tempo di stampa (diverse etichette possibili)
      if (trimmedLine.includes(';TIME:') || trimmedLine.includes(';PRINT_TIME:') || trimmedLine.includes(';ESTIMATED_TIME:') || trimmedLine.includes('MODEL PRINTING TIME:')) {
        // Formato Bambu: ; model printing time: 49m 17s; total estimated time: 51m 4s
        const bambuMatch = line.match(/model printing time:\s*(\d+)m\s*(\d+)s/i)
        if (bambuMatch) {
          const minutes = parseInt(bambuMatch[1])
          const seconds = parseInt(bambuMatch[2])
          analysis.printTime = minutes * 60 + seconds
          analysis.tempo_stampa_min = minutes
          console.log('✅ [ANALYZE] Tempo trovato nel G-code (Bambu):', analysis.printTime, 'sec,', analysis.tempo_stampa_min, 'min')
        } else {
          // Formato standard
          const match = line.match(/;(?:TIME|PRINT_TIME|ESTIMATED_TIME):\s*(\d+)/i)
          if (match) {
            analysis.printTime = parseInt(match[1])
            analysis.tempo_stampa_min = Math.ceil(analysis.printTime / 60)
            console.log('✅ [ANALYZE] Tempo trovato nel G-code (standard):', analysis.printTime, 'sec,', analysis.tempo_stampa_min, 'min')
          }
        }
      }
      
      // Filamento utilizzato (diverse etichette possibili)
      if (trimmedLine.includes(';FILAMENT_USED') || trimmedLine.includes(';FILAMENT_WEIGHT') || trimmedLine.includes('TOTAL FILAMENT WEIGHT')) {
        // Formato Bambu: ; total filament weight [g] : 44.18
        const bambuMatch = line.match(/total filament weight\s*\[g\]\s*:\s*([\d.]+)/i)
        if (bambuMatch) {
          analysis.filamentUsed = parseFloat(bambuMatch[1])
          analysis.peso_grammi = Math.round(analysis.filamentUsed)
          console.log('✅ [ANALYZE] Filamento trovato nel G-code (Bambu):', analysis.filamentUsed, 'g,', analysis.peso_grammi, 'g')
        } else {
          // Formato standard
          const match = line.match(/;(?:FILAMENT_USED|FILAMENT_WEIGHT):\s*([\d.]+)/i)
          if (match) {
            analysis.filamentUsed = parseFloat(match[1])
            analysis.peso_grammi = Math.round(analysis.filamentUsed)
            console.log('✅ [ANALYZE] Filamento trovato nel G-code (standard):', analysis.filamentUsed, 'g,', analysis.peso_grammi, 'g')
          }
        }
      }
      
      // Altezza layer
      if (trimmedLine.includes(';LAYER_HEIGHT:')) {
        const match = line.match(/;LAYER_HEIGHT:([\d.]+)/)
        if (match) analysis.layerHeight = parseFloat(match[1])
      }
      
      // Densità infill
      if (trimmedLine.includes(';INFILL_DENSITY:')) {
        const match = line.match(/;INFILL_DENSITY:([\d.]+)/)
        if (match) analysis.infillDensity = parseFloat(match[1])
      }
      
      // Velocità stampa
      if (trimmedLine.includes(';PRINT_SPEED:')) {
        const match = line.match(/;PRINT_SPEED:([\d.]+)/)
        if (match) analysis.printSpeed = parseFloat(match[1])
      }
      
      // Temperatura
      if (trimmedLine.includes('M104') || trimmedLine.includes('M109')) {
        const match = line.match(/S(\d+)/)
        if (match) analysis.temperature = parseInt(match[1])
      }
      
      // Temperatura piatto
      if (trimmedLine.includes('M140') || trimmedLine.includes('M190')) {
        const match = line.match(/S(\d+)/)
        if (match) analysis.bedTemperature = parseInt(match[1])
      }
      
      // Modello stampante
      if (trimmedLine.includes(';PRINTER_MODEL:') || trimmedLine.includes(';PRINTER:')) {
        const match = line.match(/;(?:PRINTER_MODEL|PRINTER):\s*([^;\n]+)/i)
        if (match) {
          analysis.printerModel = match[1].trim()
          analysis.stampante = match[1].trim()
          console.log('✅ [ANALYZE] Stampante trovata nel G-code:', analysis.printerModel)
        }
      }
      
      // Tipo materiale
      if (trimmedLine.includes(';MATERIAL:') || trimmedLine.includes(';MATERIAL_NAME:')) {
        const match = line.match(/;(?:MATERIAL|MATERIAL_NAME):\s*([^;\n]+)/i)
        if (match) {
          analysis.materialType = match[1].trim()
          analysis.materiale = match[1].trim()
          console.log('✅ [ANALYZE] Materiale trovato nel G-code:', analysis.materialType)
        }
      }
    }

    // Calcola tempo stimato
    if (analysis.printTime > 0) {
      const hours = Math.floor(analysis.printTime / 3600)
      const minutes = Math.floor((analysis.printTime % 3600) / 60)
      analysis.estimatedTime = `${hours}h ${minutes}m`
    }

    // Debug finale
    console.log('🔍 [ANALYZE] RISULTATO FINALE:')
    console.log('  - Tempo stampa:', analysis.printTime, 'sec,', analysis.tempo_stampa_min, 'min')
    console.log('  - Filamento:', analysis.filamentUsed, 'g, peso:', analysis.peso_grammi, 'g')
    console.log('  - Stampante:', analysis.printerModel, '->', analysis.stampante)
    console.log('  - Materiale:', analysis.materialType, '->', analysis.materiale)
    console.log('  - Errori:', analysis.errors.length)
    console.log('  - Warnings:', analysis.warnings.length)

  } catch (error) {
    console.log('❌ [ANALYZE] Errore durante analisi:', error)
    analysis.errors.push(`Errore analisi file: ${error}`)
  }

  return analysis
}

/**
 * Verifica se un file G-code è per una stampante Bambu Lab
 */
export function isBambuLabPrinter(metadata: GcodeMetadata): boolean {
  const printerBrand = metadata.printer_brand?.toLowerCase()
  const printerModel = metadata.printer_model?.toLowerCase()
  const application = metadata.application?.toLowerCase() ?? ''

  return (
    (printerBrand?.includes('bambu') ?? false) ||
    (printerBrand?.includes('bambulab') ?? false) ||
    (printerModel?.includes('bambu') ?? false) ||
    (printerModel?.includes('bambulab') ?? false) ||
    printerModel?.includes('x1') ||
    printerModel?.includes('p1') ||
    printerModel?.includes('a1') ||
    application?.includes('bambustudio') ||
    application?.includes('bambu')
  )
}

/**
 * Verifica se il profilo di stampa è automatico
 */
export function isAutomaticProfile(metadata: GcodeMetadata, automaticProfileName: string): boolean {
  const printSettingsName = metadata.print_settings_name?.toLowerCase()
  const automaticProfile = automaticProfileName.toLowerCase()
  
  return Boolean(printSettingsName && printSettingsName.includes(automaticProfile))
}

/**
 * Ottiene il nome del materiale dal metadata
 */
export function getMaterialName(metadata: GcodeMetadata): string {
  return metadata.material_name || metadata.material_type || 'Unknown'
}

/**
 * Ottiene il nome del profilo di stampa dal metadata
 */
export function getPrintSettingsName(metadata: GcodeMetadata): string {
  return metadata.print_settings_name || metadata.print_settings_id || 'Unknown'
} 