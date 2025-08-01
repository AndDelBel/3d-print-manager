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
  // Per ora usa un hash semplice, in futuro implementare CRC32
  const hash = createHash('md5')
  hash.update(content)
  return hash.digest('hex')
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
    
    // Estrai model.gcode o qualsiasi file .gcode
    let modelGcodeFile = zipContent.file('model.gcode')
    if (!modelGcodeFile) {
      // Cerca qualsiasi file .gcode
      const gcodeFiles = Object.keys(zipContent.files).filter(name => 
        name.endsWith('.gcode') && !name.includes('/')
      )
      if (gcodeFiles.length === 0) {
        throw new Error('Nessun file .gcode trovato nel pacchetto')
      }
      modelGcodeFile = zipContent.file(gcodeFiles[0])
      console.log('🔍 Trovato file G-code:', gcodeFiles[0])
    }
    
    if (!modelGcodeFile) {
      throw new Error('Impossibile trovare file G-code nel pacchetto')
    }
    
    const modelGcode = await modelGcodeFile.async('string')
    
    // Estrai metadata.json
    const metadataFile = zipContent.file('metadata.json')
    if (!metadataFile) {
      throw new Error('File metadata.json non trovato')
    }
    const metadata = JSON.parse(await metadataFile.async('string'))
    
    // Estrai project.3mf se presente
    const project3mfFile = zipContent.file('project.3mf')
    const project3mf = project3mfFile ? await project3mfFile.async('string') : undefined
    
    // Estrai altri file
    const otherFiles: Record<string, any> = {}
    for (const [fileName, zipFile] of Object.entries(zipContent.files)) {
      if (fileName !== 'model.gcode' && fileName !== 'metadata.json' && fileName !== 'project.3mf') {
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
  }
  
  return concatenated
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
  if (updatedMetadata.print_time) {
    updatedMetadata.print_time = Math.max(updatedMetadata.print_time, totalTime)
  }
  
  // Aggiorna materiale se presente
  if (updatedMetadata.filament_used) {
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
    const totalTime = allGcodeContents.length * (metadata.print_time || 1508)
    const totalMaterial = allGcodeContents.length * (metadata.filament_used || 10.60)
    
    // Aggiorna metadata
    const updatedMetadata = updateMetadataForConcatenation(
      metadata,
      allGcodeContents.length,
      totalTime,
      totalMaterial
    )
    
    // Crea nuovo ZIP
    const zip = new JSZip()
    
    // Aggiungi model.gcode concatenato
    zip.file('model.gcode', concatenatedGcode)
    
    // Aggiungi metadata.json aggiornato
    zip.file('metadata.json', JSON.stringify(updatedMetadata, null, 2))
    
    // Aggiungi project.3mf se presente
    if (project3mf) {
      zip.file('project.3mf', project3mf)
    }
    
    // Aggiungi altri file
    for (const [fileName, content] of Object.entries(otherFiles)) {
      zip.file(fileName, content)
    }
    
    // Calcola checksum
    const checksum = calculateChecksum(concatenatedGcode)
    
    const result: Gcode3mfPackage = {
      zip,
      metadata: {
        originalFiles: [baseFile.name, ...additionalGcodeContents.map((_, i) => `additional_${i + 1}.gcode`)],
        totalLayers: allGcodeContents.length * (metadata.layer_count || 228),
        totalTime,
        totalMaterial,
        checksums: { 'model.gcode': checksum }
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