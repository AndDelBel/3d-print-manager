// Tipi per l'integrazione con Home Assistant

export interface HomeAssistantConfig {
  base_url: string;
  access_token: string;
  entity_prefix?: string; // Prefisso per le entità delle stampanti
}

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HomeAssistantServiceCall {
  domain: string;
  service: string;
  service_data?: Record<string, unknown>;
}

export interface HomeAssistantStateResponse {
  [entity_id: string]: HomeAssistantEntity;
}

// Stati specifici per le stampanti 3D
export interface PrinterState {
  entity_id: string;
  unique_id: string;
  state: 'idle' | 'printing' | 'paused' | 'error' | 'offline';
  friendly_name?: string;
  hotend_temperature?: number;
  bed_temperature?: number;
  print_progress?: number;
  time_remaining?: number;
  current_file?: string;
  last_update?: string;
}

// Configurazione per mappare le stampanti del database con le entità HA
export interface PrinterMapping {
  id: number; // ID della stampante nel database
  entity_id: string; // Entity ID in Home Assistant
  friendly_name?: string;
  enabled: boolean;
}

// Risposta per lo stato di una stampante
export interface PrinterStatusResponse {
  success: boolean;
  data?: PrinterState;
  error?: string;
}

// Servizi disponibili per le stampanti
export interface PrinterServiceCall {
  entity_id: string;
  service: 'start_print' | 'pause_print' | 'resume_print' | 'cancel_print' | 'set_temperature' | 'set_fan_speed';
  data?: Record<string, unknown>;
} 