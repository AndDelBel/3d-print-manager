import { supabase } from '@/lib/supabaseClient'
import type { Gcode } from '@/types/gcode'

function cleanName(str: string): string {
  return str
    .normalize('NFD').replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
}

export async function listGcode({ file_origine_id, isSuperuser = false }: { file_origine_id?: number, isSuperuser?: boolean }): Promise<Gcode[]> {
  let query = supabase.from('gcode').select('*').order('data_caricamento', { ascending: false });
  
  if (file_origine_id) {
    query = query.eq('file_origine_id', file_origine_id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function uploadGcode(
  file: File,
  file_origine_id: number,
  metadati: Partial<Omit<Gcode, 'id' | 'file_origine_id' | 'nome_file' | 'user_id' | 'data_caricamento'>>
): Promise<void> {
  // Recupera utente
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
  const userId = userData.user.id

  // Recupera info file origine, commessa e organizzazione
  const { data: fileOrigine, error: fileErr } = await supabase
    .from('file_origine')
    .select('nome_file, commessa_id')
    .eq('id', file_origine_id)
    .single()
  if (fileErr || !fileOrigine) throw fileErr || new Error('File origine non trovato')
  const fileOrigineBase = cleanName(fileOrigine.nome_file.split('/').pop()?.split('.')[0] || 'origine')

  const { data: commessa, error: commErr } = await supabase
    .from('commessa')
    .select('nome, organizzazione_id')
    .eq('id', fileOrigine.commessa_id)
    .single()
  if (commErr || !commessa) throw commErr || new Error('Commessa non trovata')
  const commessaNome = cleanName(commessa.nome)

  const { data: org, error: orgErr } = await supabase
    .from('organizzazione')
    .select('nome')
    .eq('id', commessa.organizzazione_id)
    .single()
  if (orgErr || !org) throw orgErr || new Error('Organizzazione non trovata')
  const orgNome = cleanName(org.nome)

  // Mantieni il nome completo del file originale, sostituisci solo gli spazi
  const gcodeFileName = file.name.replace(/\s+/g, '_')
  
  // Path: [nome_organizzazione]/[nome_commessa]/[nomefilestl]/[nomefilecompleto]
  const storageKey = `${orgNome}/${commessaNome}/${fileOrigineBase}/${gcodeFileName}`

  // Upload su storage
  const { error: upErr } = await supabase.storage.from('files').upload(storageKey, file, { upsert: false })
  if (upErr) {
    if (upErr.message && upErr.message.includes('The resource already exists')) {
      throw new Error('Esiste già un G-code con questo nome per questo file. Rinomina il file o elimina quello esistente.')
    }
    throw upErr
  }

  // Insert DB
  const { error: dbErr } = await supabase
    .from('gcode')
    .insert([{
      file_origine_id,
      nome_file: storageKey,
      user_id: userId,
      data_caricamento: new Date().toISOString(),
      ...metadati
    }])
  if (dbErr) throw dbErr
}

export async function deleteGcode(id: number): Promise<void> {
  const { error } = await supabase
    .from('gcode')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getGcodeDownloadUrl(path: string): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from('files')
    .createSignedUrl(path, 60) // 60 secondi di validità
  if (error || !data) throw error || new Error('URL non disponibile')
  return data.signedUrl
} 