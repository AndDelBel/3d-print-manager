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
    // Carica la coda di stampa con tutte le relazioni
    const codaItems = await listCodaStampaWithRelations({ isSuperuser: true })
    
    // Raggruppa per stampante
    const groupedByPrinter = new Map<number, CodaStampaWithRelations[]>()
    
    for (const item of codaItems) {
      if (!item.stampante) {
        continue
      }
      
      const printerId = item.stampante.id
      if (!groupedByPrinter.has(printerId)) {
        groupedByPrinter.set(printerId, [])
      }
      groupedByPrinter.get(printerId)!.push(item)
    }
    
    const proposals: ConcatenationProposal[] = []
    
    // Analizza ogni stampante
    for (const [printerId, items] of groupedByPrinter) {
      if (items.length < 2) {
        continue
      }
      
      // Raggruppa per G-code (stesso elemento)
      const sameGcodeGroups = new Map<number, CodaStampaWithRelations[]>()
      
      for (const item of items) {
        if (!item.ordine?.gcode_id) {
          continue
        }
        
        const gcodeId = item.ordine.gcode_id
        if (!sameGcodeGroups.has(gcodeId)) {
          sameGcodeGroups.set(gcodeId, [])
        }
        sameGcodeGroups.get(gcodeId)!.push(item)
      }
      
      // Proponi concatenazione per stesso G-code
      for (const [gcodeId, gcodeItems] of sameGcodeGroups) {
        if (gcodeItems.length > 1) {
          const totalQuantity = gcodeItems.reduce((sum, item) => sum + (item.ordine?.quantita || 0), 0)
          
          if (totalQuantity > 1) {
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
          }
        }
      }
      
      // Raggruppa per materiale e profilo (oggetti distinti)
      const materialGroups = new Map<string, CodaStampaWithRelations[]>()
      
      for (const item of items) {
        if (!item.gcode) {
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
      
      // Proponi concatenazione per stesso materiale
      for (const [materialKey, materialItems] of materialGroups) {
        if (materialItems.length > 1) {
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
        }
      }
      
      // NUOVO: Proponi concatenazione per G-code diversi ma stessa stampante
      if (items.length >= 2) {
        // Raggruppa tutti i G-code per questa stampante
        const allGcodeIds = [...new Set(items.map(item => item.ordine?.gcode_id).filter((id): id is number => id !== undefined && id > 0))]
        const totalQuantity = items.reduce((sum, item) => sum + (item.ordine?.quantita || 0), 0)
        
        if (allGcodeIds.length >= 2 && totalQuantity >= 2) {
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
        }
      }
    }
    
    return proposals
  } catch (error) {
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
    
    // Crea una mappa delle quantità per ogni G-code
    const gcodeQuantities = new Map<number, number>()
    for (const ordine of ordiniData) {
      const currentQuantity = gcodeQuantities.get(ordine.gcode_id) || 0
      gcodeQuantities.set(ordine.gcode_id, currentQuantity + ordine.quantita)
    }
    
    // Recupera i file .gcode.3mf reali associati agli ordini
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
      
      // Recupera i file .gcode.3mf e crea le liste di contenuti replicati
      const allGcodeContents: string[] = []
      let baseFile: File | null = null
      
      for (const gcode of gcodeData) {
        try {
          const percorsoCompleto = gcode.nome_file
          const quantity = gcodeQuantities.get(gcode.id) || 1
          
          // Recupera il file .gcode.3mf da Supabase Storage
          const { data: gcode3mfData, error: gcode3mfError } = await supabase.storage
            .from('files')
            .download(percorsoCompleto)
          
          if (gcode3mfError) {
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
        } catch (err) {
          throw new Error(`Impossibile recuperare file .gcode.3mf per gcode_id: ${gcode.id}`)
        }
      }
      
      if (allGcodeContents.length === 0) {
        throw new Error('Nessun contenuto G-code trovato per la concatenazione')
      }
      
      if (!baseFile) {
        throw new Error('Nessun file base trovato per la concatenazione')
      }
      
      // Usa il primo contenuto come base e gli altri come aggiuntivi
      const baseContent = allGcodeContents[0]
      const additionalContents = allGcodeContents.slice(1)
      
      const concatenatedPackage = await createConcatenatedGcode3mf(baseFile, additionalContents, outputFileName)
      
      // Valida il pacchetto creato
      const validation = await validateGcode3mfPackage(concatenatedPackage)
      
      if (!validation.isValid) {
        throw new Error(`Pacchetto .gcode.3mf non valido: ${validation.errors.join(', ')}`)
      }
      
      return concatenatedPackage
    } catch (error) {
      throw new Error(`Impossibile recuperare i file .gcode.3mf reali: ${error}`)
    }
    
  } catch (error) {
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
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Rimuovere gli ordini originali dalla coda
    await supabase
      .from('coda_stampa')
      .delete()
      .in('ordine_id', candidate.ordineIds)

    // 2. Creare il nuovo ordine concatenato usando il primo gcode
    const { data: newOrder, error: orderError } = await supabase
      .from('ordine')
      .insert({
        gcode_id: candidate.gcodeIds[0],
        quantita: candidate.totalQuantity,
        stato: 'in_coda'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 3. Aggiungere il nuovo ordine alla coda
    await supabase
      .from('coda_stampa')
      .insert({
        ordine_id: newOrder.id,
        stampante_id: candidate.stampanteId,
        stato: 'in_attesa',
        posizione: 1
      })

    // 4. Aggiornare gli stati degli ordini originali
    await supabase
      .from('ordine')
      .update({ stato: 'concatenato' })
      .in('id', candidate.ordineIds)

  } catch (error) {
    throw new Error(`Errore aggiornamento coda: ${error}`)
  }
} 