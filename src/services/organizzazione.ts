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

// Ottieni solo le organizzazioni dell'utente corrente
export async function listUserOrgs(): Promise<Organizzazione[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')

  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select(`
      organizzazione_id,
      role,
      is_admin,
      organizzazione!inner(id, nome, is_admin, created_at)
    `)
    .eq('user_id', userData.user.id)

  if (error) throw error
  
  // Map the joined data to the Organizzazione format
  return data?.map(row => {
    const org = Array.isArray(row.organizzazione) ? row.organizzazione[0] : row.organizzazione
    return {
      id: org.id,
      nome: org.nome,
      is_admin: row.is_admin, // Use the user's admin status for this org
      created_at: org.created_at
    }
  }) || []
}

// Controlla se l'utente è admin di almeno un'organizzazione
export async function isUserAdmin(): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return false

  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select('is_admin')
    .eq('user_id', userData.user.id)
    .eq('is_admin', true)
    .limit(1)

  if (error) return false
  return (data && data.length > 0)
}

// Ottieni dettagli organizzazione specifica
export async function getOrgById(id: number): Promise<Organizzazione | null> {
  const { data, error } = await supabase
    .from('organizzazione')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Aggiorna organizzazione - overloaded function for backward compatibility
export async function updateOrg(id: number, updates: Partial<Organizzazione>): Promise<void>
export async function updateOrg(id: number, nome: string): Promise<void>
export async function updateOrg(id: number, updatesOrNome: Partial<Organizzazione> | string): Promise<void> {
  const updates = typeof updatesOrNome === 'string' ? { nome: updatesOrNome } : updatesOrNome
  
  const { error } = await supabase
    .from('organizzazione')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

// Elimina organizzazione
export async function deleteOrg(id: number): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .delete()
    .eq('id', id)

  if (error) throw error
}
