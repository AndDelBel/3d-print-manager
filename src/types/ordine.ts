export interface Ordine {
  id: number
  file_ordinato: string
  quantita: number
  stato: 'processamento' | 'in_coda' | 'in_stampa' | 'pronto' | 'consegnato'
  data_ordine: string
  consegna_richiesta?: string | null
  note?: string | null
  user_id: string
  organizzazione_id: number
}