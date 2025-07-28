import { supabase } from '@/lib/supabaseClient'
import type { Ordine } from '@/types/ordine'

// Optimized query with specific column selection instead of SELECT *
export async function listOrders(): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)
    .order('data_ordine', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Legacy createOrder function for backward compatibility
export async function createOrder(
  file_ordinato: string,
  quantita: number,
  consegna_richiesta?: string | null,
): Promise<void> {
  const row: Partial<Ordine> = {
    file_ordinato,
    quantita,
    stato: 'pending',        // Use correct enum value
    data_ordine: new Date().toISOString(),
  }
  if (consegna_richiesta) row.consegna_richiesta = consegna_richiesta

  const { error } = await supabase
    .from('ordine')
    .insert([row])
  if (error) throw error
}

// Optimized single order query with joins
export async function getOrderById(id: number): Promise<Ordine | null> {
  const { data, error } = await supabase
    .from('ordine')
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id,
      organizzazione!inner(id, nome),
      utente!inner(id, email)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Optimized orders by organization with pagination
export async function listOrdersByOrganization(
  organizationId: number,
  limit: number = 50,
  offset: number = 0
): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)
    .eq('organizzazione_id', organizationId)
    .order('data_ordine', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

// Optimized status update with optimistic updates support
export async function updateOrderStatus(id: number, stato: Ordine['stato']): Promise<Ordine> {
  const { data, error } = await supabase
    .from('ordine')
    .update({ stato })
    .eq('id', id)
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)
    .single()

  if (error) throw error
  return data
}

// Bulk status update for multiple orders
export async function bulkUpdateOrderStatus(
  orderIds: number[], 
  stato: Ordine['stato']
): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .update({ stato })
    .in('id', orderIds)
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)

  if (error) throw error
  return data || []
}

// Get orders by status with optimization
export async function getOrdersByStatus(stato: Ordine['stato']): Promise<Ordine[]> {
  const { data, error } = await supabase
    .from('ordine')
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)
    .eq('stato', stato)
    .order('data_ordine', { ascending: false })

  if (error) throw error
  return data || []
}

// Create order with optimized return (new interface)
export async function createOrderOptimized(orderData: Omit<Ordine, 'id' | 'data_ordine'>): Promise<Ordine> {
  const { data, error } = await supabase
    .from('ordine')
    .insert([orderData])
    .select(`
      id,
      file_ordinato,
      quantita,
      data_ordine,
      stato,
      consegna_richiesta,
      note,
      organizzazione_id,
      user_id,
      commessa_id,
      gcode_id
    `)
    .single()

  if (error) throw error
  return data
}

// Delete order with confirmation
export async function deleteOrder(id: number): Promise<void> {
  const { error } = await supabase
    .from('ordine')
    .delete()
    .eq('id', id)

  if (error) throw error
}