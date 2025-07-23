import { supabase } from '@/lib/supabaseClient'
import type { Organizzazione } from '@/types/organizzazione'

export async function listOrg(): Promise<Organizzazione[]> {
  const { data, error } = await supabase
    .from('organizzazione')
    .select('*')
  if (error) throw error
  return data!
}

export async function createOrg(nome: string): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .insert([{ nome }])
  if (error) throw error
}

export async function updateOrg(id: number, nome: string): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .update({ nome })
    .eq('id', id)
  if (error) throw error
}

export async function deleteOrg(id: number): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .delete()
    .eq('id', id)
  if (error) throw error
}