export interface FileOrigine {
  id: number;
  nome_file: string; // path su storage
  commessa_id: number;
  descrizione: string | null;
  user_id: string;
  data_caricamento: string;
  tipo: 'stl' | 'step';
  gcode_principale_id?: number | null; // FK su gcode, indica il G-code principale
} 