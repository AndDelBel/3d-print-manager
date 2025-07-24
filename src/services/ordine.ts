import { supabase } from '@/lib/supabaseClient'
import type { Ordine } from '@/types/ordine'

export async function listOrders(): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select('*')
    .order('data_ordine', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createOrder(
  file_ordinato: string,
  quantita: number,
  consegna_richiesta?: string | null,
): Promise<void> {
  const row: Partial<Ordine> = {
    file_ordinato,
    quantita,
    stato: 'pending',        // valore di default
    data_ordine: new Date().toISOString(),
  }
  if (consegna_richiesta) row.consegna_richiesta = consegna_richiesta

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