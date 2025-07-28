export interface Stampante {
  id: number;
  nome: string;
  modello?: string;
  seriale?: string;
  attiva: boolean;
  data_acquisto?: string;
  note?: string;
  // Campi per integrazione API
  tipo_sistema?: 'klipper' | 'bambu';
  endpoint_api?: string;
  api_key?: string;
}

// Dati in tempo reale della stampante
export interface StampanteStatus {
  stampante_id: number;
  stato: 'pronta' | 'in_stampa' | 'pausa' | 'errore' | 'offline';
  temperatura_nozzle?: number;
  temperatura_piatto?: number;
  temperatura_camera?: number;
  percentuale_completamento?: number;
  tempo_rimanente?: number; // in secondi
  tempo_totale?: number; // in secondi
  velocita_ventola?: number;
  velocita_estrusore?: number;
  nome_file_corrente?: string;
  ultimo_aggiornamento: string;
  error?: string; // Messaggio di errore se presente
}

// Configurazione API per diversi sistemi
export interface KlipperConfig {
  endpoint: string;
  api_key?: string;
}

export interface BambuConfig {
  endpoint: string;
  access_code: string;
  device_id: string;
} 