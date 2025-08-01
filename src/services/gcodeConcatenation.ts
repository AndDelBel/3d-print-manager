import { supabase } from '@/lib/supabaseClient'
import { listCodaStampaWithRelations } from './codaStampa'
import { listGcode } from './gcode'
import type { CodaStampaWithRelations } from '@/types/codaStampa'
import type { Gcode } from '@/types/gcode'
import type { ConcatenationCandidate } from '@/utils/gcodeParser'
import { createConcatenatedGcode3mf, downloadGcode3mf, downloadConcatenatedZip, validateGcode3mfPackage, readGcode3mfFile, type Gcode3mfPackage } from '@/utils/gcodeConcatenation'

export interface ConcatenationProposal {
  id: string
  type: 'same_gcode' | 'same_material'
  candidates: ConcatenationCandidate[]
  description: string
  estimatedTime: number
  estimatedMaterial: number
  concatenatedPackage?: Gcode3mfPackage
}

/**
 * Trova candidati per la concatenazione nella coda di stampa
 */
export async function findConcatenationCandidates(
  automaticProfileName: string
): Promise<ConcatenationProposal[]> {
  try {
    console.log('🔍 Cercando opportunità di concatenazione...')
    
    // Carica la coda di stampa con tutte le relazioni
    const codaItems = await listCodaStampaWithRelations({ isSuperuser: true })
    console.log('📋 Elementi in coda:', codaItems.length)
    
    // Debug: mostra tutti gli elementi
    for (const item of codaItems) {
      console.log('📄 Item:', {
        id: item.id,
        ordine_id: item.ordine_id,
        stampante_id: item.stampante_id,
        gcode_id: item.ordine?.gcode_id,
        quantita: item.ordine?.quantita,
        materiale: item.gcode?.materiale,
        nome_file: item.gcode?.nome_file,
        stampante_nome: item.stampante?.nome
      })
    }
    
    // Raggruppa per stampante
    const groupedByPrinter = new Map<number, CodaStampaWithRelations[]>()
    
    for (const item of codaItems) {
      if (!item.stampante) {
        console.log('⚠️ Item senza stampante:', item.id)
        continue
      }
      
      const printerId = item.stampante.id
      if (!groupedByPrinter.has(printerId)) {
        groupedByPrinter.set(printerId, [])
      }
      groupedByPrinter.get(printerId)!.push(item)
    }
    
    console.log('🖨️ Stampanti trovate:', groupedByPrinter.size)
    for (const [printerId, items] of groupedByPrinter) {
      console.log(`  Stampante ${printerId}: ${items.length} elementi`)
    }
    
    const proposals: ConcatenationProposal[] = []
    
    // Analizza ogni stampante
    for (const [printerId, items] of groupedByPrinter) {
      if (items.length < 2) {
        console.log(`⚠️ Stampante ${printerId}: solo ${items.length} elementi, serve almeno 2`)
        continue
      }
      
      console.log(`🔍 Analizzando stampante ${printerId} con ${items.length} elementi`)
      
      // Raggruppa per G-code (stesso elemento)
      const sameGcodeGroups = new Map<number, CodaStampaWithRelations[]>()
      
      for (const item of items) {
        if (!item.ordine?.gcode_id) {
          console.log('⚠️ Item senza gcode_id:', item.id)
          continue
        }
        
        const gcodeId = item.ordine.gcode_id
        if (!sameGcodeGroups.has(gcodeId)) {
          sameGcodeGroups.set(gcodeId, [])
        }
        sameGcodeGroups.get(gcodeId)!.push(item)
      }
      
      console.log(`📊 G-code unici trovati: ${sameGcodeGroups.size}`)
      
      // Proponi concatenazione per stesso G-code
      for (const [gcodeId, gcodeItems] of sameGcodeGroups) {
        console.log(`📄 G-code ${gcodeId}: ${gcodeItems.length} elementi`)
        
        if (gcodeItems.length > 1) {
          const totalQuantity = gcodeItems.reduce((sum, item) => sum + (item.ordine?.quantita || 0), 0)
          console.log(`📦 Quantità totale: ${totalQuantity}`)
          
          if (totalQuantity > 1) {
            console.log(`✅ Trovata opportunità same_gcode per gcode ${gcodeId}`)
            
            const candidate: ConcatenationCandidate = {
              ordineIds: gcodeItems.map(item => item.ordine?.id || 0).filter(id => id > 0),
              gcodeIds: [gcodeId],
              stampanteId: printerId,
              materialName: 'Same Material', // Verrà determinato dai metadati
              printSettingsName: 'Automatic Profile', // Verrà determinato dai metadati
              totalQuantity,
              isSameGcode: true
            }
            
            proposals.push({
              id: `same_gcode_${gcodeId}_${printerId}`,
              type: 'same_gcode',
              candidates: [candidate],
              description: `${totalQuantity}x ${gcodeItems[0].gcode?.nome_file || 'Unknown'} - ${gcodeItems[0].stampante?.nome || 'Unknown Printer'}`,
              estimatedTime: 0, // Calcolato dai metadati
              estimatedMaterial: 0 // Calcolato dai metadati
            })
          } else {
            console.log(`❌ Quantità totale ${totalQuantity} <= 1, non sufficiente`)
          }
        } else {
          console.log(`❌ Solo ${gcodeItems.length} elemento per gcode ${gcodeId}`)
        }
      }
      
      // Raggruppa per materiale e profilo (oggetti distinti)
      const materialGroups = new Map<string, CodaStampaWithRelations[]>()
      
      for (const item of items) {
        if (!item.gcode) {
          console.log('⚠️ Item senza gcode:', item.id)
          continue
        }
        
        // Usa solo la tipologia del materiale per il raggruppamento
        const materialType = item.gcode.materiale || 'Unknown'
        const materialKey = `${materialType}_${item.gcode.nome_file}`
        
        if (!materialGroups.has(materialKey)) {
          materialGroups.set(materialKey, [])
        }
        materialGroups.get(materialKey)!.push(item)
      }
      
      console.log(`📊 Materiali unici trovati: ${materialGroups.size}`)
      
      // Proponi concatenazione per stesso materiale
      for (const [materialKey, materialItems] of materialGroups) {
        console.log(`🧪 Materiale ${materialKey}: ${materialItems.length} elementi`)
        
        if (materialItems.length > 1) {
          console.log(`✅ Trovata opportunità same_material per ${materialKey}`)
          
          const candidate: ConcatenationCandidate = {
            ordineIds: materialItems.map(item => item.ordine?.id || 0).filter(id => id > 0),
            gcodeIds: [...new Set(materialItems.map(item => item.ordine?.gcode_id || 0).filter(id => id > 0))],
            stampanteId: printerId,
            materialName: materialKey.split('_')[0],
            printSettingsName: automaticProfileName,
            totalQuantity: materialItems.reduce((sum, item) => sum + (item.ordine?.quantita || 0), 0),
            isSameGcode: false
          }
          
          proposals.push({
            id: `same_material_${materialKey}_${printerId}`,
            type: 'same_material',
            candidates: [candidate],
            description: `${materialItems.length} different objects - ${materialKey.split('_')[0]} - ${materialItems[0].stampante?.nome || 'Unknown Printer'}`,
            estimatedTime: 0, // Calcolato dai metadati
            estimatedMaterial: 0 // Calcolato dai metadati
          })
        } else {
          console.log(`❌ Solo ${materialItems.length} elemento per materiale ${materialKey}`)
        }
      }
      
      // NUOVO: Proponi concatenazione per G-code diversi ma stessa stampante
      if (items.length >= 2) {
        console.log(`🔍 Analizzando G-code diversi per stampante ${printerId}`)
        
        // Raggruppa tutti i G-code per questa stampante
        const allGcodeIds = [...new Set(items.map(item => item.ordine?.gcode_id).filter((id): id is number => id !== undefined && id > 0))]
        const totalQuantity = items.reduce((sum, item) => sum + (item.ordine?.quantita || 0), 0)
        
        if (allGcodeIds.length >= 2 && totalQuantity >= 2) {
          console.log(`✅ Trovata opportunità mixed_gcode per stampante ${printerId}`)
          
          const candidate: ConcatenationCandidate = {
            ordineIds: items.map(item => item.ordine?.id || 0).filter(id => id > 0),
            gcodeIds: allGcodeIds,
            stampanteId: printerId,
            materialName: 'Mixed Materials',
            printSettingsName: automaticProfileName,
            totalQuantity,
            isSameGcode: false
          }
          
          proposals.push({
            id: `mixed_gcode_${printerId}`,
            type: 'same_material',
            candidates: [candidate],
            description: `${allGcodeIds.length} different G-codes - ${items[0].stampante?.nome || 'Unknown Printer'} - Total: ${totalQuantity}`,
            estimatedTime: 0,
            estimatedMaterial: 0
          })
        } else {
          console.log(`❌ Non sufficiente per mixed_gcode: ${allGcodeIds.length} G-code, ${totalQuantity} quantità`)
        }
      }
    }
    
    console.log(`🎯 Proposte trovate: ${proposals.length}`)
    return proposals
  } catch (error) {
    console.error('❌ Errore ricerca candidati concatenazione:', error)
    throw error
  }
}

