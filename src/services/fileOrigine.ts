import { supabase } from '@/lib/supabaseClient'
import type { FileOrigine } from '@/types/fileOrigine'

function cleanName(str: string): string {
  return str
    .normalize('NFD').replace(/[^\w\s-]/g, '') // rimuove accenti e caratteri speciali
    .replace(/\s+/g, '_')
    .toLowerCase()
}

export async function listFileOrigine({ commessa_id, organizzazione_id, isSuperuser = false }: { commessa_id?: number, organizzazione_id?: number, isSuperuser?: boolean }): Promise<FileOrigine[]> {
  let query = supabase.from('file_origine').select('*').order('data_caricamento', { ascending: false });
  
  // Se viene specificata una commessa, filtra sempre per quella commessa
  if (commessa_id) {
    query = query.eq('commessa_id', commessa_id);
  }
  // Se viene specificata un'organizzazione (per non-superuser), filtra per organizzazione
  else if (organizzazione_id && !isSuperuser) {
    // Join con commessa per filtrare per organizzazione
    query = supabase
      .from('file_origine')
      .select(`
        *,
        commessa!inner(organizzazione_id)
      `)
      .eq('commessa.organizzazione_id', organizzazione_id)
      .order('data_caricamento', { ascending: false });
  }
  // Altrimenti, se non è superuser, non dovrebbe vedere nulla (per sicurezza)
  else if (!isSuperuser) {
    // Per utenti non superuser senza commessa o organizzazione specificata, non mostrare nulla
    return [];
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listFileOrigineByIds(ids: number[]): Promise<FileOrigine[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('file_origine')
    .select('*')
    .in('id', ids)
  if (error) throw error;
  return data || [];
}

export async function uploadFileOrigine(
  file: File,
  commessa_id: number,
  descrizione: string | null
): Promise<void> {
  // Recupera utente
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
  const userId = userData.user.id

  // Recupera nome commessa e organizzazione
  const { data: commessa, error: commErr } = await supabase
    .from('commessa')
    .select('nome, organizzazione_id')
    .eq('id', commessa_id)
    .single()
  if (commErr || !commessa) throw commErr || new Error('Commessa non trovata')
  const commessaNome = cleanName(commessa.nome)

  // Recupera nome organizzazione
  const { data: org, error: orgErr } = await supabase
    .from('organizzazione')
    .select('nome')
    .eq('id', commessa.organizzazione_id)
    .single()
  if (orgErr || !org) throw orgErr || new Error('Organizzazione non trovata')
  const orgNome = cleanName(org.nome)

  // Clean basename
  const originalBase = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_').toLowerCase()
  const ext = file.name.split('.').pop() || ''
  // Path: [nome_organizzazione]/[nome_commessa]/[nomefile].[ext]
  const storageKey = `${orgNome}/${commessaNome}/${originalBase}.${ext}`

  // Upload su storage
  const { error: upErr } = await supabase.storage.from('files').upload(storageKey, file, { upsert: false })
  if (upErr) {
    if (upErr.message && upErr.message.includes('The resource already exists')) {
      throw new Error('Esiste già un file con questo nome nella commessa. Rinomina il file o elimina quello esistente.')
    }
    throw upErr
  }

  // Insert DB
  const { error: dbErr } = await supabase
    .from('file_origine')
    .insert([{
      nome_file: storageKey,
      commessa_id,
      descrizione,
      user_id: userId,
      tipo: ext === 'stl' ? 'stl' : 'step',
      data_caricamento: new Date().toISOString(),
    }])
  console.log('uploadFileOrigine', { commessa_id, userId, storageKey, ext, descrizione });
  if (dbErr) throw dbErr
}

export async function deleteFileOrigine(id: number): Promise<void> {
  const { error } = await supabase
    .from('file_origine')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function setGcodePrincipale(file_origine_id: number, gcode_id: number | null): Promise<void> {
  const { error } = await supabase
    .from('file_origine')
    .update({ gcode_principale_id: gcode_id })
    .eq('id', file_origine_id)
  if (error) throw error
}

export async function getGcodePrincipale(file_origine_id: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('file_origine')
    .select('gcode_principale_id')
    .eq('id', file_origine_id)
    .single()
  if (error) throw error
  return data?.gcode_principale_id || null
}

export async function getFileOrigineDownloadUrl(nome_file: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('files')
    .createSignedUrl(nome_file, 60) // URL valido per 60 secondi
  if (error) throw error
  return data.signedUrl
} 