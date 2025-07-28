export interface Ordine {
  id: number
  stato: 'pending' | 'printing' | 'done' | 'completed'
  file_ordinato: string       // nome_file da `file`
  consegna_richiesta?: string  // in ISO date (optional)
  quantita: number
  data_ordine: string         // timestamp
}