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
    console.log('🔄 Aggiornamento G-code senza informazioni stampante...')
    
    // Trova G-code senza stampante
    const { data: gcodesWithoutPrinter, error } = await supabase
      .from('gcode')
      .select('id, nome_file')
      .or('stampante.is.null,stampante.eq.')
      .not('nome_file', 'is', null)
    
    if (error) {
      console.error('❌ Errore ricerca G-code senza stampante:', error)
      return
    }
    
    if (!gcodesWithoutPrinter || gcodesWithoutPrinter.length === 0) {
      console.log('✅ Tutti i G-code hanno informazioni sulla stampante')
      return
    }
    
    console.log(`📦 Trovati ${gcodesWithoutPrinter.length} G-code senza informazioni stampante`)
    
    // Aggiorna i primi 5 G-code per evitare sovraccarico
    const gcodesToUpdate = gcodesWithoutPrinter.slice(0, 5)
    
    for (const gcode of gcodesToUpdate) {
      try {
        // Scarica il file per analizzarlo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('files')
          .download(gcode.nome_file)
        
        if (downloadError || !fileData) {
          console.log(`⚠️ Impossibile scaricare file: ${gcode.nome_file}`)
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
            console.error(`❌ Errore aggiornamento G-code ${gcode.id}:`, updateError)
          } else {
            console.log(`✅ G-code ${gcode.id} aggiornato con stampante: ${analysis.stampante}`)
          }
        }
        
        // Pausa per evitare sovraccarico
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Errore analisi G-code ${gcode.id}:`, error)
      }
    }
    
  } catch (error) {
    console.error('❌ Errore aggiornamento G-code:', error)
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
    const ordersList = await listOrders({ isSuperuser: true })
    console.log('📋 Ordini totali caricati:', ordersList.length)
    
    const codaOrders = ordersList.filter(o => ['in_coda', 'in_stampa', 'pronto', 'error'].includes(o.stato))
    console.log('📋 Ordini in coda filtrati:', codaOrders.length)
    
    // Debug: mostra i primi 5 ordini
    console.log('🔍 Primi 5 ordini in coda:', codaOrders.slice(0, 5).map(o => ({
      id: o.id,
      gcode_id: o.gcode_id,
      stato: o.stato,
      quantita: o.quantita
    })))
    
    if (codaOrders.length === 0) {
      console.log('⚠️ Nessun ordine in coda trovato')
      return []
    }
    
    // Carica relazioni necessarie
    const gcodeIds = [...new Set(codaOrders.map(o => o.gcode_id))]
    const commessaIds = [...new Set(codaOrders.map(o => o.commessa_id))]
    const organizzazioneIds = [...new Set(codaOrders.map(o => o.organizzazione_id))]
    
    console.log('🔗 ID G-code unici:', gcodeIds.length)
    console.log('🔗 ID Commesse uniche:', commessaIds.length)
    console.log('🔗 ID Organizzazioni uniche:', organizzazioneIds.length)
    
    // Carica gcode, commesse e organizzazioni
    const gcodeList = await listGcode({ file_origine_id: undefined })
    const commesseList = await listCommesse({ isSuperuser: true })
    const organizzazioniList = await listOrg({ isSuperuser: true })
    
    console.log('📦 G-code caricati:', gcodeList.length)
    console.log('📦 Commesse caricate:', commesseList.length)
    console.log('📦 Organizzazioni caricate:', organizzazioniList.length)
    
    // Crea mappe per lookup veloce
    const gcodeMap = new Map(gcodeList.map(g => [g.id, g]))
    const commesseMap = new Map(commesseList.map(c => [c.id, c]))
    const organizzazioniMap = new Map(organizzazioniList.map(o => [o.id, o]))
    
    // Raggruppa per stampante (nome della stampante estratto dal file)
    const groupedByPrinter = new Map<string, Ordine[]>()
    
    for (const order of codaOrders) {
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
    console.log('🔍 Analizzando ordini singoli con quantità > 1...')
    const singleOrderProposals: ConcatenationProposal[] = []
    
    for (const order of codaOrders) {
      if (order.quantita > 1) {
        const gcode = gcodeMap.get(order.gcode_id)
        if (!gcode) continue
        
        const printerName = gcode.stampante || 'Unknown Printer'
        
        console.log(`  - Ordine ${order.id}: ${order.quantita}x quantità per G-code ${order.gcode_id}`)
        
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
        
        console.log(`  ✅ Proposta creata per ordine singolo ${order.id}`)
      }
    }
    
    // Aggiungi le proposte di ordini singoli
    proposals.push(...singleOrderProposals)
    console.log(`📋 Proposte ordini singoli: ${singleOrderProposals.length}`)
    
    if (singleOrderProposals.length === 0) {
      console.log('ℹ️ Nessun ordine singolo con quantità > 1 trovato')
    }
    
    // 2. Analizza ogni stampante per concatenazione tra ordini diversi
    for (const [printerName, items] of groupedByPrinter) {
      if (items.length < 2) {
        console.log(`⚠️ Stampante "${printerName}": solo ${items.length} ordini, insufficienti per concatenazione`)
        continue
      }
      
      // Se la stampante è "Unknown Printer", raggruppa solo per materiale
      if (printerName === 'Unknown Printer') {
        console.log(`🔍 Analizzando ordini senza stampante specifica (${items.length} ordini)`)
        
        // Raggruppa per materiale
        const materialGroups = new Map<string, Ordine[]>()
        
        for (const item of items) {
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
            
            console.log(`  - Materiale ${materialKey}: ${materialItems.length} ordini, quantità totale: ${totalQuantity}`)
            
            if (totalQuantity > 1) {
              const candidate: ConcatenationCandidate = {
                ordineIds: materialItems.map(item => item.id).filter(id => id > 0),
                gcodeIds: materialItems.map(item => item.gcode_id),
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
                  const gcode = gcodeMap.get(item.gcode_id)
                  return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
                }, 0),
                estimatedMaterial: materialItems.reduce((sum, item) => {
                  const gcode = gcodeMap.get(item.gcode_id)
                  return sum + (gcode?.peso_grammi || 0) * item.quantita
                }, 0)
              })
              
              console.log(`  ✅ Proposta creata per materiale ${materialKey} (stampante sconosciuta)`)
            }
          }
        }
        
        continue // Salta l'analisi normale per questa stampante
      }
      
      console.log(`🔍 Analizzando stampante "${printerName}" con ${items.length} ordini`)
      
      // Raggruppa per G-code (stesso elemento)
      const sameGcodeGroups = new Map<number, Ordine[]>()
      
      for (const item of items) {
        const gcodeId = item.gcode_id
        if (!sameGcodeGroups.has(gcodeId)) {
          sameGcodeGroups.set(gcodeId, [])
        }
        sameGcodeGroups.get(gcodeId)!.push(item)
      }
      
      console.log(`  - G-code unici: ${sameGcodeGroups.size}`)
      
      // Proponi concatenazione per stesso G-code
      for (const [gcodeId, gcodeItems] of sameGcodeGroups) {
        if (gcodeItems.length > 1) {
          const totalQuantity = gcodeItems.reduce((sum, item) => sum + item.quantita, 0)
          
          console.log(`  - G-code ${gcodeId}: ${gcodeItems.length} ordini, quantità totale: ${totalQuantity}`)
          
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
              gcodeIds: materialItems.map(item => item.gcode_id),
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
                const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
              }, 0),
              estimatedMaterial: materialItems.reduce((sum, item) => {
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
              gcodeIds: materialItems.map(item => item.gcode_id),
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
                const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.tempo_stampa_min || 0) * item.quantita
              }, 0),
              estimatedMaterial: materialItems.reduce((sum, item) => {
                const gcode = gcodeMap.get(item.gcode_id)
                return sum + (gcode?.peso_grammi || 0) * item.quantita
              }, 0)
            })
            
            console.log(`  ✅ Proposta generale creata per materiale ${materialKey}`)
          }
        }
      }
    }
    
    console.log(`🎯 Proposte totali trovate: ${proposals.length}`)
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
    
    console.log('📊 Quantità per G-code:', Object.fromEntries(gcodeQuantities))
    
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
      console.log(`📦 G-code ${gcode.id}: ${quantity} quantità richieste, ${quantity} repliche create (file: ${fileSizeMB.toFixed(1)}MB)`)
          
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
      console.log(`📊 Dimensione totale contenuto: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      
      if (totalSize > 500 * 1024 * 1024) { // Aumentato a 500MB per gestire file più grandi
        console.warn('⚠️ Contenuto molto grande, limitando a 500MB')
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
        console.log(`📦 Contenuto limitato a ${limitedContents.length} file (${(currentSize / 1024 / 1024).toFixed(2)} MB)`)
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
    console.log('✅ File concatenato creato senza modificare gli ordini originali')
    console.log('📋 Ordini originali rimangono invariati:', candidate.ordineIds)
    
    // Log delle informazioni per debug
    console.log('📊 Informazioni concatenazione:', {
      ordiniOriginali: candidate.ordineIds,
      gcodeIds: candidate.gcodeIds,
      stampante: candidate.stampanteId,
      quantita: candidate.totalQuantity,
      materiale: candidate.materialName
    })

  } catch (error) {
    console.error('❌ Errore durante la concatenazione:', error)
    throw new Error(`Errore durante la concatenazione: ${error}`)
  }
} 