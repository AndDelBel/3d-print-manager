// Questo file è deprecato: usa FileOrigine e Gcode separati secondo il nuovo schema ottimizzato.

export interface FileRecord {
  id: number;
  nome_file: string;
  commessa: string;
  descrizione: string | null;
  organizzazione_id: number;
  user_id: string;
  tipo: 'stl' | 'step';
  gcode_nome_file: string | null;
  is_superato: boolean;
  data_caricamento: string;
}