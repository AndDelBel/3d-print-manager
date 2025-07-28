import { supabase } from '@/lib/supabaseClient'
import type { Ordine } from '@/types/ordine'

// Optimized fields selection instead of *
const ORDER_FIELDS = `
  id,
  file_ordinato,
  quantita,
  stato,
  data_ordine,
  consegna_richiesta,
  note,
  user_id,
  organizzazione_id
` as const

export async function listOrders(): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(ORDER_FIELDS)
    .order('data_ordine', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listOrdersByOrganization(orgId: number): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(ORDER_FIELDS)
    .eq('organizzazione_id', orgId)
    .order('data_ordine', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listOrdersByUser(userId: string): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(ORDER_FIELDS)
    .eq('user_id', userId)
    .order('data_ordine', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createOrder(
  file_ordinato: string,
  quantita: number,
  consegna_richiesta?: string | null,
  note?: string | null,
): Promise<void> {
  // Get user once and reuse
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw userError || new Error('User not authenticated')

  const row: Partial<Ordine> = {
    file_ordinato,
    quantita,
    stato: 'processamento',        // Updated default state
    data_ordine: new Date().toISOString(),
    user_id: user.id,
  }
  
  if (consegna_richiesta) row.consegna_richiesta = consegna_richiesta
  if (note) row.note = note

  const { error } = await supabase
    .from('ordine')
    .insert([row])
  if (error) throw error
}

export async function updateOrderStatus(
  id: number,
  stato: Ordine['stato']
): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update({ stato })
    .eq('id', id)
  if (error) throw error
}

export async function updateOrder(
  id: number,
  updates: Partial<Pick<Ordine, 'quantita' | 'consegna_richiesta' | 'note' | 'stato'>>
): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id: number): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .delete()
    .eq('id', id)
  if (error) throw error
}