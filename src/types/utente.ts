export interface Utente {
  id: string; // uuid PK
  email: string;
  nome: string;
  cognome: string;
  created_at: string;
  is_superuser: boolean;
}
