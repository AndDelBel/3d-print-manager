import { supabase } from '@/lib/supabaseClient'
import type { HomeAssistantConfig, CreateHomeAssistantConfig, UpdateHomeAssistantConfig } from '@/types/homeAssistantConfig'

export async function getHomeAssistantConfig(): Promise<HomeAssistantConfig | null> {
  const { data, error } = await supabase
    .from('home_assistant_config')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Errore nel recupero configurazione HA:', error)
    return null
  }

  return data
}

export async function createHomeAssistantConfig(config: CreateHomeAssistantConfig): Promise<HomeAssistantConfig> {
  const { data, error } = await supabase
    .from('home_assistant_config')
    .insert([config])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateHomeAssistantConfig(id: number, config: UpdateHomeAssistantConfig): Promise<HomeAssistantConfig> {
  const { data, error } = await supabase
    .from('home_assistant_config')
    .update(config)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertHomeAssistantConfig(config: CreateHomeAssistantConfig): Promise<HomeAssistantConfig> {
  // Prima prova a ottenere la configurazione esistente
  const existingConfig = await getHomeAssistantConfig()
  
  if (existingConfig) {
    // Aggiorna la configurazione esistente
    return await updateHomeAssistantConfig(existingConfig.id, config)
  } else {
    // Crea una nuova configurazione
    return await createHomeAssistantConfig(config)
  }
}

export async function deleteHomeAssistantConfig(id: number): Promise<void> {
  const { error } = await supabase
    .from('home_assistant_config')
    .delete()
    .eq('id', id)

  if (error) throw error
} 