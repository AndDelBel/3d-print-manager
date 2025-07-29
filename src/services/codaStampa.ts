import { supabase } from '@/lib/supabaseClient'
import type { CodaStampa } from '@/types/codaStampa'

export async function listCodaStampa({ organizzazione_id, isSuperuser = false }: { organizzazione_id?: number, isSuperuser?: boolean }): Promise<CodaStampa[]> {
  const query = supabase.from('coda_stampa').select('*').order('posizione', { ascending: true });
  if (!isSuperuser && organizzazione_id) {
    // Serve join con stampante per filtrare per organizzazione
    // NB: questa query funziona solo se hai una view o una funzione SQL che espone organizzazione_id
    // Altrimenti, filtra lato client dopo aver fetchato i dati
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ...aggiungi qui eventuali funzioni CRUD per coda stampa... 