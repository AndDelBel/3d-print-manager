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
    
    // Cerca il file di metadati in varie posizioni possibili
    const metadataFiles = [
      'metadata.json',
      'Metadata.json', 
      'metadata.xml',
      'Metadata.xml',
      '3D/3dmodel.model',
      '3D/3dmodel.model/thumbnail.png',
      'Metadata/thumbnail.png',
      'Metadata/metadata.json',
      'Metadata/Metadata.json'
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
                const jsonContent = JSON.parse(content)
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
    
    // Prova a parsare come JSON
    try {
      const parsedMetadata = JSON.parse(metadataContent)
      console.log('✅ Metadati parsati come JSON')
      return parsedMetadata
    } catch (parseError) {
      console.log('❌ Errore parsing JSON, provando XML...')
      
      // Prova a parsare come XML
      if (metadataContent.trim().startsWith('<?xml') || metadataContent.trim().startsWith('<model')) {
        console.log('✅ Parsing come XML...')
        return parseXmlMetadata(metadataContent)
      }
      
      console.log('❌ Errore parsing XML')
      console.log('📋 Contenuto grezzo:', metadataContent.substring(0, 500))
      
      // Se non è JSON o XML, restituiamo il contenuto grezzo
      return { 
        raw_metadata: metadataContent,
        source_file: foundFile || undefined,
        error: 'Metadati non in formato JSON o XML riconosciuto'
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
    const text = await file.text()
    const lines = text.split('\n')
    analysis.totalLines = lines.length

    for (const line of lines) {
      const trimmedLine = line.trim().toUpperCase()
      
      // Tempo di stampa
      if (trimmedLine.includes(';TIME:')) {
        const match = line.match(/;TIME:(\d+)/)
        if (match) {
          analysis.printTime = parseInt(match[1])
          analysis.tempo_stampa_min = Math.ceil(analysis.printTime / 60)
        }
      }
      
      // Filamento utilizzato
      if (trimmedLine.includes(';FILAMENT_USED:')) {
        const match = line.match(/;FILAMENT_USED:([\d.]+)/)
        if (match) {
          analysis.filamentUsed = parseFloat(match[1])
          analysis.peso_grammi = Math.round(analysis.filamentUsed)
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
      if (trimmedLine.includes(';PRINTER_MODEL:')) {
        const match = line.match(/;PRINTER_MODEL:([^;]+)/)
        if (match) {
          analysis.printerModel = match[1].trim()
          analysis.stampante = match[1].trim()
        }
      }
      
      // Tipo materiale
      if (trimmedLine.includes(';MATERIAL:')) {
        const match = line.match(/;MATERIAL:([^;]+)/)
        if (match) {
          analysis.materialType = match[1].trim()
          analysis.materiale = match[1].trim()
        }
      }
    }

    // Calcola tempo stimato
    if (analysis.printTime > 0) {
      const hours = Math.floor(analysis.printTime / 3600)
      const minutes = Math.floor((analysis.printTime % 3600) / 60)
      analysis.estimatedTime = `${hours}h ${minutes}m`
    }

  } catch (error) {
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