/**
 * Esegue la concatenazione dei file G-code
 */
export async function executeConcatenation(
  candidate: ConcatenationCandidate,
  outputFileName: string
): Promise<Gcode3mfPackage> {
  try {
    console.log('🔗 Eseguendo concatenazione per:', candidate)
    console.log('📁 File di output:', outputFileName)
    
    // Recupera i dati degli ordini per ottenere le quantità
    const { data: ordiniData, error: ordiniError } = await supabase
      .from('ordine')
      .select('id, gcode_id, quantita')
      .in('id', candidate.ordineIds)
    
    if (ordiniError) {
      throw new Error(`Errore recupero dati ordini: ${ordiniError.message}`)
    }
    
    if (!ordiniData || ordiniData.length === 0) {
      throw new Error('Nessun dato ordine trovato')
    }
    
    console.log('📄 Dati ordini trovati:', ordiniData)
    
    // Crea una mappa delle quantità per ogni G-code
    const gcodeQuantities = new Map<number, number>()
    for (const ordine of ordiniData) {
      const currentQuantity = gcodeQuantities.get(ordine.gcode_id) || 0
      gcodeQuantities.set(ordine.gcode_id, currentQuantity + ordine.quantita)
    }
    
    console.log('📦 Quantità per G-code:', Object.fromEntries(gcodeQuantities))
    
    // Recupera i file .gcode.3mf reali associati agli ordini
    console.log('🔍 Recuperando file .gcode.3mf reali...')
    
    try {
      // Recupera i dati dei G-code per ottenere i percorsi completi
      const { data: gcodeData, error: gcodeError } = await supabase
        .from('gcode')
        .select('id, nome_file')
        .in('id', candidate.gcodeIds)
      
      if (gcodeError) {
        throw new Error(`Errore recupero dati G-code: ${gcodeError.message}`)
      }
      
      if (!gcodeData || gcodeData.length === 0) {
        throw new Error('Nessun dato G-code trovato')
      }
      
      console.log('📄 Dati G-code trovati:', gcodeData)
      
      // Recupera i file .gcode.3mf e crea le liste di contenuti replicati
      const allGcodeContents: string[] = []
      let baseFile: File | null = null
      
      for (const gcode of gcodeData) {
        try {
          const percorsoCompleto = gcode.nome_file
          const quantity = gcodeQuantities.get(gcode.id) || 1
          
          console.log(`🔍 Cercando file: ${percorsoCompleto} (quantità: ${quantity})`)
          
          // Recupera il file .gcode.3mf da Supabase Storage
          const { data: gcode3mfData, error: gcode3mfError } = await supabase.storage
            .from('files')
            .download(percorsoCompleto)
          
          if (gcode3mfError) {
            console.warn('⚠️ File .gcode.3mf non trovato:', percorsoCompleto)
            throw new Error(`File .gcode.3mf non trovato: ${percorsoCompleto}`)
          }
          
          // Converti blob in File
          const gcode3mfFile = new File([gcode3mfData], gcode.nome_file, { 
            type: 'application/octet-stream' 
          })
          
          // Estrai il contenuto G-code
          const { modelGcode } = await readGcode3mfFile(gcode3mfFile)
          
          // Replica il contenuto in base alla quantità
          for (let i = 0; i < quantity; i++) {
            allGcodeContents.push(modelGcode)
          }
          
          // Usa il primo file come base per il pacchetto
          if (!baseFile) {
            baseFile = gcode3mfFile
          }
          
          console.log(`✅ G-code estratto e replicato ${quantity} volte da: ${percorsoCompleto}`)
        } catch (err) {
          console.error('❌ Errore recupero file .gcode.3mf:', gcode.id, err)
          throw new Error(`Impossibile recuperare file .gcode.3mf per gcode_id: ${gcode.id}`)
        }
      }
      
      if (allGcodeContents.length === 0) {
        throw new Error('Nessun contenuto G-code trovato per la concatenazione')
      }
      
      if (!baseFile) {
        throw new Error('Nessun file base trovato per la concatenazione')
      }
      
      console.log(`📊 Totale contenuti G-code da concatenare: ${allGcodeContents.length}`)
      
      // Usa il primo contenuto come base e gli altri come aggiuntivi
      const baseContent = allGcodeContents[0]
      const additionalContents = allGcodeContents.slice(1)
      
      console.log('✅ Contenuti pronti, creando concatenazione...')
      const concatenatedPackage = await createConcatenatedGcode3mf(baseFile, additionalContents, outputFileName)
      
      // Valida il pacchetto creato
      const validation = await validateGcode3mfPackage(concatenatedPackage)
      console.log('🔍 Validazione pacchetto:', validation)
      
      if (!validation.isValid) {
        console.error('❌ Pacchetto non valido:', validation.errors)
        throw new Error(`Pacchetto .gcode.3mf non valido: ${validation.errors.join(', ')}`)
      }
      
      console.log('✅ Concatenazione completata:', concatenatedPackage.metadata)
      return concatenatedPackage
    } catch (error) {
      console.error('❌ Errore recupero file reali:', error)
      throw new Error(`Impossibile recuperare i file .gcode.3mf reali: ${error}`)
    }
    
  } catch (error) {
    console.error('❌ Errore concatenazione G-code:', error)
    throw error
  }
}

/**
 * Aggiorna la coda di stampa con il file concatenato
 */
export async function updateQueueWithConcatenatedFile(
  candidate: ConcatenationCandidate,
  concatenatedFilePath: string
): Promise<void> {
  try {
    // TODO: Implementare l'aggiornamento della coda
    // 1. Rimuovere gli ordini originali dalla coda
    // 2. Aggiungere il nuovo ordine concatenato
    // 3. Aggiornare gli stati
    
    console.log('Aggiornamento coda con file concatenato:', concatenatedFilePath)
  } catch (error) {
    console.error('Errore aggiornamento coda:', error)
    throw error
  }
} 