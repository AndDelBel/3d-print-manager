import { supabase } from '@/lib/supabaseClient'
import type { Ordine } from '@/types/ordine'

export async function listOrders({ organizzazione_id }: { organizzazione_id?: number } = {}): Promise<Ordine[]> {
  let query = supabase
    .from('ordine')
    .select('*')
    .order('data_ordine', { ascending: false });
  
  // Applica filtro per organizzazione se specificato
  if (organizzazione_id) {
    query = query.eq('organizzazione_id', organizzazione_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Errore caricamento ordini:', error);
    throw error;
  }
  
  return data || [];
}

export async function createOrder(
  gcode_id: number | null,
  file_origine_id: number,
  quantita: number,
  data_consegna?: string | null,
  note?: string | null,
  organizzazione_id?: number,
  user_id?: string
): Promise<void> {
  // Recupera user_id se non passato
  let uid = user_id
  if (!uid) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
    uid = userData.user.id
  }

  // Recupera commessa_id dal file_origine
  const { data: fileOrigine, error: fileError } = await supabase
    .from('file_origine')
    .select('commessa_id')
    .eq('id', file_origine_id)
    .single()
  if (fileError || !fileOrigine) {
    throw fileError || new Error('File origine non trovato')
  }

  // Recupera organizzazione_id dalla commessa se non passato
  let orgId = organizzazione_id
  if (!orgId) {
    const { data: commessa, error: commessaError } = await supabase
      .from('commessa')
      .select('organizzazione_id')
      .eq('id', fileOrigine.commessa_id)
      .single()
    if (commessaError || !commessa) {
      throw commessaError || new Error('Commessa non trovata')
    }
    orgId = commessa.organizzazione_id
  }

  // Se non c'è un G-code, crea uno provvisorio per mantenere il riferimento al file
  let finalGcodeId = gcode_id
  if (!finalGcodeId) {
    const { createProvisionalGcode } = await import('@/services/gcode')
    finalGcodeId = await createProvisionalGcode(file_origine_id)
  }

  // Crea l'oggetto per l'inserimento
  const row = {
    gcode_id: finalGcodeId,
    commessa_id: fileOrigine.commessa_id,
    organizzazione_id: orgId,
    quantita,
    stato: 'processamento' as const,
    data_ordine: new Date().toISOString(),
    user_id: uid,
    consegna_richiesta: data_consegna ?? null,
    note: note ?? null,
  }

  const { error } = await supabase
    .from('ordine')
    .insert([row])
    .select()
  
  if (error) {
    throw new Error(`Errore inserimento ordine: ${error.message}`)
  }
}

export async function updateOrderStatus(
  id: number,
  stato: Ordine['stato']
): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update({ stato })
    .eq('id', id)
  
  if (error) throw error
  
  // Se lo stato è "error", crea automaticamente un duplicato
  if (stato === 'error') {
    try {
      await duplicateOrder(id)
    } catch {
      // Non blocchiamo l'operazione principale se la duplicazione fallisce
    }
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
      return false
    }
    return true
  } catch {
    return false
  }
}

// Funzione per creare la tabella ordine (da eseguire solo una volta)
export async function createOrdineTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ordine (
      id SERIAL PRIMARY KEY,
      gcode_id INTEGER REFERENCES gcode(id) ON DELETE CASCADE,
      file_origine_id INTEGER NOT NULL REFERENCES file_origine(id) ON DELETE CASCADE,
      commessa_id INTEGER NOT NULL REFERENCES commessa(id) ON DELETE CASCADE,
      organizzazione_id INTEGER NOT NULL REFERENCES organizzazione(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      quantita INTEGER NOT NULL CHECK (quantita > 0),
      stato TEXT NOT NULL DEFAULT 'processamento' CHECK (stato IN ('processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato', 'error')),
      data_ordine TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      consegna_richiesta TEXT,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    throw error
  }
}

