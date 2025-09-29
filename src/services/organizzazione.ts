import { supabase } from '@/lib/supabaseClient'
import type { Organizzazione } from '@/types/organizzazione'

export async function listOrg({ userId, isSuperuser = false }: { userId?: string, isSuperuser?: boolean } = {}): Promise<Organizzazione[]> {
  // Per superuser, carica tutte le organizzazioni
  if (isSuperuser) {
    const { data, error } = await supabase.from('organizzazione').select('*');
    if (error) throw error;
    return data || [];
  }
  
  // Per utenti normali, carica solo le organizzazioni a cui appartengono
  if (!userId) throw new Error('userId richiesto per utenti non superuser');
  
  // Prima ottieni gli ID delle organizzazioni dell'utente
  const { data: userOrgs, error: userOrgsError } = await supabase
    .from('organizzazioni_utente')
    .select('organizzazione_id')
    .eq('user_id', userId);
  
  if (userOrgsError) throw userOrgsError;
  
  if (!userOrgs || userOrgs.length === 0) {
    return [];
  }
  
  // Poi carica le organizzazioni
  const orgIds = userOrgs.map((org: { organizzazione_id: number }) => org.organizzazione_id);
  const { data, error } = await supabase
    .from('organizzazione')
    .select('*')
    .in('id', orgIds);
  
  if (error) throw error;
  return data || [];
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
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw userErr || new Error('Utente non autenticato')
  const userId = userData.user.id

  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select('organizzazione(id,nome,created_at)')
    .eq('user_id', userId)

  if (error) throw error
  return data.map((row: { organizzazione: any }) => row.organizzazione).flat();
}
