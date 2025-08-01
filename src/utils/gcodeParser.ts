import JSZip from 'jszip'

export interface GcodeMetadata {
  printer_model?: string
  printer_brand?: string
  material_name?: string
  material_type?: string
  print_settings_id?: string
  print_settings_name?: string
  printer_settings_id?: string
  application?: string
  creation_date?: string
  designer_user_id?: string
  nozzle_diameter?: string
  is_automatic_profile?: string
  [key: string]: string | undefined
}

export interface ConcatenationCandidate {
  ordineIds: number[]
  gcodeIds: number[]
  stampanteId: number
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
    
    return metadata
    
  } catch (error) {
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
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(file)
    
    const fileNames = Object.keys(zipContent.files)
    
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
        foundFile = filename
        metadataContent = await metadataFile.async('string')
        break
      }
    }
    
    if (!metadataContent) {
      // Se non troviamo i file standard, cerchiamo qualsiasi file che potrebbe contenere metadati
      for (const fileName of fileNames) {
        if (fileName.toLowerCase().includes('metadata') || 
            fileName.toLowerCase().includes('config') ||
            fileName.toLowerCase().includes('settings') ||
            fileName.toLowerCase().includes('info') ||
            fileName.toLowerCase().includes('model')) {
          const file = zipContent.file(fileName)
          if (file) {
            try {
              const content = await file.async('string')
              
              // Prova a parsare come JSON
              try {
                const jsonContent = JSON.parse(content)
                foundFile = fileName
                metadataContent = content
                break
              } catch {
                // Non è JSON, potrebbe essere XML
                if (content.trim().startsWith('<?xml') || content.trim().startsWith('<model')) {
                  foundFile = fileName
                  metadataContent = content
                  break
                }
              }
            } catch (err) {
              // Ignora errori di lettura
            }
          }
        }
      }
    }
    
    if (!metadataContent) {
      // Restituisci un oggetto con informazioni di debug
      return {
        debug_files: fileNames.join(', '),
        error: 'Nessun file di metadati trovato nel file .gcode.3mf'
      }
    }
    
    // Prova a parsare come JSON
    try {
      const parsedMetadata = JSON.parse(metadataContent)
      return parsedMetadata
    } catch (parseError) {
      // Prova a parsare come XML
      if (metadataContent.trim().startsWith('<?xml') || metadataContent.trim().startsWith('<model')) {
        const xmlMetadata = parseXmlMetadata(metadataContent)
        
        // Cerca informazioni aggiuntive in altri file del ZIP
        const additionalInfo = await searchForProfileInfo(zipContent, fileNames)
        
        // Combina le informazioni
        return { ...xmlMetadata, ...additionalInfo }
      }
      
      // Se non è JSON o XML, restituiamo il contenuto grezzo
      return { 
        raw_metadata: metadataContent,
        source_file: foundFile || undefined,
        error: 'Metadati non in formato JSON o XML riconosciuto'
      }
    }
  } catch (error) {
    throw new Error(`Impossibile estrarre metadati dal file .gcode.3mf: ${error}`)
  }
}

/**
 * Cerca informazioni del profilo di stampa in altri file del ZIP
 */
