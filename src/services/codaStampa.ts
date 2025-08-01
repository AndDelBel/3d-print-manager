import { supabase } from '@/lib/supabaseClient'
import type { CodaStampa, CodaStampaWithRelations } from '@/types/codaStampa'

// Lista coda stampa con relazioni (query separate)
export async function listCodaStampaWithRelations({ 
  organizzazione_id, 
  isSuperuser = false 
}: { 
  organizzazione_id?: number, 
  isSuperuser?: boolean 
}): Promise<CodaStampaWithRelations[]> {
  // Prima carica la coda stampa
  const { data: codaData, error: codaError } = await supabase
    .from('coda_stampa')
    .select('*')
    .order('posizione', { ascending: true });

  if (codaError) throw codaError;
  if (!codaData || codaData.length === 0) return [];

  // Raccogli tutti gli ID necessari
  const ordineIds = [...new Set(codaData.map(c => c.ordine_id))];
  const stampanteIds = [...new Set(codaData.map(c => c.stampante_id))];

  // Carica ordini
  const { data: ordiniData, error: ordiniError } = await supabase
    .from('ordine')
    .select('id, quantita, stato, gcode_id, commessa_id, organizzazione_id')
    .in('id', ordineIds);

  if (ordiniError) throw ordiniError;

  // Carica stampanti
  const { data: stampantiData, error: stampantiError } = await supabase
    .from('stampante')
    .select('id, nome, modello, attiva')
    .in('id', stampanteIds);

  if (stampantiError) throw stampantiError;

  // Carica gcode
  const gcodeIds = [...new Set(ordiniData?.map(o => o.gcode_id).filter(Boolean) || [])];
  let gcodeData: Array<{id: number, nome_file: string, peso_grammi?: number, tempo_stampa_min?: number, materiale?: string}> = [];
  if (gcodeIds.length > 0) {
    const { data: gcode, error: gcodeError } = await supabase
      .from('gcode')
      .select('id, nome_file, peso_grammi, tempo_stampa_min, materiale')
      .in('id', gcodeIds);
    
    if (gcodeError) throw gcodeError;
    gcodeData = gcode || [];
  }

  // Carica commesse
  const commessaIds = [...new Set(ordiniData?.map(o => o.commessa_id).filter(Boolean) || [])];
  let commesseData: Array<{id: number, nome: string}> = [];
  if (commessaIds.length > 0) {
    const { data: commesse, error: commesseError } = await supabase
      .from('commessa')
      .select('id, nome')
      .in('id', commessaIds);
    
    if (commesseError) throw commesseError;
    commesseData = commesse || [];
  }

  // Carica organizzazioni
  const orgIds = [...new Set(ordiniData?.map(o => o.organizzazione_id).filter(Boolean) || [])];
  let orgData: Array<{id: number, nome: string}> = [];
  if (orgIds.length > 0) {
    const { data: org, error: orgError } = await supabase
      .from('organizzazione')
      .select('id, nome')
      .in('id', orgIds);
    
    if (orgError) throw orgError;
    orgData = org || [];
  }

  // Crea mappe per lookup veloce
  const ordiniMap = new Map(ordiniData?.map(o => [o.id, o]) || []);
  const stampantiMap = new Map(stampantiData?.map(s => [s.id, s]) || []);
  const gcodeMap = new Map(gcodeData.map(g => [g.id, g]));
  const commesseMap = new Map(commesseData.map(c => [c.id, c]));
  const orgMap = new Map(orgData.map(o => [o.id, o]));

  // Combina i dati
  const result: CodaStampaWithRelations[] = codaData.map(coda => {
    const ordine = ordiniMap.get(coda.ordine_id);
    const stampante = stampantiMap.get(coda.stampante_id);
    
    return {
      ...coda,
      ordine,
      stampante,
      gcode: ordine ? gcodeMap.get(ordine.gcode_id) : undefined,
      commessa: ordine ? commesseMap.get(ordine.commessa_id) : undefined,
      organizzazione: ordine ? orgMap.get(ordine.organizzazione_id) : undefined,
    };
  });

  // Filtra per organizzazione se non superuser
  if (!isSuperuser && organizzazione_id) {
    return result.filter(item => item.organizzazione?.id === organizzazione_id);
  }

  return result;
}

