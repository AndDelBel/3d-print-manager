import { supabase } from '@/lib/supabaseClient'
import type { Commessa } from '@/types/commessa'

export async function listCommesse({ organizzazione_id, isSuperuser = false }: { organizzazione_id?: number, isSuperuser?: boolean }): Promise<Commessa[]> {
  let query = supabase
    .from('commessa')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Filtra per organizzazione se specificato
  if (organizzazione_id !== undefined) {
    query = query.eq('organizzazione_id', organizzazione_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
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