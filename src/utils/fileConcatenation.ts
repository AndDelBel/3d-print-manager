import JSZip from 'jszip'

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

/**
 * Concatena più file G-code in un unico file
 */
export async function concatenateGcodeFiles(
  files: Array<{ name: string; content: string }>,
  outputFileName: string
): Promise<ConcatenatedFile> {
  try {
    console.log('🔗 Iniziando concatenazione di', files.length, 'file...')
    
    let concatenatedContent = ''
    let totalLayers = 0
    let totalTime = 0
    let totalMaterial = 0
    const originalFiles: string[] = []
    
    for (const file of files) {
      console.log('📄 Processando file:', file.name)
      originalFiles.push(file.name)
      
      // Aggiungi separatore tra i file
      if (concatenatedContent) {
        concatenatedContent += '\n; ====== SEPARATORE TRA FILE ======\n'
      }
      
      // Aggiungi header per il file
      concatenatedContent += `; File: ${file.name}\n`
      concatenatedContent += `; ====== INIZIO FILE ======\n`
      
      // Aggiungi il contenuto del file
      concatenatedContent += file.content
      
      // Estrai informazioni dal file (se disponibili)
      const fileInfo = extractGcodeInfo(file.content)
      totalLayers += fileInfo.layers
      totalTime += fileInfo.time
      totalMaterial += fileInfo.material
      
      concatenatedContent += '\n; ====== FINE FILE ======\n'
    }
    
    // Aggiungi header finale
    const finalHeader = `; ====== FILE CONCATENATO ======\n`
      + `; Generato automaticamente il: ${new Date().toISOString()}\n`
      + `; File originali: ${originalFiles.join(', ')}\n`
      + `; Totale layer: ${totalLayers}\n`
      + `; Tempo stimato: ${totalTime} minuti\n`
      + `; Materiale stimato: ${totalMaterial}g\n`
      + `; ====== INIZIO CONTENUTO ======\n\n`
    
    concatenatedContent = finalHeader + concatenatedContent
    
    const result: ConcatenatedFile = {
      fileName: outputFileName,
      content: concatenatedContent,
      size: concatenatedContent.length,
      metadata: {
        originalFiles,
        totalLayers,
        totalTime,
        totalMaterial
      }
    }
    
    console.log('✅ Concatenazione completata:', result.metadata)
    return result
    
  } catch (error) {
    console.error('❌ Errore concatenazione:', error)
    throw new Error(`Errore durante la concatenazione: ${error}`)
  }
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
    // Cerca layer
    if (line.includes('LAYER:')) {
      const layerMatch = line.match(/LAYER:(\d+)/)
      if (layerMatch) {
        layers = Math.max(layers, parseInt(layerMatch[1]))
      }
    }
    
    // Cerca tempo di stampa
    if (line.includes('estimated printing time')) {
      const timeMatch = line.match(/estimated printing time.*?(\d+)/i)
      if (timeMatch) {
        time += parseInt(timeMatch[1])
      }
    }
    
    // Cerca materiale
    if (line.includes('filament used')) {
      const materialMatch = line.match(/filament used.*?(\d+\.?\d*)/i)
      if (materialMatch) {
        material += parseFloat(materialMatch[1])
      }
    }
  }
  
  return { layers, time, material }
}

/**
 * Crea un file ZIP con i file concatenati
 */
export async function createConcatenatedZip(
  concatenatedFiles: ConcatenatedFile[]
): Promise<Blob> {
  const zip = new JSZip()
  
  for (const file of concatenatedFiles) {
    zip.file(file.fileName, file.content)
    
    // Aggiungi file di metadati
    const metadata = {
      fileName: file.fileName,
      originalFiles: file.metadata.originalFiles,
      totalLayers: file.metadata.totalLayers,
      totalTime: file.metadata.totalTime,
      totalMaterial: file.metadata.totalMaterial,
      generatedAt: new Date().toISOString()
    }
    
    zip.file(`${file.fileName}.json`, JSON.stringify(metadata, null, 2))
  }
  
  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Scarica un file concatenato
 */
export function downloadConcatenatedFile(file: ConcatenatedFile): void {
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = file.fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

/**
 * Scarica un ZIP con tutti i file concatenati
 */
export async function downloadConcatenatedZip(files: ConcatenatedFile[]): Promise<void> {
  const zipBlob = await createConcatenatedZip(files)
  const url = URL.createObjectURL(zipBlob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `concatenated_files_${Date.now()}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
} 