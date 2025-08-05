export interface Stampante {
  id: number
  unique_id: string // ID unico della stampante in Home Assistant
  created_at: string
  updated_at: string
}

export interface CreateStampante {
  unique_id: string
}

export interface UpdateStampante {
  unique_id?: string
}

export interface ListStampantiParams {
  userId?: number
  isSuperuser?: boolean
}

// Tipo per i dati completi della stampante da Home Assistant
export interface StampanteData extends Stampante {
  // Dati da Home Assistant
  entity_id: string
  nome: string
  stato: 'idle' | 'printing' | 'paused' | 'error' | 'offline'
  hotend_temperature: number
  bed_temperature: number
  print_progress: number
  time_remaining: number
  current_file: string
  last_update: string
} 