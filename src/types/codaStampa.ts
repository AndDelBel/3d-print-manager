export interface CodaStampa {
  id: number;
  ordine_id: number;
  stampante_id: number;
  posizione: number;
  stato: 'in_coda' | 'in_stampa' | 'pronto' | 'error';
  data_inizio?: string;
  data_fine?: string;
  note?: string;
} 