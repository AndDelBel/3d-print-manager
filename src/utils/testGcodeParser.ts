import { extractGcodeMetadata, isBambuLabPrinter, isAutomaticProfile, getMaterialName, getPrintSettingsName } from './gcodeParser'

/**
 * Test per analizzare il file esempio.gcode.3mf
 */
export async function testGcodeParser() {
  try {
    console.log('🔍 Analizzando file esempio.gcode.3mf...')
    
    // Leggi il file dalla root
    const response = await fetch('/esempio.gcode.3mf')
    if (!response.ok) {
      throw new Error(`Errore caricamento file: ${response.status}`)
    }
    
    const blob = await response.blob()
    const file = new File([blob], 'esempio.gcode.3mf', { type: 'application/octet-stream' })
    
    console.log('📁 File caricato, dimensione:', file.size, 'bytes')
    
    // Estrai metadati
    const metadata = await extractGcodeMetadata(file)
    console.log('📋 Metadati estratti:', metadata)
    
    // Verifica se è stampante Bambu Lab
    const isBambu = isBambuLabPrinter(metadata)
    console.log('🖨️ È stampante Bambu Lab?', isBambu)
    
    // Verifica profilo automatico
    const isAuto = isAutomaticProfile(metadata, 'AUTO')
    console.log('⚙️ È profilo automatico?', isAuto)
    
    // Ottieni informazioni
    const materialName = getMaterialName(metadata)
    const printSettingsName = getPrintSettingsName(metadata)
    
    console.log('🧪 Materiale:', materialName)
    console.log('⚙️ Impostazioni stampa:', printSettingsName)
    
    return {
      metadata,
      isBambuLab: isBambu,
      isAutomatic: isAuto,
      materialName,
      printSettingsName
    }
    
  } catch (error) {
    console.error('❌ Errore test parser:', error)
    throw error
  }
} 