async function searchForProfileInfo(zipContent: JSZip, fileNames: string[]): Promise<Partial<GcodeMetadata>> {
  const additionalInfo: Partial<GcodeMetadata> = {}
  
  // Cerca nei file specifici di Bambu Lab
  const bambuFiles = [
    'Metadata/project_settings.config',
    'Metadata/slice_info.config',
    'Metadata/model_settings.config',
    'Metadata/plate_1.json'
  ]
  
  for (const fileName of bambuFiles) {
    try {
      const file = zipContent.file(fileName)
      if (file) {
        const content = await file.async('string')
        
                 if (fileName.includes('project_settings.config')) {
           // Cerca informazioni del profilo nel file di configurazione principale
           const printProfileMatch = content.match(/"default_print_profile":\s*"([^"]+)"/)
           if (printProfileMatch) {
             additionalInfo.print_settings_name = printProfileMatch[1]
           }
           
           const filamentProfileMatch = content.match(/"default_filament_profile":\s*\[\s*"([^"]+)"\s*\]/)
           if (filamentProfileMatch) {
             additionalInfo.material_name = filamentProfileMatch[1]
           }
           
           // Cerca AUTO nel preset della stampante (printer_settings_id)
           const printerSettingsMatch = content.match(/"printer_settings_id":\s*"([^"]+)"/)
           if (printerSettingsMatch) {
             additionalInfo.printer_settings_id = printerSettingsMatch[1]
             
             // Verifica se il preset contiene AUTO
             if (printerSettingsMatch[1].toLowerCase().includes('auto')) {
               additionalInfo.is_automatic_profile = 'true'
             }
           }
         }
        
                 if (fileName.includes('slice_info.config')) {
           // Cerca informazioni sui materiali
           const filamentMatch = content.match(/<filament[^>]*type="([^"]+)"[^>]*>/)
           if (filamentMatch) {
             additionalInfo.material_type = filamentMatch[1]
             // Usa solo la tipologia del materiale, non il nome specifico
             additionalInfo.material_name = filamentMatch[1]
           }
           
           const printerModelMatch = content.match(/printer_model_id" value="([^"]+)"/)
           if (printerModelMatch) {
             additionalInfo.printer_model = printerModelMatch[1]
           }
         }
        
        if (fileName.includes('plate_1.json')) {
          // Cerca informazioni aggiuntive
          const nozzleMatch = content.match(/"nozzle_diameter":\s*([0-9.]+)/)
          if (nozzleMatch) {
            console.log('✅ Trovato diametro ugello:', nozzleMatch[1])
            additionalInfo.nozzle_diameter = nozzleMatch[1]
          }
        }
      }
    } catch (err) {
      console.log('❌ Errore analisi file:', fileName, err)
    }
  }
  
  // Se non troviamo nei file specifici, cerca in tutti i file
  if (!additionalInfo.print_settings_name) {
    for (const fileName of fileNames) {
      if (fileName.toLowerCase().includes('profile') ||
          fileName.toLowerCase().includes('config') ||
          fileName.toLowerCase().includes('settings') ||
          fileName.toLowerCase().includes('print') ||
          fileName.toLowerCase().includes('material') ||
          fileName.toLowerCase().includes('filament')) {
        try {
          const file = zipContent.file(fileName)
          if (file) {
            const content = await file.async('string')
            
            // Cerca pattern comuni per profili di stampa
            const autoMatch = content.match(/AUTO/gi)
            if (autoMatch) {
              additionalInfo.print_settings_name = 'AUTO'
            }
            
            // Cerca informazioni sui materiali
            const materialMatch = content.match(/material[:\s]+([^\n\r]+)/i)
            if (materialMatch) {
              additionalInfo.material_name = materialMatch[1].trim()
            }
            
            // Cerca informazioni sul profilo
            const profileMatch = content.match(/profile[:\s]+([^\n\r]+)/i)
            if (profileMatch) {
              additionalInfo.print_settings_name = profileMatch[1].trim()
            }
          }
        } catch (err) {
          // Ignora errori di analisi
        }
      }
    }
  }
  
  return additionalInfo
}

/**
 * Verifica se un file G-code è per una stampante Bambu Lab
 */
export function isBambuLabPrinter(metadata: GcodeMetadata): boolean {
  const printerBrand = metadata.printer_brand?.toLowerCase()
  const printerModel = metadata.printer_model?.toLowerCase()
  const application = metadata.application?.toLowerCase()
  
  return (
    printerBrand?.includes('bambu') ||
    printerBrand?.includes('bambulab') ||
    printerModel?.includes('bambu') ||
    printerModel?.includes('bambulab') ||
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
  // Prima controlla se è già stato identificato come automatico
  if (metadata.is_automatic_profile === 'true') {
    return true
  }
  
  // Controlla il preset della stampante (printer_settings_id)
  const printerSettingsId = metadata.printer_settings_id?.toLowerCase()
  const automaticProfile = automaticProfileName.toLowerCase()
  
  if (printerSettingsId && printerSettingsId.includes(automaticProfile)) {
    return true
  }
  
  // Fallback: controlla il profilo di stampa
  const printSettingsName = metadata.print_settings_name?.toLowerCase()
  
  return Boolean(printSettingsName && printSettingsName.includes(automaticProfile))
}

/**
 * Ottiene il nome del materiale dal metadata
 */
export function getMaterialName(metadata: GcodeMetadata): string {
  // Priorità: material_type (tipologia) > material_name > Unknown
  return metadata.material_type || metadata.material_name || 'Unknown'
}

/**
 * Ottiene il nome del profilo di stampa dal metadata
 */
export function getPrintSettingsName(metadata: GcodeMetadata): string {
  return metadata.print_settings_name || metadata.print_settings_id || 'Unknown'
} 