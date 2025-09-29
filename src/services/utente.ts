import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'

export async function getUtenteById(user_id: string): Promise<Utente | null> {
  const { data, error } = await supabase
    .from('utente')
    .select('*')
    .eq('id', user_id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Nessun record trovato
    throw error
  }
  return data
}

export async function getUtentiByIds(user_ids: string[]): Promise<Map<string, Utente>> {
  if (!user_ids.length) return new Map()
  
  const { data, error } = await supabase
    .from('utente')
    .select('*')
    .in('id', user_ids)
  
  if (error) throw error
  
  const utentiMap = new Map<string, Utente>()
  data?.forEach((utente: Utente) => {
    utentiMap.set(utente.id, utente)
  })
  
  return utentiMap
}
