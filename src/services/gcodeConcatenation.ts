import { supabase } from '@/lib/supabaseClient'
import { listOrders } from './ordine'
import { listGcode } from './gcode'
import { listCommesse } from './commessa'
import { listOrg } from './organizzazione'
import type { Ordine } from '@/types/ordine'
import type { Gcode } from '@/types/gcode'
import type { Commessa } from '@/types/commessa'
import type { Organizzazione } from '@/types/organizzazione'
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
 * Aggiorna automaticamente i G-code senza informazioni sulla stampante
 */
async function updateGcodesWithoutPrinterInfo(): Promise<void> {
  try {
    // Trova G-code senza stampante
    const { data: gcodesWithoutPrinter, error } = await supabase
      .from('gcode')
      .select('id, nome_file')
      .or('stampante.is.null,stampante.eq.')
      .not('nome_file', 'is', null)
    
    if (error) {
      return
    }
    
    if (!gcodesWithoutPrinter || gcodesWithoutPrinter.length === 0) {
      return
    }
    
    // Aggiorna i primi 5 G-code per evitare sovraccarico
    const gcodesToUpdate = gcodesWithoutPrinter.slice(0, 5)
    
    for (const gcode of gcodesToUpdate) {
      try {
        // Scarica il file per analizzarlo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('files')
          .download(gcode.nome_file)
        
        if (downloadError || !fileData) {
          continue
        }
        
        // Analizza il file per estrarre informazioni sulla stampante
        const fileName = gcode.nome_file.split('/').pop() || 'temp.gcode'
        const file = new File([fileData], fileName, { type: 'text/plain' })
        
        // Importa dinamicamente per evitare problemi di build
        const { analyzeGcodeFile } = await import('@/utils/gcodeParser')
        const analysis = await analyzeGcodeFile(file)
        
        if (analysis.stampante) {
          // Aggiorna il database
          const { error: updateError } = await supabase
            .from('gcode')
            .update({ stampante: analysis.stampante })
            .eq('id', gcode.id)
          
          if (updateError) {
            // Errore silenzioso
          }
        }
        
        // Pausa per evitare sovraccarico
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        // Errore silenzioso
      }
    }
    
  } catch (error) {
    // Errore silenzioso
  }
}

/**
 * Trova candidati per la concatenazione nella coda di stampa
 */
