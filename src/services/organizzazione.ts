import { supabase } from '@/lib/supabaseClient'
import type { Organizzazione } from '@/types/organizzazione'

// Optimized field selection
const ORG_FIELDS = 'id, nome, descrizione, data_creazione' as const
const ORG_MINIMAL_FIELDS = 'id, nome' as const

// Cache for organizations to reduce queries
const orgCache = new Map<string, { data: Organizzazione[], expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Type for user-organization relationship (Supabase join result)
export interface UserOrgRelation {
  organizzazione_id: number
  role: string
  organizzazione: Pick<Organizzazione, 'id' | 'nome'>[]
}

export async function listOrg(): Promise<Organizzazione[]> {
  // Check cache first
  const cached = orgCache.get('all')
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const { data, error } = await supabase
    .from('organizzazione')
    .select(ORG_FIELDS)
    .order('nome')
  
  if (error) throw error
  
  const organizations = data || []
  
  // Cache the result
  orgCache.set('all', {
    data: organizations,
    expires: Date.now() + CACHE_TTL
  })
  
  return organizations
}

export async function listOrgMinimal(): Promise<Pick<Organizzazione, 'id' | 'nome'>[]> {
  const { data, error } = await supabase
    .from('organizzazione')
    .select(ORG_MINIMAL_FIELDS)
    .order('nome')
  
  if (error) throw error
  return data || []
}

export async function getOrgById(id: number): Promise<Organizzazione | null> {
  const { data, error } = await supabase
    .from('organizzazione')
    .select(ORG_FIELDS)
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  
  return data
}

export async function createOrg(nome: string, descrizione?: string): Promise<Organizzazione> {
  const { data, error } = await supabase
    .from('organizzazione')
    .insert([{ nome, descrizione }])
    .select(ORG_FIELDS)
    .single()
  
  if (error) throw error
  
  // Invalidate cache
  orgCache.delete('all')
  
  return data
}

export async function updateOrg(
  id: number, 
  updates: Partial<Pick<Organizzazione, 'nome' | 'descrizione'>>
): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .update(updates)
    .eq('id', id)
  
  if (error) throw error
  
  // Invalidate cache
  orgCache.delete('all')
}

export async function deleteOrg(id: number): Promise<void> {
  const { error } = await supabase
    .from('organizzazione')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  // Invalidate cache
  orgCache.delete('all')
}

// User-organization relationships
export async function listUserOrgs(): Promise<UserOrgRelation[]> {
  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select(`
      organizzazione_id,
      role,
      organizzazione:organizzazione_id(${ORG_MINIMAL_FIELDS})
    `)
  
  if (error) throw error
  return data || []
}

export async function addUserToOrg(
  userId: string, 
  orgId: number, 
  role: string = 'user'
): Promise<void> {
  const { error } = await supabase
    .from('organizzazioni_utente')
    .insert([{
      user_id: userId,
      organizzazione_id: orgId,
      role
    }])
  
  if (error) throw error
}

export async function removeUserFromOrg(userId: string, orgId: number): Promise<void> {
  const { error } = await supabase
    .from('organizzazioni_utente')
    .delete()
    .eq('user_id', userId)
    .eq('organizzazione_id', orgId)
  
  if (error) throw error
}

// Clean up expired cache entries
export function cleanOrgCache(): void {
  const now = Date.now()
  for (const [key, value] of orgCache.entries()) {
    if (value.expires <= now) {
      orgCache.delete(key)
    }
  }
}