// Lista coda stampa semplice (per compatibilità)
export async function listCodaStampa({ 
  organizzazione_id, 
  isSuperuser = false 
}: { 
  organizzazione_id?: number, 
  isSuperuser?: boolean 
}): Promise<CodaStampa[]> {
  const query = supabase.from('coda_stampa').select('*').order('posizione', { ascending: true });
  
  if (!isSuperuser && organizzazione_id) {
    // Per ora filtra lato client, in futuro implementare join
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Aggiungi ordine alla coda
export async function addToCodaStampa(ordine_id: number, stampante_id: number): Promise<CodaStampa> {
  // Recupera la posizione massima per questa stampante
  const { data: maxPos, error: maxError } = await supabase
    .from('coda_stampa')
    .select('posizione')
    .eq('stampante_id', stampante_id)
    .order('posizione', { ascending: false })
    .limit(1);
  
  if (maxError) throw maxError;
  
  const nextPosition = (maxPos?.[0]?.posizione || 0) + 1;
  
  const { data, error } = await supabase
    .from('coda_stampa')
    .insert([{
      ordine_id,
      stampante_id,
      posizione: nextPosition,
      stato: 'in_queue'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Aggiorna stato coda stampa
export async function updateCodaStampaStatus(
  id: number, 
  stato: CodaStampa['stato'], 
  note?: string
): Promise<CodaStampa> {
  const updateData: Partial<CodaStampa> = { stato };
  
  // Aggiorna timestamp in base allo stato
  if (stato === 'printing' && !updateData.data_inizio) {
    updateData.data_inizio = new Date().toISOString();
  } else if (stato === 'done' && !updateData.data_fine) {
    updateData.data_fine = new Date().toISOString();
  }
  
  if (note) {
    updateData.note = note;
  }
  
  const { data, error } = await supabase
    .from('coda_stampa')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;

  // Sincronizza lo stato dell'ordine corrispondente
  try {
    const ordineStato = mapCodaStatusToOrderStatus(stato);
    await supabase
      .from('ordine')
      .update({ stato: ordineStato })
      .eq('id', data.ordine_id);
  } catch (err) {
    console.error('Errore sincronizzazione stato ordine:', err);
    // Non bloccare l'aggiornamento della coda se l'ordine fallisce
  }

  return data;
}

// Funzione per mappare gli stati della coda di stampa agli stati dell'ordine
function mapCodaStatusToOrderStatus(codaStato: CodaStampa['stato']): 'processamento' | 'in_coda' | 'in_stampa' | 'pronto' | 'consegnato' {
  switch (codaStato) {
    case 'in_queue':
      return 'in_coda'
    case 'printing':
      return 'in_stampa'
    case 'done':
      return 'pronto'
    case 'error':
      return 'processamento' // In caso di errore, torna a processamento
    default:
      return 'in_coda'
  }
}

// Rimuovi dalla coda
export async function removeFromCodaStampa(id: number): Promise<void> {
  const { error } = await supabase
    .from('coda_stampa')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Sposta posizione nella coda
export async function moveCodaStampaPosition(id: number, newPosition: number): Promise<void> {
  // Recupera l'elemento corrente
  const { data: current, error: currentError } = await supabase
    .from('coda_stampa')
    .select('stampante_id, posizione')
    .eq('id', id)
    .single();
  
  if (currentError) throw currentError;
  
  // Aggiorna le posizioni degli altri elementi
  if (newPosition > current.posizione) {
    // Sposta verso il basso - aggiorna manualmente
    const { data: itemsToUpdate, error: selectError } = await supabase
      .from('coda_stampa')
      .select('id, posizione')
      .eq('stampante_id', current.stampante_id)
      .gte('posizione', current.posizione)
      .lt('posizione', newPosition + 1);
    
    if (selectError) throw selectError;
    
    // Aggiorna ogni elemento
    for (const item of itemsToUpdate || []) {
      if (item.id !== id) {
        await supabase
          .from('coda_stampa')
          .update({ posizione: item.posizione - 1 })
          .eq('id', item.id);
      }
    }
  } else if (newPosition < current.posizione) {
    // Sposta verso l'alto - aggiorna manualmente
    const { data: itemsToUpdate, error: selectError } = await supabase
      .from('coda_stampa')
      .select('id, posizione')
      .eq('stampante_id', current.stampante_id)
      .lte('posizione', current.posizione)
      .gt('posizione', newPosition - 1);
    
    if (selectError) throw selectError;
    
    // Aggiorna ogni elemento
    for (const item of itemsToUpdate || []) {
      if (item.id !== id) {
        await supabase
          .from('coda_stampa')
          .update({ posizione: item.posizione + 1 })
          .eq('id', item.id);
      }
    }
  }
  
  // Aggiorna la posizione dell'elemento corrente
  const { error } = await supabase
    .from('coda_stampa')
    .update({ posizione: newPosition })
    .eq('id', id);
  
  if (error) throw error;
}

// Ottieni prossimo elemento in coda per stampante
export async function getNextInQueue(stampante_id: number): Promise<CodaStampa | null> {
  const { data, error } = await supabase
    .from('coda_stampa')
    .select('*')
    .eq('stampante_id', stampante_id)
    .eq('stato', 'in_queue')
    .order('posizione', { ascending: true })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

// Conta elementi in coda per stampante
export async function getQueueCount(stampante_id: number): Promise<number> {
  const { count, error } = await supabase
    .from('coda_stampa')
    .select('*', { count: 'exact', head: true })
    .eq('stampante_id', stampante_id)
    .eq('stato', 'in_queue');
  
  if (error) throw error;
  return count || 0;
} 