export interface Ordine {
  id: number;
  stato: 'processamento' | 'in_coda' | 'in_stampa' | 'pronto' | 'consegnato';
  gcode_id: number; // FK su gcode
  commessa_id: number;
  organizzazione_id: number;
  user_id: string;
  quantita: number;
  consegna_richiesta?: string | null;
  note?: string | null;
  data_ordine: string;
}