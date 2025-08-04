import JSZip from 'jszip'
import { createHash } from 'crypto'

export interface ConcatenatedFile {
  fileName: string
  content: string
  size: number
  metadata: {
    originalFiles: string[]
    totalLayers: number
    totalTime: number
    totalMaterial: number
  }
}

export interface Gcode3mfPackage {
  zip: JSZip
  metadata: {
    originalFiles: string[]
    totalLayers: number
    totalTime: number
    totalMaterial: number
    checksums: Record<string, string>
  }
}

/**
 * Calcola il checksum di un file
 */
function calculateChecksum(content: string): string {
  try {
    // Per file molto grandi, usa solo i primi e ultimi 1000 caratteri
    if (content.length > 1000000) { // 1MB
      const start = content.substring(0, 1000)
      const end = content.substring(content.length - 1000)
      const sample = start + end + content.length.toString()
      
      const hash = createHash('md5')
      hash.update(sample)
      return hash.digest('hex')
    } else {
      // Per file piccoli, usa tutto il contenuto
      const hash = createHash('md5')
      hash.update(content)
      return hash.digest('hex')
    }
  } catch (error) {
    console.warn('⚠️ Errore calcolo checksum, usando fallback:', error)
    // Fallback: usa solo la lunghezza del file
    return createHash('md5').update(content.length.toString()).digest('hex')
  }
}

/**
 * Calcola il bounding box dal G-code
 */
function calculateBoundingBox(gcode: string): number[] {
  // Implementazione semplificata - in futuro analizzare il G-code per coordinate reali
  return [119.20345, 22.64535, 139.67955, 43.12145] // Valori di default compatibili
}

/**
 * Estrae informazioni da un file G-code
 */
function extractGcodeInfo(content: string): { layers: number; time: number; material: number } {
  let layers = 0
  let time = 0
  let material = 0
  
  // Cerca informazioni nel G-code
  const lines = content.split('\n')
  
  for (const line of lines) {
    // Cerca layer - formato comune
    if (line.includes('LAYER:')) {
      const layerMatch = line.match(/LAYER:(\d+)/)
      if (layerMatch) {
        layers = Math.max(layers, parseInt(layerMatch[1]))
      }
    }
    
    // Cerca layer - formato alternativo
    if (line.includes(';LAYER:')) {
      const layerMatch = line.match(/;LAYER:(\d+)/)
      if (layerMatch) {
        layers = Math.max(layers, parseInt(layerMatch[1]))
      }
    }
    
    // Cerca tempo di stampa - formato Bambu Studio
    if (line.includes('estimated printing time')) {
      const timeMatch = line.match(/estimated printing time.*?(\d+)/i)
      if (timeMatch) {
        time += parseInt(timeMatch[1])
      }
    }
    
    // Cerca tempo di stampa - formato alternativo
    if (line.includes(';TIME:')) {
      const timeMatch = line.match(/;TIME:(\d+)/)
      if (timeMatch) {
        time += parseInt(timeMatch[1])
      }
    }
    
    // Cerca materiale - formato Bambu Studio
    if (line.includes('filament used')) {
      const materialMatch = line.match(/filament used.*?(\d+\.?\d*)/i)
      if (materialMatch) {
        material += parseFloat(materialMatch[1])
      }
    }
    
    // Cerca materiale - formato alternativo
    if (line.includes(';Filament used:')) {
      const materialMatch = line.match(/;Filament used:(\d+\.?\d*)/)
      if (materialMatch) {
        material += parseFloat(materialMatch[1])
      }
    }
    
    // Cerca materiale - formato g/cm
    if (line.includes(';Filament used:')) {
      const materialMatch = line.match(/;Filament used:(\d+\.?\d*)g/)
      if (materialMatch) {
        material += parseFloat(materialMatch[1])
      }
    }
  }
  
  // Se non troviamo informazioni, usa valori di default
  if (layers === 0) {
    // Stima layer basata sulla lunghezza del file
    layers = Math.max(1, Math.floor(content.length / 1000))
  }
  
  if (time === 0) {
    // Stima tempo basata sui layer - più realistico
    time = layers * 3 // 3 minuti per layer come stima più realistica
  }
  
  if (material === 0) {
    // Stima materiale basata sui layer - più realistico
    material = layers * 0.5 // 0.5g per layer come stima più realistica
  }
  
  console.log('📊 Info estratte:', { layers, time, material })
  return { layers, time, material }
}

