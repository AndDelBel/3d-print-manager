import { supabase } from '@/lib/supabaseClient'
import type { Stampante, StampanteStatus } from '@/types/stampante'

export async function listStampanti({ userId, isSuperuser = false }: { userId?: string, isSuperuser?: boolean } = {}): Promise<Stampante[]> {
  console.log('listStampanti chiamato con:', { userId, isSuperuser });
  
  // Le RLS policies gestiscono automaticamente l'accesso basato su organizzazione
  // Per superuser: vede tutte le stampanti
  // Per utenti normali: vede solo le stampanti della propria organizzazione
  const { data, error } = await supabase
    .from('stampante')
    .select('*')
    .order('id', { ascending: false });
  
  if (error) {
    console.error('Errore caricamento stampanti:', error);
    throw error;
  }
  
  console.log('Stampanti caricate:', data);
  return data || [];
}

// Funzioni per API stampanti
export async function getStampanteStatus(stampante: Stampante): Promise<StampanteStatus | null> {
  try {
    // Usa l'API route del server per evitare problemi CORS
    const response = await fetch(`/api/stampanti/${stampante.id}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const status = await response.json();
    
    // Se c'è un errore nella risposta, restituisci null
    if (status.error) {
      console.error(`Errore API stampante ${stampante.nome}:`, status.error);
      return {
        stampante_id: stampante.id,
        stato: 'offline',
        ultimo_aggiornamento: new Date().toISOString(),
        error: status.error
      };
    }

    return status;
  } catch (error) {
    console.error(`Errore nel recupero status stampante ${stampante.nome}:`, error);
    return {
      stampante_id: stampante.id,
      stato: 'offline',
      ultimo_aggiornamento: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Errore di connessione'
    };
  }
}









// Funzioni CRUD per stampanti
export async function createStampante(stampanteData: Partial<Stampante>): Promise<Stampante> {
  const { data, error } = await supabase
    .from('stampante')
    .insert([stampanteData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateStampante(id: number, stampanteData: Partial<Stampante>): Promise<Stampante> {
  const { data, error } = await supabase
    .from('stampante')
    .update(stampanteData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStampante(id: number): Promise<void> {
  const { error } = await supabase
    .from('stampante')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getStampanteById(id: number): Promise<Stampante | null> {
  const { data, error } = await supabase
    .from('stampante')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
} 