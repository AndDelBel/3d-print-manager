// src/types/file.ts
export interface FileRecord {
  nome_file:        string
  commessa:         string
  descrizione?:     string | null
  organizzazione_id:number
  user_id:          string
  tipo:             'stl' | 'step' | 'gcode' | 'gcode.3mf'
  data_caricamento: string
  gcode_nome_file?: string | null
  is_superato:      boolean   // ← nuova proprietà
}