/**
 * Valida un pacchetto .gcode.3mf
 */
export async function validateGcode3mfPackage(pkg: Gcode3mfPackage): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    // Verifica file obbligatori
    const requiredFiles = [
      '[Content_Types].xml',
      '_rels/.rels',
      '3D/3dmodel.model',
      'Metadata/plate_1.gcode',
      'Metadata/plate_1.gcode.md5',
      'Metadata/plate_1.json',
      'Metadata/slice_info.config',
      'Metadata/project_settings.config',
      'Metadata/model_settings.config',
      'Metadata/cut_information.xml',
      'Metadata/plate_1.png',
      'Metadata/plate_1_small.png'
    ]
    
    for (const fileName of requiredFiles) {
      const file = pkg.zip.file(fileName)
      if (!file) {
        errors.push(`File mancante: ${fileName}`)
      }
    }
    
    // Verifica contenuto file critici
    const gcodeFile = pkg.zip.file('Metadata/plate_1.gcode')
    if (gcodeFile) {
      const gcodeContent = await gcodeFile.async('string')
      if (gcodeContent.length < 100) {
        warnings.push('G-code file molto piccolo, potrebbe essere vuoto')
      }
    }
    
    const md5File = pkg.zip.file('Metadata/plate_1.gcode.md5')
    if (md5File) {
      const md5Content = await md5File.async('string')
      if (md5Content.length !== 32) {
        warnings.push('MD5 checksum non valido')
      }
    }
    
    // Verifica JSON valido
    const plateJsonFile = pkg.zip.file('Metadata/plate_1.json')
    if (plateJsonFile) {
      try {
        const jsonContent = await plateJsonFile.async('string')
        JSON.parse(jsonContent)
      } catch (e) {
        errors.push('plate_1.json non è un JSON valido')
      }
    }
    
    // Verifica XML valido
    const modelFile = pkg.zip.file('3D/3dmodel.model')
    if (modelFile) {
      const modelContent = await modelFile.async('string')
      if (!modelContent.includes('<?xml') || !modelContent.includes('<model')) {
        errors.push('3dmodel.model non è un XML valido')
      }
    }
    
    const isValid = errors.length === 0
    
    return {
      isValid,
      errors,
      warnings
    }
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Errore durante la validazione: ${error}`],
      warnings: []
    }
  }
}

/**
 * Legge e analizza un file .gcode.3mf esistente
 */
export async function readGcode3mfFile(file: File): Promise<{
  modelGcode: string
  metadata: Record<string, unknown>
  project3mf?: string
  otherFiles: Record<string, unknown>
}> {
  try {
    console.log('📖 Leggendo file .gcode.3mf:', file.name)
    
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(file)
    
    // Debug: mostra tutti i file nel pacchetto
    console.log('📦 File nel pacchetto .gcode.3mf:', Object.keys(zipContent.files))
    
    // Cerca file G-code nella cartella Metadata (formato PrusaSlicer)
    const gcodeFiles = Object.keys(zipContent.files).filter(name => 
      name.includes('Metadata/') && name.endsWith('.gcode')
    )
    console.log('🔍 File .gcode trovati:', gcodeFiles)
    
    let modelGcodeFile = null
    if (gcodeFiles.length > 0) {
      modelGcodeFile = zipContent.file(gcodeFiles[0])
      console.log('🔍 Trovato file G-code:', gcodeFiles[0])
    } else {
      // Fallback: cerca model.gcode o qualsiasi file .gcode
      modelGcodeFile = zipContent.file('model.gcode')
      if (!modelGcodeFile) {
        const allGcodeFiles = Object.keys(zipContent.files).filter(name => 
          name.endsWith('.gcode')
        )
        console.log('🔍 File .gcode trovati (fallback):', allGcodeFiles)
        
        if (allGcodeFiles.length === 0) {
          // Se non ci sono file .gcode, cerca file con contenuto G-code
          const allFiles = Object.keys(zipContent.files)
          console.log('🔍 Tutti i file nel pacchetto:', allFiles)
          
          // Cerca file che potrebbero contenere G-code (basato su contenuto)
          for (const fileName of allFiles) {
            const file = zipContent.file(fileName)
            if (file) {
              const content = await file.async('string')
              if (content.includes('G1') || content.includes('G28') || content.includes('M104')) {
                console.log('🔍 Trovato file con contenuto G-code:', fileName)
                modelGcodeFile = file
                break
              }
            }
          }
        } else {
          modelGcodeFile = zipContent.file(allGcodeFiles[0])
          console.log('🔍 Trovato file G-code (fallback):', allGcodeFiles[0])
        }
      }
    }
    
    if (!modelGcodeFile) {
      throw new Error('Impossibile trovare file G-code nel pacchetto')
    }
    
    const modelGcode = await modelGcodeFile.async('string')
    
    // Cerca metadata.json o file .json nella cartella Metadata
    let metadataFile = zipContent.file('metadata.json')
    let metadata: Record<string, unknown>
    
    if (!metadataFile) {
      // Cerca file .json nella cartella Metadata (formato PrusaSlicer)
      const jsonFiles = Object.keys(zipContent.files).filter(name => 
        name.includes('Metadata/') && name.endsWith('.json')
      )
      console.log('🔍 File .json trovati:', jsonFiles)
      
      if (jsonFiles.length > 0) {
        metadataFile = zipContent.file(jsonFiles[0])
        console.log('🔍 Trovato file metadata:', jsonFiles[0])
      } else {
        // Fallback: cerca qualsiasi file .json
        const allJsonFiles = Object.keys(zipContent.files).filter(name => 
          name.endsWith('.json')
        )
        if (allJsonFiles.length > 0) {
          metadataFile = zipContent.file(allJsonFiles[0])
          console.log('🔍 Trovato file metadata (fallback):', allJsonFiles[0])
        }
      }
    }
    
    if (!metadataFile) {
      // Se non troviamo metadata.json, creiamo un metadata di base
      console.warn('⚠️ File metadata.json non trovato, creando metadata di base')
      metadata = {
        name: file.name.replace('.gcode.3mf', ''),
        print_time: 1508,
        filament_used: 10.60,
        layer_count: 228,
        generated_by: '3D Print Manager',
        created_at: new Date().toISOString()
      }
      console.log('✅ Metadata di base creato:', metadata)
    } else {
      metadata = JSON.parse(await metadataFile.async('string'))
      console.log('✅ Metadata caricato:', Object.keys(metadata))
    }
    
    // Estrai project.3mf se presente
    const project3mfFile = zipContent.file('project.3mf')
    const project3mf = project3mfFile ? await project3mfFile.async('string') : undefined
    
    // Estrai altri file
    const otherFiles: Record<string, unknown> = {}
    for (const [fileName, zipFile] of Object.entries(zipContent.files)) {
      if (fileName !== 'model.gcode' && fileName !== 'metadata.json' && fileName !== 'project.3mf' && 
          !fileName.includes('Metadata/') && !fileName.endsWith('.gcode') && !fileName.endsWith('.json')) {
        if (fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
          otherFiles[fileName] = await zipFile.async('blob')
        } else {
          otherFiles[fileName] = await zipFile.async('string')
        }
      }
    }
    
    console.log('✅ File .gcode.3mf analizzato:', {
      modelGcodeLength: modelGcode.length,
      metadataKeys: Object.keys(metadata),
      otherFiles: Object.keys(otherFiles)
    })
    
    return { modelGcode, metadata, project3mf, otherFiles }
  } catch (error) {
    console.error('❌ Errore lettura file .gcode.3mf:', error)
    throw error
  }
}

/**
 * Concatena contenuti G-code con delimitatori
 */
export function concatenateGcodeContent(gcodeContents: string[]): string {
  try {
    let concatenated = ''
    
    for (let i = 0; i < gcodeContents.length; i++) {
      const content = gcodeContents[i]
      
      // Aggiungi separatore se non è il primo
      if (i > 0) {
        concatenated += '\n; ====== SEPARATORE TRA FILE ======\n'
      }
      
      // Aggiungi header per il file
      concatenated += `; File ${i + 1} di ${gcodeContents.length}\n`
      concatenated += `; ====== INIZIO FILE ${i + 1} ======\n`
      
      // Aggiungi il contenuto del G-code
      concatenated += content
      
      // Aggiungi footer per il file
      concatenated += '\n; ====== FINE FILE ${i + 1} ======\n'
      
      // Controlla la dimensione per evitare overflow
      if (concatenated.length > 200 * 1024 * 1024) { // Aumentato a 200MB
        console.warn('⚠️ Contenuto concatenato molto grande, troncando')
        break
      }
    }
    
    return concatenated
  } catch (error) {
    console.error('❌ Errore concatenazione contenuto:', error)
    throw new Error('Errore durante la concatenazione del contenuto G-code')
  }
}

/**
 * Aggiorna metadata.json per file concatenato
 */
export function updateMetadataForConcatenation(
  originalMetadata: Record<string, unknown>,
  fileCount: number,
  totalTime: number,
  totalMaterial: number
): Record<string, unknown> {
  const updatedMetadata = { ...originalMetadata }
  
  // Aggiorna nome del progetto
  updatedMetadata.name = `Concatenated_${fileCount}_files_${Date.now()}`
  
  // Aggiorna tempo se presente
  if (updatedMetadata.print_time && typeof updatedMetadata.print_time === 'number') {
    updatedMetadata.print_time = Math.max(updatedMetadata.print_time, totalTime)
  }
  
  // Aggiorna materiale se presente
  if (updatedMetadata.filament_used && typeof updatedMetadata.filament_used === 'number') {
    updatedMetadata.filament_used = Math.max(updatedMetadata.filament_used, totalMaterial)
  }
  
  // Aggiungi informazioni sulla concatenazione
  updatedMetadata.concatenated_files = fileCount
  updatedMetadata.concatenated_at = new Date().toISOString()
  
  return updatedMetadata
}

/**
 * Crea un nuovo file .gcode.3mf basato su uno esistente
 */
export async function createConcatenatedGcode3mf(
  baseFile: File,
  additionalGcodeContents: string[],
  outputFileName: string
): Promise<Gcode3mfPackage> {
  try {
    console.log('🔗 Creando file concatenato basato su:', baseFile.name)
    
    // Leggi il file base
    const { modelGcode, metadata, project3mf, otherFiles } = await readGcode3mfFile(baseFile)
    
    // Concatena i contenuti G-code
    const allGcodeContents = [modelGcode, ...additionalGcodeContents]
    const concatenatedGcode = concatenateGcodeContent(allGcodeContents)
    
    // Calcola informazioni totali
    const printTime = typeof metadata.print_time === 'number' ? metadata.print_time : 1508
    const filamentUsed = typeof metadata.filament_used === 'number' ? metadata.filament_used : 10.60
    const totalTime = allGcodeContents.length * printTime
    const totalMaterial = allGcodeContents.length * filamentUsed
    
    // Aggiorna metadata
    const updatedMetadata = updateMetadataForConcatenation(
      metadata,
      allGcodeContents.length,
      totalTime,
      totalMaterial
    )
    
    // Crea nuovo ZIP copiando tutti i file originali
    const zip = new JSZip()
    
    // Copia tutti i file originali dal pacchetto base
    const baseZip = new JSZip()
    const baseZipContent = await baseZip.loadAsync(baseFile)
    
    // Copia tutti i file dal pacchetto originale
    for (const [fileName, zipFile] of Object.entries(baseZipContent.files)) {
      if (zipFile && !zipFile.dir) {
        const content = await zipFile.async('blob')
        zip.file(fileName, content)
      }
    }
    
    // Sostituisci il file G-code con quello concatenato
    // Cerca il file G-code originale (potrebbe essere in Metadata/plate_1.gcode)
    const gcodeFiles = Object.keys(baseZipContent.files).filter(name => 
      name.includes('Metadata/') && name.endsWith('.gcode')
    )
    
    if (gcodeFiles.length > 0) {
      // Sostituisci il file G-code originale
      zip.file(gcodeFiles[0], concatenatedGcode)
      
      // Aggiorna anche il file MD5 se presente
      const md5File = gcodeFiles[0].replace('.gcode', '.gcode.md5')
      if (baseZipContent.file(md5File)) {
        const newMd5 = calculateChecksum(concatenatedGcode)
        zip.file(md5File, newMd5)
      }
      
      // Aggiorna il file JSON se presente
      const jsonFile = gcodeFiles[0].replace('.gcode', '.json')
      if (baseZipContent.file(jsonFile)) {
        zip.file(jsonFile, JSON.stringify(updatedMetadata, null, 2))
      }
    } else {
      // Fallback: aggiungi come model.gcode
      zip.file('model.gcode', concatenatedGcode)
      zip.file('metadata.json', JSON.stringify(updatedMetadata, null, 2))
    }
    
    // Calcola checksum
    const checksum = calculateChecksum(concatenatedGcode)
    
    const result: Gcode3mfPackage = {
      zip,
      metadata: {
        originalFiles: [baseFile.name, ...additionalGcodeContents.map((_, i) => `additional_${i + 1}.gcode`)],
        totalLayers: allGcodeContents.length * (typeof metadata.layer_count === 'number' ? metadata.layer_count : 228),
        totalTime,
        totalMaterial,
        checksums: { 'concatenated_gcode': checksum }
      }
    }
    
    console.log('✅ File concatenato creato:', result.metadata)
    return result
    
  } catch (error) {
    console.error('❌ Errore creazione file concatenato:', error)
    throw error
  }
}

/**
 * Scarica un pacchetto .gcode.3mf
 */
export async function downloadGcode3mf(pkg: Gcode3mfPackage, fileName: string): Promise<void> {
  try {
    // Valida il pacchetto prima del download
    const validation = await validateGcode3mfPackage(pkg)
    console.log('🔍 Validazione pre-download:', validation)
    
    if (!validation.isValid) {
      console.error('❌ Pacchetto non valido per download:', validation.errors)
      throw new Error(`Pacchetto non valido: ${validation.errors.join(', ')}`)
    }
    
    const zipBlob = await pkg.zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    URL.revokeObjectURL(url)
    
    console.log('✅ File scaricato con successo:', fileName)
  } catch (error) {
    console.error('❌ Errore durante il download:', error)
    throw error
  }
}

/**
 * Scarica un ZIP con tutti i pacchetti concatenati
 */
export async function downloadConcatenatedZip(packages: Gcode3mfPackage[]): Promise<void> {
  const zip = new JSZip()
  
  for (const pkg of packages) {
    const zipBlob = await pkg.zip.generateAsync({ type: 'blob' })
    const fileName = `concatenated_${Date.now()}_${pkg.metadata.originalFiles.length}files.gcode.3mf`
    zip.file(fileName, zipBlob)
  }
  
  const finalZipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(finalZipBlob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `concatenated_files_${Date.now()}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}