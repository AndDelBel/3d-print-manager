export interface Organizzazione {
  id: number
  nome: string
  created_at: string
}

export interface OrganizzazioniUtente {
  user_id: string; // uuid FK > utente.id
  organizzazione_id: number; // FK > organizzazione.id
  role: string; // default 'user'
}