import { supabase } from '@/lib/supabaseClient'
import type { OrdineInCoda, CodaStampaStato } from '@/types/codaStampa'
import type { Ordine } from '@/types/ordine'

// Lista ordini in coda (filtrati per stati in_coda, in_stampa, pronto)
export async function listCodaStampaWithRelations({ 
  organizzazione_id, 
  isSuperuser = false 
}: { 
  organizzazione_id?: number, 
  isSuperuser?: boolean 
}): Promise<OrdineInCoda[]> {
  let query = supabase
    .from('ordine')
    .select(`
      id,
      stato,
      gcode_id,
      file_origine_id,
      commessa_id,
      organizzazione_id,
      user_id,
      quantita,
      consegna_richiesta,
      note,
      data_ordine,
      data_inizio,
      data_fine,
      gcode (
        id,
        nome_file,
        peso_grammi,
        tempo_stampa_min,
        materiale,
        stampante_id
      ),
      file_origine (
        id,
        nome_file,
        descrizione
      ),
      commessa (
        id,
        nome
      ),
      organizzazione (
        id,
        nome
      )
    `)
    .in('stato', ['in_coda', 'in_stampa', 'pronto'])

  if (!isSuperuser && organizzazione_id) {
    query = query.eq('organizzazione_id', organizzazione_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Errore caricamento coda stampa:', error)
    throw error
  }

  // Ordina per priorità: consegna_richiesta (priorità 1), data_ordine (priorità 2)
  const sortedData = (data || []).sort((a, b) => {
    // Se entrambi hanno consegna_richiesta, ordina per quella
    if (a.consegna_richiesta && b.consegna_richiesta) {
      return new Date(a.consegna_richiesta).getTime() - new Date(b.consegna_richiesta).getTime()
    }
    
    // Se solo uno ha consegna_richiesta, quello viene prima
    if (a.consegna_richiesta && !b.consegna_richiesta) return -1
    if (!a.consegna_richiesta && b.consegna_richiesta) return 1
    
    // Altrimenti ordina per data_ordine
    return new Date(a.data_ordine).getTime() - new Date(b.data_ordine).getTime()
  })

  return sortedData as unknown as OrdineInCoda[]
}

// Lista ordini in coda (senza relazioni)
export async function listCodaStampa({ 
  organizzazione_id, 
  isSuperuser = false 
}: { 
  organizzazione_id?: number, 
  isSuperuser?: boolean 
}): Promise<Ordine[]> {
  let query = supabase
    .from('ordine')
    .select('*')
    .in('stato', ['in_coda', 'in_stampa', 'pronto'])

  if (!isSuperuser && organizzazione_id) {
    query = query.eq('organizzazione_id', organizzazione_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Errore caricamento coda stampa:', error)
    throw error
  }

  return data || []
}

// Aggiungi ordine alla coda (cambia stato a in_coda)
export async function addToCodaStampa(ordine_id: number): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update({ stato: 'in_coda' })
    .eq('id', ordine_id)
  
  if (error) throw error
}

// Aggiorna stato ordine in coda
export async function updateCodaStampaStatus(
  id: number, 
  stato: CodaStampaStato, 
  note?: string
): Promise<void> {
  const updateData: Partial<Ordine> = { stato }
  
  // Gestisci automaticamente i timestamps
  if (stato === 'in_stampa') {
    updateData.data_inizio = new Date().toISOString()
  } else if (stato === 'pronto') {
    updateData.data_fine = new Date().toISOString()
  } else if (stato === 'error') {
    // Per lo stato error, non impostiamo timestamps specifici
    // ma possiamo aggiungere una nota se fornita
  }
  
  if (note !== undefined) {
    updateData.note = note
  }

  const { error } = await supabase
    .from('ordine')
    .update(updateData)
    .eq('id', id)
  
  if (error) throw error
  
  // Se lo stato è "error", crea automaticamente un duplicato
  if (stato === 'error') {
    try {
      const { duplicateOrder } = await import('@/services/ordine')
      await duplicateOrder(id)
    } catch {
      // Non blocchiamo l'operazione principale se la duplicazione fallisce
    }
  }
}

// Rimuovi dalla coda (cambia stato a processamento)
export async function removeFromCodaStampa(id: number): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update({ stato: 'processamento' })
    .eq('id', id)
  
  if (error) throw error
}

// Ottieni prossimo ordine in coda per stampante
export async function getNextInQueue(stampante_id: number): Promise<OrdineInCoda | null> {
  // Prima ottieni il nome della stampante
  const { data: stampante, error: stampanteError } = await supabase
    .from('stampante')
    .select('nome')
    .eq('id', stampante_id)
    .single()
  
  if (stampanteError || !stampante) {
    return null
  }

  const { data, error } = await supabase
    .from('ordine')
    .select(`
      id,
      stato,
      gcode_id,
      file_origine_id,
      commessa_id,
      organizzazione_id,
      user_id,
      quantita,
      consegna_richiesta,
      note,
      data_ordine,
      gcode (
        id,
        nome_file,
        peso_grammi,
        tempo_stampa_min,
        materiale,
        stampante
      ),
      file_origine (
        id,
        nome_file,
        descrizione
      )
    `)
    .eq('stato', 'in_coda')
    .eq('gcode.stampante', stampante.nome)
    .order('consegna_richiesta', { ascending: true })
    .order('data_ordine', { ascending: true })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data as OrdineInCoda | null
}

// Ottieni conteggio ordini in coda per stampante
export async function getQueueCount(stampante_id: number): Promise<number> {
  const { count, error } = await supabase
    .from('ordine')
    .select('*', { count: 'exact', head: true })
    .eq('stato', 'in_coda')
    .eq('gcode.stampante_id', stampante_id)

  if (error) throw error
  return count || 0
} 

// Ottieni nome stampante tramite gcode_id
export async function getStampanteNameByGcodeId(gcode_id: number): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('gcode')
      .select(`
        stampante
      `)
      .eq('id', gcode_id)
      .single()

    if (error) {
      return null
    }

    return data?.stampante || null
  } catch (error) {
    console.error('Errore recupero nome stampante:', error)
    return null
  }
} 