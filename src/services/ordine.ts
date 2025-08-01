import { supabase } from '@/lib/supabaseClient'
import type { Ordine } from '@/types/ordine'
import { addToCodaStampa, updateCodaStampaStatus } from './codaStampa'

export async function listOrders({ organizzazione_id, isSuperuser = false }: { organizzazione_id?: number, isSuperuser?: boolean } = {}): Promise<Ordine[]> {
  console.log('listOrders chiamato con:', { organizzazione_id, isSuperuser });
  
  // Le RLS policies gestiscono automaticamente l'accesso basato su organizzazione
  // Per superuser: vede tutti gli ordini
  // Per utenti normali: vede solo gli ordini della propria organizzazione
  const { data, error } = await supabase
    .from('ordine')
    .select('*')
    .order('data_ordine', { ascending: false });
  
  if (error) {
    console.error('Errore caricamento ordini:', error);
    throw error;
  }
  
  console.log('Ordini caricati:', data);
  return data || [];
}

export async function createOrder(
  gcode_id: number,
  quantita: number,
  data_consegna?: string | null,
  note?: string | null,
  organizzazione_id?: number,
  user_id?: string
): Promise<void> {
  console.log('createOrder chiamato con:', { gcode_id, quantita, data_consegna, note, organizzazione_id, user_id })
  
  // Recupera user_id se non passato
  let uid = user_id
  if (!uid) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
    uid = userData.user.id
  }
  console.log('User ID:', uid)

  // Recupera commessa_id dal gcode
  const { data: gcode, error: gcodeError } = await supabase
    .from('gcode')
    .select('file_origine_id')
    .eq('id', gcode_id)
    .single()
  if (gcodeError || !gcode) {
    console.error('Errore recupero gcode:', gcodeError)
    throw gcodeError || new Error('G-code non trovato')
  }
  console.log('Gcode trovato:', gcode)

  // Recupera commessa_id dal file_origine
  const { data: fileOrigine, error: fileError } = await supabase
    .from('file_origine')
    .select('commessa_id')
    .eq('id', gcode.file_origine_id)
    .single()
  if (fileError || !fileOrigine) {
    console.error('Errore recupero file origine:', fileError)
    throw fileError || new Error('File origine non trovato')
  }
  console.log('File origine trovato:', fileOrigine)

  // Recupera organizzazione_id dalla commessa se non passato
  let orgId = organizzazione_id
  if (!orgId) {
    const { data: commessa, error: commessaError } = await supabase
      .from('commessa')
      .select('organizzazione_id')
      .eq('id', fileOrigine.commessa_id)
      .single()
    if (commessaError || !commessa) {
      console.error('Errore recupero commessa:', commessaError)
      throw commessaError || new Error('Commessa non trovata')
    }
    orgId = commessa.organizzazione_id
  }
  console.log('Organizzazione ID:', orgId)

  const row: Partial<Ordine> = {
    gcode_id,
    commessa_id: fileOrigine.commessa_id,
    organizzazione_id: orgId,
    quantita,
    stato: 'processamento',
    data_ordine: new Date().toISOString(),
    user_id: uid,
    consegna_richiesta: data_consegna ?? null,
    note: note ?? null,
  }
  console.log('Row da inserire:', row)
  
  try {
    const { data, error } = await supabase
      .from('ordine')
      .insert([row])
      .select()
    
    if (error) {
      console.error('Errore inserimento ordine:', error)
      console.error('Dettagli errore:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Errore inserimento ordine: ${error.message}`)
    }
    
    console.log('Ordine creato con successo:', data)
  } catch (err) {
    console.error('Errore generale inserimento ordine:', err)
    if (err instanceof Error) {
      throw err
    } else {
      throw new Error('Errore sconosciuto durante l\'inserimento dell\'ordine')
    }
  }
}

