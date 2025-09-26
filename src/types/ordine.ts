export interface Ordine {
  id: number;
  stato: 'processamento' | 'in_coda' | 'in_stampa' | 'pronto' | 'consegnato' | 'error';
  gcode_id: number | null; // FK su gcode (opzionale)
  file_origine_id?: number; // FK su file_origine (opzionale per compatibilità)
  commessa_id: number;
  organizzazione_id: number;
  user_id: string;
  quantita: number;
  consegna_richiesta?: string | null;
  note?: string | null;
  data_ordine: string;
  data_inizio?: string | null; // Timestamp di inizio stampa
  data_fine?: string | null; // Timestamp di fine stampa
}

// Extended type for analytics with relations
export interface OrdineWithRelations extends Ordine {
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
}