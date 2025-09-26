// La coda di stampa ora è un filtro degli ordini con stati specifici
export type CodaStampaStato = 'in_coda' | 'in_stampa' | 'pronto' | 'consegnato' | 'error';

// Tipo per gli ordini in coda con relazioni estese
export interface OrdineInCoda {
  id: number;
  stato: CodaStampaStato;
  gcode_id: number | null;
  file_origine_id?: number; // Opzionale per compatibilità
  commessa_id: number;
  organizzazione_id: number;
  user_id: string;
  quantita: number;
  consegna_richiesta?: string | null;
  note?: string | null;
  data_ordine: string;
  data_inizio?: string | null; // Timestamp di inizio stampa
  data_fine?: string | null; // Timestamp di fine stampa
  
  // Relazioni (Supabase restituisce array per le relazioni)
  gcode?: {
    id: number;
    nome_file: string;
    peso_grammi?: number;
    tempo_stampa_min?: number;
    materiale?: string;
    stampante?: string;
  }[];
  file_origine?: {
    id: number;
    nome_file: string;
    descrizione?: string | null;
  }[];
  commessa?: {
    id: number;
    nome: string;
  }[];
  organizzazione?: {
    id: number;
    nome: string;
  }[];
  stampante?: {
    id: number;
    nome: string;
    modello?: string;
    attiva: boolean;
  }[];
} 