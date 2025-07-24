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

// restituisce un singolo oggetto per id
export async function getOrgById(id: number): Promise<Organizzazione> {
  const { data, error } = await supabase
    .from('organizzazione')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// restituisce tutte le organizzazioni associate all'utente autenticato
export async function listUserOrgs(): Promise<Organizzazione[]> {
  // 1) prendi l'utente
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr || new Error('Utente non autenticato')
  const userId = userData.user.id

  // 2) fai la query includendo TUTTI i campi di organizzazione
  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select(`
      organizzazione (
        id,
        nome,
        is_admin,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (error) throw error

  // 3) data è di tipo { organizzazione: Organizzazione }[]
  return data.map(row => row.organizzazione)
}