export async function updateOrderStatus(
  id: number,
  stato: Ordine['stato']
): Promise<void> {
  // Prima aggiorna lo stato dell'ordine
  const { error } = await supabase
    .from('ordine')
    .update({ stato })
    .eq('id', id)
  if (error) throw error

  // Se lo stato è diverso da 'processamento', gestisci la coda di stampa
  if (stato !== 'processamento') {
    try {
      // Recupera l'ordine per ottenere informazioni necessarie
      const { data: ordine, error: ordineError } = await supabase
        .from('ordine')
        .select('*')
        .eq('id', id)
        .single()
      
      if (ordineError) throw ordineError

      // Verifica se l'ordine è già nella coda di stampa
      const { data: existingCoda, error: codaError } = await supabase
        .from('coda_stampa')
        .select('*')
        .eq('ordine_id', id)
        .single()

      if (codaError && codaError.code !== 'PGRST116') throw codaError // PGRST116 = no rows returned

      if (!existingCoda) {
        // L'ordine non è nella coda, aggiungilo
        // Per ora usa la prima stampante disponibile (in futuro si può implementare logica più sofisticata)
        const { data: stampanti, error: stampantiError } = await supabase
          .from('stampante')
          .select('id')
          .eq('attiva', true)
          .limit(1)
        
        if (stampantiError) throw stampantiError
        
        if (stampanti && stampanti.length > 0) {
          await addToCodaStampa(id, stampanti[0].id)
        }
      } else {
        // L'ordine è già nella coda, aggiorna lo stato
        const codaStato = mapOrderStatusToCodaStatus(stato)
        await updateCodaStampaStatus(existingCoda.id, codaStato)
      }
    } catch (err) {
      console.error('Errore gestione coda stampa:', err)
      // Non bloccare l'aggiornamento dell'ordine se la coda fallisce
    }
  }
}

// Funzione per mappare gli stati dell'ordine agli stati della coda di stampa
function mapOrderStatusToCodaStatus(ordineStato: Ordine['stato']): 'in_queue' | 'printing' | 'done' | 'error' {
  switch (ordineStato) {
    case 'in_coda':
      return 'in_queue'
    case 'in_stampa':
      return 'printing'
    case 'pronto':
    case 'consegnato':
      return 'done'
    default:
      return 'in_queue'
  }
}

export async function updateOrderGcode(
  id: number,
  gcode_id: number
): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update({ gcode_id })
    .eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id: number): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function checkGcodeExists(nome_file: string): Promise<boolean> {
  const { error } = await supabase
    .from('gcode')
    .select('nome_file')
    .eq('nome_file', nome_file)
    .single()
  return !error
}

// Funzione per verificare se la tabella ordine esiste
export async function checkOrdineTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ordine')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Errore verifica tabella ordine:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Errore verifica tabella ordine:', err)
    return false
  }
}

// Funzione per creare la tabella ordine (da eseguire solo una volta)
export async function createOrdineTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ordine (
      id SERIAL PRIMARY KEY,
      gcode_id INTEGER NOT NULL REFERENCES gcode(id) ON DELETE CASCADE,
      commessa_id INTEGER NOT NULL REFERENCES commessa(id) ON DELETE CASCADE,
      organizzazione_id INTEGER NOT NULL REFERENCES organizzazione(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      quantita INTEGER NOT NULL CHECK (quantita > 0),
      stato TEXT NOT NULL DEFAULT 'processamento' CHECK (stato IN ('processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato')),
      data_ordine TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      consegna_richiesta TEXT,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.error('Errore creazione tabella ordine:', error)
    throw error
  }
}

export async function listOrdersByFileOrigine(file_origine_id: number): Promise<Ordine[]> {
  // Query con join per ottenere ordini associati a un file_origine
  const { data, error } = await supabase
    .from('ordine')
    .select(`
      *,
      gcode!inner(file_origine_id)
    `)
    .eq('gcode.file_origine_id', file_origine_id)
    .order('data_ordine', { ascending: false });
  
  if (error) throw error;
  return data || [];
}