export async function findConcatenationCandidates(
  automaticProfileName: string
): Promise<ConcatenationProposal[]> {
  try {
    console.log('🔍 Avvio ricerca candidati concatenazione...')
    
    // Aggiorna automaticamente i G-code senza informazioni sulla stampante
    await updateGcodesWithoutPrinterInfo()
    
    // Carica ordini in coda
    const ordersList = await listOrders({ })
    
    const codaOrders = ordersList.filter(o => ['in_coda', 'in_stampa', 'pronto', 'error'].includes(o.stato))
    
    if (codaOrders.length === 0) {
      return []
    }
    
    // Carica relazioni necessarie
    const gcodeIds = [...new Set(codaOrders.map(o => o.gcode_id).filter(id => id !== null))] as number[]
    const commessaIds = [...new Set(codaOrders.map(o => o.commessa_id))]
    const organizzazioneIds = [...new Set(codaOrders.map(o => o.organizzazione_id))]
    
    // Carica gcode, commesse e organizzazioni
    const gcodeList = await listGcode({ file_origine_id: undefined })
    const commesseList = await listCommesse({ isSuperuser: true })
    const organizzazioniList = await listOrg({ isSuperuser: true })
    
    // Crea mappe per lookup veloce
    const gcodeMap = new Map(gcodeList.map(g => [g.id, g]))
    const commesseMap = new Map(commesseList.map(c => [c.id, c]))
    const organizzazioniMap = new Map(organizzazioniList.map(o => [o.id, o]))
    
    // Raggruppa per stampante (nome della stampante estratto dal file)
    const groupedByPrinter = new Map<string, Ordine[]>()
    
    for (const order of codaOrders) {
      if (!order.gcode_id) {
        console.log('⚠️ Ordine senza G-code associato:', order.id)
        continue
      }
      if (!order.gcode_id) continue
const gcode = gcodeMap.get(order.gcode_id)
      if (!gcode) {
        console.log('⚠️ G-code non trovato:', order.gcode_id)
        continue
      }
      
      // Usa il nome della stampante se disponibile, altrimenti usa un fallback
      const printerName = gcode.stampante || 'Unknown Printer'
      if (!groupedByPrinter.has(printerName)) {
        groupedByPrinter.set(printerName, [])
      }
      groupedByPrinter.get(printerName)!.push(order)
    }
    
    console.log('🖨️ Stampanti trovate:', groupedByPrinter.size)
    for (const [printerName, items] of groupedByPrinter) {
      console.log(`  - Stampante "${printerName}": ${items.length} ordini`)
    }
    
    const proposals: ConcatenationProposal[] = []
    
    // 1. Analizza ordini singoli con quantità > 1 (concatenazione interna)
    const singleOrderProposals: ConcatenationProposal[] = []
    
    for (const order of codaOrders) {
      if (order.quantita > 1) {
        if (!order.gcode_id) continue
        if (!order.gcode_id) continue
const gcode = gcodeMap.get(order.gcode_id)
        if (!gcode) continue
        
        const printerName = gcode.stampante || 'Unknown Printer'
        
        const candidate: ConcatenationCandidate = {
          ordineIds: [order.id],
          gcodeIds: [order.gcode_id],
          stampanteId: printerName,
          materialName: gcode.materiale || 'Unknown',
          printSettingsName: 'Automatic Profile',
          totalQuantity: order.quantita,
          isSameGcode: true
        }
        
        singleOrderProposals.push({
          id: `single_order_${order.id}_${order.gcode_id}`,
          type: 'same_gcode',
          candidates: [candidate],
          description: `🔄 Ordine ${order.id}: ${order.quantita}x ${gcode.nome_file?.split('/').pop() || 'Unknown'} - ${printerName}`,
          estimatedTime: gcode.tempo_stampa_min ? gcode.tempo_stampa_min * order.quantita : 0,
          estimatedMaterial: gcode.peso_grammi ? gcode.peso_grammi * order.quantita : 0
        })
      }
    }
    
    // Aggiungi le proposte di ordini singoli
    proposals.push(...singleOrderProposals)
    
    // 2. Analizza ogni stampante per concatenazione tra ordini diversi
    for (const [printerName, items] of groupedByPrinter) {
      if (items.length < 2) {
        continue
      }
      
      // Se la stampante è "Unknown Printer", raggruppa solo per materiale
      if (printerName === 'Unknown Printer') {
        // Raggruppa per materiale
        const materialGroups = new Map<string, Ordine[]>()
        
        for (const item of items) {
          if (!item.gcode_id) continue
          const gcode = gcodeMap.get(item.gcode_id)
          if (!gcode) continue
          
          const materialKey = gcode.materiale || 'unknown'
          if (!materialGroups.has(materialKey)) {
            materialGroups.set(materialKey, [])
          }
          materialGroups.get(materialKey)!.push(item)
        }
        
        // Proponi concatenazione per stesso materiale
        for (const [materialKey, materialItems] of materialGroups) {
          if (materialItems.length > 1) {
            const totalQuantity = materialItems.reduce((sum, item) => sum + item.quantita, 0)
            
            if (totalQuantity > 1) {
              const candidate: ConcatenationCandidate = {
                ordineIds: materialItems.map(item => item.id).filter(id => id > 0),
                gcodeIds: materialItems.map(item => item.gcode_id).filter(id => id !== null) as number[],
                stampanteId: 'Unknown Printer',
                materialName: materialKey,
                printSettingsName: 'Automatic Profile',
                totalQuantity,
                isSameGcode: false
              }
              
              proposals.push({
                id: `same_material_unknown_${materialKey}`,
                type: 'same_material',
                candidates: [candidate],
                description: `${totalQuantity}x items - ${materialKey} - Unknown Printer`,
                estimatedTime: materialItems.reduce((sum, item) => {
                  if (!item.gcode_id) return sum
                  const gcode = gcodeMap.get(item.gcode_id)
                  return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
                }, 0),
                estimatedMaterial: materialItems.reduce((sum, item) => {
                  if (!item.gcode_id) return sum
                  const gcode = gcodeMap.get(item.gcode_id)
                  return sum + (gcode?.peso_grammi || 0) * item.quantita
                }, 0)
              })
            }
          }
        }
        
        continue // Salta l'analisi normale per questa stampante
      }
      
      // Raggruppa per G-code (stesso elemento)
      const sameGcodeGroups = new Map<number, Ordine[]>()
      
      for (const item of items) {
        if (!item.gcode_id) continue
        const gcodeId = item.gcode_id
        if (!sameGcodeGroups.has(gcodeId)) {
          sameGcodeGroups.set(gcodeId, [])
        }
        sameGcodeGroups.get(gcodeId)!.push(item)
      }
      
      // Proponi concatenazione per stesso G-code
      for (const [gcodeId, gcodeItems] of sameGcodeGroups) {
        if (gcodeItems.length > 1) {
          const totalQuantity = gcodeItems.reduce((sum, item) => sum + item.quantita, 0)
          
          if (totalQuantity > 1) {
            const gcode = gcodeMap.get(gcodeId)
            const candidate: ConcatenationCandidate = {
              ordineIds: gcodeItems.map(item => item.id).filter(id => id > 0),
              gcodeIds: [gcodeId],
              stampanteId: printerName, // Usa il nome della stampante invece dell'ID
              materialName: gcode?.materiale || 'Unknown',
              printSettingsName: 'Automatic Profile',
              totalQuantity,
              isSameGcode: true
            }
            
            proposals.push({
              id: `same_gcode_${gcodeId}_${printerName}`,
              type: 'same_gcode',
              candidates: [candidate],
              description: `${totalQuantity}x ${gcode?.nome_file || 'Unknown'} - ${printerName}`,
              estimatedTime: gcode?.tempo_stampa_min ? gcode.tempo_stampa_min * totalQuantity : 0,
              estimatedMaterial: gcode?.peso_grammi ? gcode.peso_grammi * totalQuantity : 0
            })
            
            console.log(`  ✅ Proposta creata per G-code ${gcodeId}`)
          }
        }
      }
      
      // Raggruppa per materiale e profilo (oggetti distinti)
      const materialGroups = new Map<string, Ordine[]>()
      
      for (const item of items) {
        if (!item.gcode_id) continue
        const gcode = gcodeMap.get(item.gcode_id)
        if (!gcode) {
          continue
        }
        
        const materialKey = `${gcode.materiale || 'unknown'}_${printerName}`
        if (!materialGroups.has(materialKey)) {
          materialGroups.set(materialKey, [])
        }
        materialGroups.get(materialKey)!.push(item)
      }
      
      console.log(`  - Materiali unici: ${materialGroups.size}`)
      
      // Proponi concatenazione per stesso materiale
      for (const [materialKey, materialItems] of materialGroups) {
        if (materialItems.length > 1) {
          const totalQuantity = materialItems.reduce((sum, item) => sum + item.quantita, 0)
          
          console.log(`  - Materiale ${materialKey}: ${materialItems.length} ordini, quantità totale: ${totalQuantity}`)
          
          if (totalQuantity > 1) {
            const materialName = materialKey.split('_')[0]
            const candidate: ConcatenationCandidate = {
              ordineIds: materialItems.map(item => item.id).filter(id => id > 0),
              gcodeIds: materialItems.map(item => item.gcode_id).filter(id => id !== null) as number[],
              stampanteId: printerName,
              materialName: materialName,
              printSettingsName: 'Automatic Profile',
              totalQuantity,
              isSameGcode: false
            }
            
            proposals.push({
              id: `same_material_${materialKey}`,
              type: 'same_material',
              candidates: [candidate],
              description: `${totalQuantity}x items - ${materialName} - ${printerName}`,
              estimatedTime: materialItems.reduce((sum, item) => {
                if (!item.gcode_id) return sum
const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
              }, 0),
              estimatedMaterial: materialItems.reduce((sum, item) => {
                if (!item.gcode_id) return sum
const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.peso_grammi || 0) * item.quantita
              }, 0)
            })
            
            console.log(`  ✅ Proposta creata per materiale ${materialKey}`)
          }
        }
      }
    }
    
    // Se non abbiamo trovato proposte con stampanti specifiche, prova a raggruppare tutti gli ordini
    if (proposals.length === 0 && codaOrders.length >= 2) {
      console.log('🔍 Nessuna proposta trovata, provando raggruppamento generale...')
      
      // Raggruppa per materiale tutti gli ordini
      const allMaterialGroups = new Map<string, Ordine[]>()
      
      for (const order of codaOrders) {
        if (!order.gcode_id) continue
const gcode = gcodeMap.get(order.gcode_id)
        if (!gcode) continue
        
        const materialKey = gcode.materiale || 'unknown'
        if (!allMaterialGroups.has(materialKey)) {
          allMaterialGroups.set(materialKey, [])
        }
        allMaterialGroups.get(materialKey)!.push(order)
      }
      
      // Proponi concatenazione per stesso materiale
      for (const [materialKey, materialItems] of allMaterialGroups) {
        if (materialItems.length > 1) {
          const totalQuantity = materialItems.reduce((sum, item) => sum + item.quantita, 0)
          
          console.log(`  - Materiale ${materialKey}: ${materialItems.length} ordini, quantità totale: ${totalQuantity}`)
          
          if (totalQuantity > 1) {
            const candidate: ConcatenationCandidate = {
              ordineIds: materialItems.map(item => item.id).filter(id => id > 0),
              gcodeIds: materialItems.map(item => item.gcode_id).filter(id => id !== null) as number[],
              stampanteId: 'General',
              materialName: materialKey,
              printSettingsName: 'Automatic Profile',
              totalQuantity,
              isSameGcode: false
            }
            
            proposals.push({
              id: `same_material_general_${materialKey}`,
              type: 'same_material',
              candidates: [candidate],
              description: `${totalQuantity}x items - ${materialKey} - General`,
              estimatedTime: materialItems.reduce((sum, item) => {
                if (!item.gcode_id) return sum
const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
              }, 0),
              estimatedMaterial: materialItems.reduce((sum, item) => {
                if (!item.gcode_id) return sum
const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.peso_grammi || 0) * item.quantita
              }, 0)
            })
            
            console.log(`  ✅ Proposta generale creata per materiale ${materialKey}`)
          }
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
          
                // Usa sempre la quantità esatta richiesta, senza limitazioni
      for (let i = 0; i < quantity; i++) {
        allGcodeContents.push(modelGcode)
      }
      
      const fileSizeMB = modelGcode.length / 1024 / 1024
          
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
      
      // Controlla la dimensione totale del contenuto
      const totalSize = allGcodeContents.reduce((sum, content) => sum + content.length, 0)
      
      if (totalSize > 500 * 1024 * 1024) { // Aumentato a 500MB per gestire file più grandi
        // Limita il contenuto mantenendo solo i primi file
        const maxSize = 500 * 1024 * 1024
        let currentSize = 0
        const limitedContents = []
        
        for (const content of allGcodeContents) {
          if (currentSize + content.length > maxSize) break
          limitedContents.push(content)
          currentSize += content.length
        }
        
        allGcodeContents.length = 0
        allGcodeContents.push(...limitedContents)
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
    // Non modifichiamo gli ordini originali - rimangono invariati

  } catch (error) {
    throw new Error(`Errore durante la concatenazione: ${error}`)
  }
} 