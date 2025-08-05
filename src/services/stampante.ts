import { supabase } from '@/lib/supabaseClient'
import type { Stampante, CreateStampante, UpdateStampante, ListStampantiParams, StampanteData } from '@/types/stampante'

export async function listStampanti(params: ListStampantiParams): Promise<Stampante[]> {
  console.log('listStampanti chiamato con:', params)
  
  let query = supabase
    .from('stampanti')
    .select('*')

  if (!params.isSuperuser) {
    query = query.eq('user_id', params.userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Errore nel recupero stampanti:', error)
    throw error
  }

  console.log('Stampanti caricate:', data)
  return data || []
}

export async function getStampante(id: number): Promise<Stampante | null> {
  const { data, error } = await supabase
    .from('stampanti')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createStampante(stampante: CreateStampante): Promise<Stampante> {
  // Verifica che la stampante esista in Home Assistant
  const response = await fetch('/api/home-assistant/printers')
  const data = await response.json()
  
  if (!data.success) {
    throw new Error('Errore nel recupero stampanti da Home Assistant')
  }
  
  const printerExists = data.printers.find((p: any) => p.unique_id === stampante.unique_id)
  
  if (!printerExists) {
    throw new Error('Stampante non trovata in Home Assistant')
  }

  // Verifica se la stampante esiste già nel database
  const { data: existingStampante, error: checkError } = await supabase
    .from('stampanti')
    .select('*')
    .eq('unique_id', stampante.unique_id)
    .single()

  if (existingStampante) {
    // Se esiste già, restituisci quella esistente
    return existingStampante
  }

  // Salva solo l'ID unico nel database
  const { data: dbData, error } = await supabase
    .from('stampanti')
    .insert([{ unique_id: stampante.unique_id }])
    .select()
    .single()

  if (error) throw error
  return dbData
}

export async function updateStampante(id: number, stampante: UpdateStampante): Promise<Stampante> {
  const { data, error } = await supabase
    .from('stampanti')
    .update(stampante)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStampante(id: number): Promise<void> {
  const { error } = await supabase
    .from('stampanti')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Ottieni i dati completi di una stampante da Home Assistant
export async function getStampanteData(id: number): Promise<StampanteData | null> {
  const stampante = await getStampante(id)
  if (!stampante) {
    return null
  }

  // Ottieni i dati aggiornati da Home Assistant
  const response = await fetch('/api/home-assistant/printers')
  const data = await response.json()
  
  if (!data.success) {
    return null
  }
  
  const printerData = data.printers.find((p: any) => p.unique_id === stampante.unique_id)
  
  if (!printerData) {
    return null
  }

  // Combina i dati del database con quelli di Home Assistant
  return {
    ...stampante,
    entity_id: printerData.entity_id,
    nome: printerData.friendly_name || stampante.unique_id,
    stato: printerData.state,
    hotend_temperature: printerData.hotend_temperature || 0,
    bed_temperature: printerData.bed_temperature || 0,
    print_progress: printerData.print_progress || 0,
    time_remaining: printerData.time_remaining || 0,
    current_file: printerData.current_file || '',
    last_update: printerData.last_update || new Date().toISOString()
  }
}

// Ottieni i dati completi di tutte le stampanti
export async function getAllStampantiData(params: ListStampantiParams): Promise<StampanteData[]> {
  const stampanti = await listStampanti(params)
  const stampantiData: StampanteData[] = []

  for (const stampante of stampanti) {
    try {
      const data = await getStampanteData(stampante.id)
      if (data) {
        stampantiData.push(data)
      }
    } catch (error) {
      console.error(`Errore nel recupero dati stampante ${stampante.id}:`, error)
    }
  }

  return stampantiData
} 