// Funzione per migrare la tabella ordine esistente
export async function migrateOrdineTable(): Promise<void> {
  try {
    // Prima controlla se la colonna file_origine_id esiste già
    const checkColumnSql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ordine' AND column_name = 'file_origine_id';
    `
    
    const { data: columnExists, error: checkError } = await supabase.rpc('exec_sql', { sql: checkColumnSql })
    
    if (checkError) {
      console.error('Errore verifica colonna:', checkError)
      throw checkError
    }
    
    // Se la colonna non esiste, aggiungila
    if (!columnExists || columnExists.length === 0) {
      console.log('Aggiungendo colonna file_origine_id alla tabella ordine...')
      
      // Prima rendi gcode_id nullable
      const makeGcodeNullableSql = `
        ALTER TABLE ordine ALTER COLUMN gcode_id DROP NOT NULL;
      `
      
      const { error: nullableError } = await supabase.rpc('exec_sql', { sql: makeGcodeNullableSql })
      if (nullableError) {
        console.warn('Errore rendendo gcode_id nullable:', nullableError)
      }
      
      // Aggiungi la colonna file_origine_id
      const addColumnSql = `
        ALTER TABLE ordine ADD COLUMN file_origine_id INTEGER;
      `
      
      const { error: addColumnError } = await supabase.rpc('exec_sql', { sql: addColumnSql })
      if (addColumnError) {
        console.error('Errore aggiunta colonna file_origine_id:', addColumnError)
        throw addColumnError
      }
      
      // Aggiungi la foreign key constraint
      const addForeignKeySql = `
        ALTER TABLE ordine 
        ADD CONSTRAINT fk_ordine_file_origine 
        FOREIGN KEY (file_origine_id) REFERENCES file_origine(id) ON DELETE CASCADE;
      `
      
      const { error: fkError } = await supabase.rpc('exec_sql', { sql: addForeignKeySql })
      if (fkError) {
        console.warn('Errore aggiunta foreign key:', fkError)
      }
      
      console.log('Migrazione tabella ordine completata!')
    } else {
      console.log('Colonna file_origine_id già presente nella tabella ordine')
    }
  } catch (error) {
    console.error('Errore durante la migrazione:', error)
    throw error
  }
}

export async function listOrdersByFileOrigine(file_origine_id: number): Promise<Ordine[]> {
  // Validate input parameter
  if (!file_origine_id || isNaN(file_origine_id)) {
    console.warn('Invalid file_origine_id provided:', file_origine_id);
    return [];
  }

  try {
    // Query per ottenere ordini associati a un file_origine
    const { data, error } = await supabase
      .from('ordine')
      .select('*')
      .eq('file_origine_id', file_origine_id)
      .order('data_ordine', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders by file_origine_id:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in listOrdersByFileOrigine:', error);
    throw error;
  }
}

export async function getOrder(id: number): Promise<Ordine | null> {
  const { data, error } = await supabase
    .from('ordine')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    return null
  }
  
  return data
}

export async function duplicateOrder(originalOrderId: number): Promise<number> {
  // Ottieni l'ordine originale
  const originalOrder = await getOrder(originalOrderId)
  if (!originalOrder) {
    throw new Error('Ordine originale non trovato')
  }
  
  // Crea un nuovo ordine con gli stessi dati ma stato "in_coda" e note aggiornate
  const newOrder: Partial<Ordine> = {
    gcode_id: originalOrder.gcode_id,
    commessa_id: originalOrder.commessa_id,
    organizzazione_id: originalOrder.organizzazione_id,
    user_id: originalOrder.user_id,
    quantita: originalOrder.quantita,
    stato: 'in_coda',
    data_ordine: new Date().toISOString(),
    consegna_richiesta: originalOrder.consegna_richiesta,
    note: 'ristampa per errore'
  }
  
  const { data, error } = await supabase
    .from('ordine')
    .insert([newOrder])
    .select('id')
    .single()
  
  if (error) {
    throw error
  }
  
  return data.id
}