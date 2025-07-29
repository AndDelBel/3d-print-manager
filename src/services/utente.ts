import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'

export async function getCurrentUser(): Promise<Utente | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    throw new Error('Sessione non valida')
  }

  const { data, error } = await supabase
    .from('utenti')
    .select('id, email, nome, cognome, created_at')
    .eq('id', session.user.id)
    .single()

  if (error) {
    throw error
  }

  return data
}