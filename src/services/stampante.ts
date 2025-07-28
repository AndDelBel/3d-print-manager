import { supabase } from '@/lib/supabaseClient'
import type { Stampante, StampanteStatus } from '@/types/stampante'

export async function listStampanti(): Promise<Stampante[]> {
  const { data, error } = await supabase
    .from('stampante')
    .select('*')
    .order('id', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Funzioni per API stampanti
export async function getStampanteStatus(stampante: Stampante): Promise<StampanteStatus | null> {
  try {
    // Usa l'API route del server per evitare problemi CORS
    const response = await fetch(`/api/stampanti/${stampante.id}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const status = await response.json();
    
    // Se c'è un errore nella risposta, restituisci null
    if (status.error) {
      console.error(`Errore API stampante ${stampante.nome}:`, status.error);
      return {
        stampante_id: stampante.id,
        stato: 'offline',
        ultimo_aggiornamento: new Date().toISOString(),
        error: status.error
      };
    }

    return status;
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

async function getKlipperStatus(stampante: Stampante): Promise<StampanteStatus | null> {
  const endpoint = stampante.endpoint_api;
  const apiKey = stampante.api_key;

  // Per sviluppo, usa dati mock se l'endpoint non è configurato
  if (!endpoint || endpoint.includes('test')) {
    return getMockKlipperStatus(stampante.id);
  }

  try {
    // Richiesta per ottenere lo stato della stampante
    const printerInfoResponse = await fetch(`${endpoint}/printer/info`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    });

    if (!printerInfoResponse.ok) {
      throw new Error(`HTTP ${printerInfoResponse.status}`);
    }

    const printerInfo = await printerInfoResponse.json();

    // Richiesta per ottenere i dati di temperatura
    const temperatureResponse = await fetch(`${endpoint}/printer/objects/query?extruder&heater_bed&temperature_sensor`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    });

    if (!temperatureResponse.ok) {
      throw new Error(`HTTP ${temperatureResponse.status}`);
    }

    const temperatureData = await temperatureResponse.json();

    // Richiesta per ottenere lo stato di stampa
    const printStatusResponse = await fetch(`${endpoint}/printer/objects/query?print_stats`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {}
    });

    let printStats = null;
    if (printStatusResponse.ok) {
      printStats = await printStatusResponse.json();
    }

    const status: StampanteStatus = {
      stampante_id: stampante.id,
      stato: 'pronta',
      temperatura_nozzle: temperatureData.result?.status?.extruder?.temperature,
      temperatura_piatto: temperatureData.result?.status?.heater_bed?.temperature,
      ultimo_aggiornamento: new Date().toISOString()
    };

    // Determina lo stato basato sui dati
    if (printStats?.result?.status?.print_stats?.state === 'printing') {
      status.stato = 'in_stampa';
      status.percentuale_completamento = printStats.result.status.print_stats.progress * 100;
      status.tempo_rimanente = printStats.result.status.print_stats.print_duration;
      status.tempo_totale = printStats.result.status.print_stats.total_duration;
      status.nome_file_corrente = printStats.result.status.print_stats.filename;
    } else if (printStats?.result?.status?.print_stats?.state === 'paused') {
      status.stato = 'pausa';
    } else if (printStats?.result?.status?.print_stats?.state === 'error') {
      status.stato = 'errore';
    }

    return status;
  } catch (error) {
    console.error('Errore API Klipper:', error);
    return {
      stampante_id: stampante.id,
      stato: 'offline',
      ultimo_aggiornamento: new Date().toISOString()
    };
  }
}

// Funzione per generare dati mock per Klipper
function getMockKlipperStatus(stampanteId: number): StampanteStatus {
  const stati = ['pronta', 'in_stampa', 'pausa', 'errore'] as const;
  const stato = stati[Math.floor(Math.random() * stati.length)];
  
  const status: StampanteStatus = {
    stampante_id: stampanteId,
    stato,
    temperatura_nozzle: 200 + Math.random() * 20,
    temperatura_piatto: 60 + Math.random() * 10,
    ultimo_aggiornamento: new Date().toISOString()
  };

  if (stato === 'in_stampa') {
    status.percentuale_completamento = Math.random() * 100;
    status.tempo_rimanente = 1800 + Math.random() * 3600; // 30-90 minuti
    status.tempo_totale = 7200 + Math.random() * 7200; // 2-4 ore
    status.nome_file_corrente = `test_print_${stampanteId}.gcode`;
  }

  return status;
}

async function getBambuStatus(stampante: Stampante): Promise<StampanteStatus | null> {
  const endpoint = stampante.endpoint_api;
  const apiKey = stampante.api_key;

  // Per sviluppo, usa dati mock se l'endpoint non è configurato
  if (!endpoint || endpoint.includes('test')) {
    return getMockBambuStatus(stampante.id);
  }

  try {
    // Per Bambu Lab, dovremo implementare l'API specifica
    // Per ora restituiamo un mock - da implementare con l'API reale
    const response = await fetch(`${endpoint}/device/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const status: StampanteStatus = {
      stampante_id: stampante.id,
      stato: data.state || 'pronta',
      temperatura_nozzle: data.temperature?.nozzle,
      temperatura_piatto: data.temperature?.bed,
      percentuale_completamento: data.progress?.percentage,
      tempo_rimanente: data.progress?.remaining_time,
      tempo_totale: data.progress?.total_time,
      nome_file_corrente: data.current_file,
      ultimo_aggiornamento: new Date().toISOString()
    };

    return status;
  } catch (error) {
    console.error('Errore API Bambu:', error);
    return {
      stampante_id: stampante.id,
      stato: 'offline',
      ultimo_aggiornamento: new Date().toISOString()
    };
  }
}

// Funzione per generare dati mock per Bambu Lab
function getMockBambuStatus(stampanteId: number): StampanteStatus {
  const stati = ['pronta', 'in_stampa', 'pausa', 'errore'] as const;
  const stato = stati[Math.floor(Math.random() * stati.length)];
  
  const status: StampanteStatus = {
    stampante_id: stampanteId,
    stato,
    temperatura_nozzle: 210 + Math.random() * 15,
    temperatura_piatto: 65 + Math.random() * 5,
    ultimo_aggiornamento: new Date().toISOString()
  };

  if (stato === 'in_stampa') {
    status.percentuale_completamento = Math.random() * 100;
    status.tempo_rimanente = 2400 + Math.random() * 4800; // 40-120 minuti
    status.tempo_totale = 6000 + Math.random() * 6000; // 1.7-3.3 ore
    status.nome_file_corrente = `bambu_test_${stampanteId}.gcode`;
  }

  return status;
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