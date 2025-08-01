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
    
    // Recupera i file G-code originali
    const gcodeFiles: Array<{ name: string; content: string }> = []
    
    for (const gcodeId of candidate.gcodeIds) {
      try {
        // Recupera il file G-code da Supabase Storage
        const { data: gcodeData, error: gcodeError } = await supabase.storage
          .from('gcode')
          .download(`gcode_${gcodeId}.gcode`)
        
        if (gcodeError) {
          console.warn('⚠️ File G-code non trovato:', gcodeId)
          // Crea un file placeholder per test
          gcodeFiles.push({
            name: `gcode_${gcodeId}.gcode`,
            content: `; Placeholder G-code file ${gcodeId}\n; Generated for testing\nG28\nG1 Z10 F300\n`
          })
        } else {
          const content = await gcodeData.text()
          gcodeFiles.push({
            name: `gcode_${gcodeId}.gcode`,
            content
          })
        }
      } catch (err) {
        console.error('❌ Errore recupero file G-code:', gcodeId, err)
        // Crea un file placeholder per test
        gcodeFiles.push({
          name: `gcode_${gcodeId}.gcode`,
          content: `; Placeholder G-code file ${gcodeId}\n; Generated for testing\nG28\nG1 Z10 F300\n`
        })
      }
    }
    
    // Recupera i file .gcode.3mf reali associati agli ordini
    console.log('🔍 Recuperando file .gcode.3mf reali...')
    
    try {
      // Recupera i file .gcode.3mf dai percorsi degli ordini
      const gcode3mfFiles: File[] = []
      
      // Prima recupera i dati dei G-code per ottenere i percorsi completi
      const { data: gcodeData, error: gcodeError } = await supabase
        .from('gcode')
        .select('id, nome_file, file_origine_id')
        .in('id', candidate.gcodeIds)
      
      if (gcodeError) {
        throw new Error(`Errore recupero dati G-code: ${gcodeError.message}`)
      }
      
      if (!gcodeData || gcodeData.length === 0) {
        throw new Error('Nessun dato G-code trovato')
      }
      
      console.log('📄 Dati G-code trovati:', gcodeData)
      
      // Recupera anche i dati dei file_origine per costruire i percorsi completi
      const fileOrigineIds = gcodeData.map(g => g.file_origine_id)
      const { data: fileOrigineData, error: fileOrigineError } = await supabase
        .from('file_origine')
        .select('id, nome_file, commessa_id')
        .in('id', fileOrigineIds)
      
      if (fileOrigineError) {
        throw new Error(`Errore recupero dati file_origine: ${fileOrigineError.message}`)
      }
      
      // Recupera i dati delle commesse per ottenere il nome dell'organizzazione
      const commessaIds = fileOrigineData?.map(f => f.commessa_id) || []
      const { data: commessaData, error: commessaError } = await supabase
        .from('commessa')
        .select('id, nome, organizzazione_id')
        .in('id', commessaIds)
      
      if (commessaError) {
        throw new Error(`Errore recupero dati commesse: ${commessaError.message}`)
      }
      
      // Recupera i dati delle organizzazioni
      const organizzazioneIds = commessaData?.map(c => c.organizzazione_id) || []
      const { data: organizzazioneData, error: organizzazioneError } = await supabase
        .from('organizzazione')
        .select('id, nome')
        .in('id', organizzazioneIds)
      
      if (organizzazioneError) {
        throw new Error(`Errore recupero dati organizzazioni: ${organizzazioneError.message}`)
      }
      
      // Ora costruisci i percorsi completi e recupera i file
      for (const gcode of gcodeData) {
        try {
          const fileOrigine = fileOrigineData?.find(f => f.id === gcode.file_origine_id)
          if (!fileOrigine) {
            throw new Error(`File_origine non trovato per gcode_id: ${gcode.id}`)
          }
          
          const commessa = commessaData?.find(c => c.id === fileOrigine.commessa_id)
          if (!commessa) {
            throw new Error(`Commessa non trovata per file_origine_id: ${fileOrigine.id}`)
          }
          
          const organizzazione = organizzazioneData?.find(o => o.id === commessa.organizzazione_id)
          if (!organizzazione) {
            throw new Error(`Organizzazione non trovata per commessa_id: ${commessa.id}`)
          }
          
          // Usa direttamente il nome_file del G-code che contiene già il percorso completo
          const percorsoCompleto = gcode.nome_file
          
          console.log('🔍 Cercando file:', percorsoCompleto)
          
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
          gcode3mfFiles.push(gcode3mfFile)
          
          console.log('✅ File .gcode.3mf recuperato:', percorsoCompleto)
        } catch (err) {
          console.error('❌ Errore recupero file .gcode.3mf:', gcode.id, err)
          throw new Error(`Impossibile recuperare file .gcode.3mf per gcode_id: ${gcode.id}`)
        }
      }
      
      if (gcode3mfFiles.length === 0) {
        throw new Error('Nessun file .gcode.3mf trovato per la concatenazione')
      }
      
      // Usa il primo file come base e gli altri come aggiuntivi
      const baseFile = gcode3mfFiles[0]
      const additionalFiles = gcode3mfFiles.slice(1)
      
      // Estrai contenuti G-code dai file aggiuntivi
      const additionalContents: string[] = []
      
      for (const file of additionalFiles) {
        try {
          const { modelGcode } = await readGcode3mfFile(file)
          additionalContents.push(modelGcode)
          console.log('✅ G-code estratto da:', file.name)
        } catch (err) {
          console.error('❌ Errore estrazione G-code da:', file.name, err)
          throw new Error(`Impossibile estrarre G-code da ${file.name}`)
        }
      }
      
      console.log('✅ File base e aggiuntivi pronti, creando concatenazione...')
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