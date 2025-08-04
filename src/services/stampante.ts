import { supabase } from '@/lib/supabaseClient'
import type { Stampante, StampanteStatus } from '@/types/stampante'
import { getPrinterState, controlPrinter, getAvailablePrinters } from './homeAssistant'
import type { PrinterState, PrinterServiceCall } from '@/types/homeAssistant'

export async function listStampanti({ userId, isSuperuser = false }: { userId?: string, isSuperuser?: boolean } = {}): Promise<Stampante[]> {
  console.log('listStampanti chiamato con:', { userId, isSuperuser });
  
  // Le RLS policies gestiscono automaticamente l'accesso basato su organizzazione
  // Per superuser: vede tutte le stampanti
  // Per utenti normali: vede solo le stampanti della propria organizzazione
  const { data, error } = await supabase
    .from('stampante')
    .select('*')
    .order('id', { ascending: false });
  
  if (error) {
    console.error('Errore caricamento stampanti:', error);
    throw error;
  }
  
  console.log('Stampanti caricate:', data);
  return data || [];
}

// Funzioni per API stampanti tramite Home Assistant
export async function getStampanteStatus(stampante: Stampante): Promise<StampanteStatus | null> {
  try {
    // Se la stampante ha un entity_id configurato, usa Home Assistant
    if (stampante.entity_id) {
      const haStatus = await getPrinterState(stampante.entity_id)
      
      if (haStatus.success && haStatus.data) {
        return mapHAPrinterStateToStampanteStatus(stampante.id, haStatus.data)
      } else {
        return {
          stampante_id: stampante.id,
          stato: 'offline',
          ultimo_aggiornamento: new Date().toISOString(),
          error: haStatus.error || 'Errore Home Assistant'
        }
      }
    }

    // Se non c'è entity_id, la stampante non è configurata per il monitoraggio
    return {
      stampante_id: stampante.id,
      stato: 'offline',
      ultimo_aggiornamento: new Date().toISOString(),
      error: 'Stampante non configurata per monitoraggio remoto'
    };
  } catch (error) {
    console.error(`Errore nel recupero status stampante ${stampante.nome}:`, error);
    return {
      stampante_id: stampante.id,
      stato: 'offline',
      ultimo_aggiornamento: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Errore di connessione'
    };
  }
}

// Mappa lo stato di Home Assistant al formato della stampante
function mapHAPrinterStateToStampanteStatus(stampanteId: number, haState: PrinterState): StampanteStatus {
  return {
    stampante_id: stampanteId,
    stato: mapHAStateToStampanteState(haState.state),
    temperatura_nozzle: haState.attributes.current_temperature,
    temperatura_piatto: haState.attributes.bed_temperature,
    percentuale_completamento: haState.attributes.print_progress,
    tempo_rimanente: haState.attributes.time_remaining,
    tempo_totale: haState.attributes.time_elapsed,
    nome_file_corrente: haState.attributes.current_file,
    ultimo_aggiornamento: haState.attributes.last_update || new Date().toISOString(),
  }
}

// Mappa gli stati di Home Assistant agli stati della stampante
function mapHAStateToStampanteState(haState: PrinterState['state']): StampanteStatus['stato'] {
  switch (haState) {
    case 'idle':
      return 'pronta'
    case 'printing':
      return 'in_stampa'
    case 'paused':
      return 'pausa'
    case 'error':
      return 'errore'
    case 'offline':
    default:
      return 'offline'
  }
}









// Funzioni CRUD per stampanti
export async function createStampante(stampanteData: Partial<Stampante>): Promise<Stampante> {
  const { data, error } = await supabase
    .from('stampante')
    .insert([stampanteData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateStampante(id: number, stampanteData: Partial<Stampante>): Promise<Stampante> {
  const { data, error } = await supabase
    .from('stampante')
    .update(stampanteData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStampante(id: number): Promise<void> {
  const { error } = await supabase
    .from('stampante')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getStampanteById(id: number): Promise<Stampante | null> {
  const { data, error } = await supabase
    .from('stampante')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Controlla una stampante tramite Home Assistant
export async function controlStampante(stampante: Stampante, action: string, params?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    // Se la stampante ha un entity_id configurato, usa Home Assistant
    if (stampante.entity_id) {
      const serviceCall: PrinterServiceCall = {
        entity_id: stampante.entity_id,
        service: action as PrinterServiceCall['service'],
        data: params
      }
      
      return await controlPrinter(serviceCall)
    }

    // Se non c'è entity_id, la stampante non è configurata per il controllo remoto
    return {
      success: false,
      error: 'Stampante non configurata per controllo remoto'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore di connessione'
    }
  }
}

// Ottieni le stampanti disponibili in Home Assistant
export async function getAvailableHAPrinters(): Promise<PrinterState[]> {
  return await getAvailablePrinters()
} 