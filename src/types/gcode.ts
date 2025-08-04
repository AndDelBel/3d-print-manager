export interface Gcode {
  id: number;
  file_origine_id: number;
  nome_file: string; // path su storage
  user_id: string;
  data_caricamento: string;
  peso_grammi?: number;
  tempo_stampa_min?: number;
  materiale?: string;
  stampante?: string; // Nome della stampante estratto dal file
  note?: string;
} 