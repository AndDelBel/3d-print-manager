export interface CodaStampa {
  id: number;
  ordine_id: number;
  stampante_id: number;
  posizione: number;
  stato: 'in_queue' | 'printing' | 'done' | 'error';
  data_inizio?: string;
  data_fine?: string;
  note?: string;
}

// Tipo esteso con relazioni per la UI
export interface CodaStampaWithRelations extends CodaStampa {
  ordine?: {
    id: number;
    quantita: number;
    stato: string;
    gcode_id: number;
    commessa_id: number;
    organizzazione_id: number;
  };
  stampante?: {
    id: number;
    nome: string;
    modello?: string;
    attiva: boolean;
  };
  gcode?: {
    id: number;
    nome_file: string;
    peso_grammi?: number;
    tempo_stampa_min?: number;
    materiale?: string;
  };
  commessa?: {
    id: number;
    nome: string;
  };
  organizzazione?: {
    id: number;
    nome: string;
  };
} 