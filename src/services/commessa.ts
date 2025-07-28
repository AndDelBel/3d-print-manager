import { supabase } from '@/lib/supabaseClient'
import type { Commessa } from '@/types/commessa'

export async function listCommesse({ organizzazione_id, isSuperuser = false }: { organizzazione_id?: number, isSuperuser?: boolean }): Promise<Commessa[]> {
  let query = supabase.from('commessa').select('*').order('created_at', { ascending: false });
  
  // Se viene specificata un'organizzazione, filtra sempre per quella organizzazione
  if (organizzazione_id) {
    query = query.eq('organizzazione_id', organizzazione_id);
  }
  // Altrimenti, se non è superuser, non dovrebbe vedere nulla (per sicurezza)
  else if (!isSuperuser) {
    // Per utenti non superuser senza organizzazione specificata, non mostrare nulla
    return [];
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createCommessa(nome: string, organizzazione_id: number): Promise<void> {
  const { error } = await supabase
    .from('commessa')
    .insert([{ nome, organizzazione_id }])
  if (error) throw error
}

export async function deleteCommessa(id: number): Promise<void> {
  const { error } = await supabase
    .from('commessa')
    .delete()
    .eq('id', id)
  if (error) throw error
} 