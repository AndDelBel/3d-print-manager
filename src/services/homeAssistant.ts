import type { 
  HomeAssistantEntity, 
  HomeAssistantStateResponse,
  PrinterState,
  PrinterStatusResponse,
  PrinterServiceCall,
  PrinterMapping
} from '@/types/homeAssistant'
import type { HomeAssistantConfig } from '@/types/homeAssistantConfig'
import { getHomeAssistantConfig as getHAConfigFromDB } from './homeAssistantConfig'

// Cache della configurazione
let haConfigCache: HomeAssistantConfig | null = null

export async function getHomeAssistantConfig(): Promise<HomeAssistantConfig | null> {
  if (haConfigCache) {
    return haConfigCache
  }
  
  try {
    const config = await getHAConfigFromDB()
    haConfigCache = config
    return config
  } catch (error) {
    console.error('Errore nel recupero configurazione HA:', error)
    return null
  }
}

export function clearHomeAssistantConfigCache(): void {
  haConfigCache = null
}

// Funzione per chiamare l'API di Home Assistant
async function callHomeAssistantAPI<T>(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET', 
  body?: unknown
): Promise<T> {
  const haConfig = await getHomeAssistantConfig()
  if (!haConfig) {
    throw new Error('Home Assistant non configurato')
  }

  const url = `${haConfig.base_url}/api/${endpoint}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${haConfig.access_token}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Home Assistant API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Ottieni lo stato di tutte le entità
export async function getStates(): Promise<HomeAssistantStateResponse> {
  return callHomeAssistantAPI<HomeAssistantStateResponse>('states')
}

// Ottieni lo stato di una singola entità
export async function getEntityState(entityId: string): Promise<HomeAssistantEntity> {
  return callHomeAssistantAPI<HomeAssistantEntity>(`states/${entityId}`)
}

// Chiama un servizio di Home Assistant
export async function callService(
  domain: string, 
  service: string, 
  serviceData?: Record<string, unknown>
): Promise<unknown> {
  return callHomeAssistantAPI('services', 'POST', {
    domain,
    service,
    service_data: serviceData,
  })
}

// Ottieni lo stato di una stampante specifica
export async function getPrinterState(entityId: string): Promise<PrinterStatusResponse> {
  try {
    const entity = await getEntityState(entityId)
    
    // Mappa lo stato dell'entità al formato della stampante
    const printerState: PrinterState = {
      entity_id: entity.entity_id,
      state: mapEntityStateToPrinterState(entity.state),
      attributes: {
        friendly_name: entity.attributes.friendly_name as string | undefined,
        current_temperature: entity.attributes.current_temperature as number | undefined,
        target_temperature: entity.attributes.target_temperature as number | undefined,
        bed_temperature: entity.attributes.bed_temperature as number | undefined,
        bed_target_temperature: entity.attributes.bed_target_temperature as number | undefined,
        print_progress: entity.attributes.print_progress as number | undefined,
        time_remaining: entity.attributes.time_remaining as number | undefined,
        time_elapsed: entity.attributes.time_elapsed as number | undefined,
        current_file: entity.attributes.current_file as string | undefined,
        filament_used: entity.attributes.filament_used as number | undefined,
        fan_speed: entity.attributes.fan_speed as number | undefined,
        flow_rate: entity.attributes.flow_rate as number | undefined,
        last_update: entity.last_updated,
      }
    }

    return {
      success: true,
      data: printerState
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }
  }
}

// Mappa lo stato dell'entità HA allo stato della stampante
function mapEntityStateToPrinterState(haState: string): PrinterState['state'] {
  switch (haState.toLowerCase()) {
    case 'idle':
    case 'ready':
      return 'idle'
    case 'printing':
    case 'print':
      return 'printing'
    case 'paused':
    case 'pause':
      return 'paused'
    case 'error':
    case 'error_state':
      return 'error'
    case 'offline':
    case 'unavailable':
    case 'unknown':
      return 'offline'
    default:
      return 'offline'
  }
}

// Controlla una stampante tramite Home Assistant
export async function controlPrinter(serviceCall: PrinterServiceCall): Promise<{ success: boolean; error?: string }> {
  try {
    const { entity_id, service, data } = serviceCall
    
    // Mappa i servizi della stampante ai servizi HA
    const haService = mapPrinterServiceToHAService(service)
    const haData = {
      entity_id,
      ...data
    }

    await callService('printer', haService, haData)
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    }
  }
}

// Mappa i servizi della stampante ai servizi HA
function mapPrinterServiceToHAService(printerService: PrinterServiceCall['service']): string {
  switch (printerService) {
    case 'start_print':
      return 'start_print'
    case 'pause_print':
      return 'pause_print'
    case 'resume_print':
      return 'resume_print'
    case 'cancel_print':
      return 'cancel_print'
    case 'set_temperature':
      return 'set_temperature'
    case 'set_fan_speed':
      return 'set_fan_speed'
    default:
      return printerService
  }
}

// Ottieni tutte le entità stampante disponibili
export async function getAvailablePrinters(): Promise<PrinterState[]> {
  try {
    // Verifica che Home Assistant sia configurato
    const haConfig = await getHomeAssistantConfig()
    if (!haConfig || !haConfig.base_url || !haConfig.access_token) {
      console.log('Home Assistant non configurato')
      return []
    }

    const states = await getStates()
    const printers: PrinterState[] = []

    console.log('Entità trovate in Home Assistant:', Array.isArray(states) ? states.length : Object.keys(states).length)
    
    // La risposta di Home Assistant è un array di entità, non un oggetto
    const entities = Array.isArray(states) ? states : Object.values(states)
    
    // Debug: mostra le entità che potrebbero essere stampanti
    const potentialPrinters = entities.filter(entity => 
      entity.entity_id.includes('printer') || 
      entity.entity_id.includes('x1') || 
      entity.entity_id.includes('a1') || 
      entity.entity_id.includes('h2d') || 
      entity.entity_id.includes('rat_rig')
    )
    console.log('Entità potenzialmente stampanti:', potentialPrinters.map(e => e.entity_id))
    
    // Debug: mostra le entità che contengono pattern di stampanti
    const printerEntities = entities.filter(e => 
      e.entity_id.includes('_printer_status') ||
      e.entity_id.includes('_printer_state') ||
      e.entity_id.includes('_3d_printer') ||
      e.entity_id.includes('rat_rig') ||
      e.entity_id.includes('x1') ||
      e.entity_id.includes('a1') ||
      e.entity_id.includes('h2d') ||
      e.entity_id.includes('bambu')
    )
    console.log('Entità stampanti trovate:', printerEntities.map(e => e.entity_id))
    
    // Cerca i template sensor delle stampanti
    for (const entity of entities) {
      // Cerca entità che contengono pattern di stampanti
      if (entity.entity_id.includes('_printer_status') ||
          entity.entity_id.includes('_printer_state') ||
          entity.entity_id.includes('_3d_printer') ||
          // Cerca anche entità specifiche per le tue stampanti
          entity.entity_id.includes('rat_rig') ||
          entity.entity_id.includes('x1') ||
          entity.entity_id.includes('a1') ||
          entity.entity_id.includes('h2d') ||
          entity.entity_id.includes('bambu') ||
          // Cerca anche le entità Bambu Lab specifiche
          entity.entity_id.includes('x1c_') ||
          entity.entity_id.includes('a1_') ||
          entity.entity_id.includes('h2d_')) {
        
        console.log('Template sensor stampante trovato:', entity.entity_id, entity.attributes.friendly_name)
        
        // Mappa gli attributi dai template sensor
        const attributes = entity.attributes || {}
        
        const printerState: PrinterState = {
          entity_id: entity.entity_id,
          state: mapEntityStateToPrinterState(entity.state),
          attributes: {
            friendly_name: attributes.friendly_name as string | undefined,
            current_temperature: attributes.hotend_temperature as number | undefined,
            target_temperature: attributes.target_temperature as number | undefined,
            bed_temperature: attributes.bed_temperature as number | undefined,
            bed_target_temperature: attributes.bed_target_temperature as number | undefined,
            print_progress: attributes.print_progress as number | undefined,
            time_remaining: attributes.time_remaining as number | undefined,
            time_elapsed: attributes.time_elapsed as number | undefined,
            current_file: attributes.current_file as string | undefined,
            filament_used: attributes.filament_used as number | undefined,
            fan_speed: attributes.fan_speed as number | undefined,
            flow_rate: attributes.flow_rate as number | undefined,
            last_update: entity.last_updated,
          }
        }
        
        printers.push(printerState)
      }
    }

    return printers
  } catch (error) {
    console.error('Errore nel recupero delle stampanti disponibili:', error)
    return []
  }
} 