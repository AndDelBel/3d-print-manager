// src/services/file.ts
import { supabase } from '@/lib/supabaseClient'
import type { FileRecord } from '@/types/file'



// 1) Elenca tutte le commesse esistenti con path organizzazione/commessa
export async function listCommesse(): Promise<string[]> {
  // 1.1) Preleva tutte le coppie commessa + organizzazione_id
  const { data: rows, error: rowsErr } = await supabase
    .from('file')
    .select('commessa, organizzazione_id')
  if (rowsErr) throw rowsErr

  // 1.2) Deduplica le coppie in memoria
  const seen = new Set<string>()
  const uniquePairs = rows!.filter(r => {
    const key = `${r.organizzazione_id}:${r.commessa}`
    return seen.has(key) ? false : (seen.add(key), true)
  })

  // 1.3) Prendi tutti gli organizzazione_id unici
  const orgIds = Array.from(new Set(uniquePairs.map(r => r.organizzazione_id)))

  // 1.4) Preleva i nomi di quelle organizzazioni
  const { data: orgs, error: orgErr } = await supabase
    .from('organizzazione')
    .select('id, nome')
    .in('id', orgIds)
  if (orgErr) throw orgErr

  // 1.5) Mappa id → clean nome
  const mapOrg = new Map(
    orgs!.map(o => [o.id, o.nome.replace(/\s+/g, '_').toLowerCase()])
  )

  // 1.6) Costruisci e ritorna gli string path “organizzazione/commessa”
  return uniquePairs.map(r => {
    const orgName = mapOrg.get(r.organizzazione_id) ?? 'unknown'
    return `${orgName}/${r.commessa}`
  })
}

// 1) Carica un file su Storage e crea record in DB
export async function uploadFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number
): Promise<void> {
  // Recupera utente
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
  const userId = userData.user.id

  // Clean basename
  const originalBase = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
  const ext = file.name.split('.').pop() || ''
  const timestamp = Date.now()

  // Path su storage: organization/commessa/filename
  // Ricaviamo il nome org
  const { data: orgData, error: orgErr } = await supabase
    .from('organizzazione')
    .select('nome')
    .eq('id', organizzazione_id)
    .single()
  if (orgErr || !orgData) throw orgErr || new Error('Organizzazione non trovata')
  const orgName = orgData.nome.replace(/\s+/g, '_').toLowerCase()

  const storageKey = `${orgName}/${commessa}/${originalBase}.${timestamp}.${ext}`

  // Upload
  const { error: upErr } = await supabase
    .storage
    .from('files')
    .upload(storageKey, file, { upsert: false })
  if (upErr) throw upErr

  // Insert DB (tutti i campi richiesti dal modello SQL)
  const { error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file: storageKey,
      commessa,
      descrizione,
      organizzazione_id,
      user_id: userId,
      tipo: ext === 'stl' ? 'stl' : ext === 'step' ? 'step' : 'stl',
      gcode_nome_file: null,
      is_superato: false,
      data_caricamento: new Date().toISOString(),
    }])
  if (dbErr) throw dbErr
}



// 2) Lista file per l'utente (RLS fa il resto)
export async function listFiles(): Promise<FileRecord[]> {
  console.log('listFiles chiamato');
  
  // Non serve più filtrare manualmente il tipo: RLS fa il suo lavoro.
  const { data, error } = await supabase
    .from('file')
    .select('*')
    .order('data_caricamento', { ascending: false });
  
  if (error) {
    console.error('Errore caricamento file:', error);
    throw error;
  }
  
  console.log('File caricati:', data);
  return data || [];
}

// 3) Ottieni signed URL per il download
export async function getDownloadUrl(nome_file: string): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from('files')
    .createSignedUrl(nome_file, 60)  // 60 sec di validità
  if (error || !data) throw error || new Error('URL non disponibile')
  return data.signedUrl
}

// 0) Elenca le commesse per una specifica organizzazione
export async function listCommesseByOrg(orgId: number): Promise<string[]> {
  // Preleva tutte le righe con quella organizzazione
  const { data: rows, error } = await supabase
    .from('file')
    .select('commessa')
    .eq('organizzazione_id', orgId)
  if (error) throw error

  // Deduplica in memoria
  const commesse = rows?.map(r => r.commessa) || []
  return Array.from(new Set(commesse))
}


export async function listFilesByOrgAndComm(
  orgId: number,
  commessa: string,
  tipi: string[] = ['stl', 'step', 'gcode', 'gcode.3mf']
): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select('*')
    .eq('organizzazione_id', orgId)
    .eq('commessa', commessa)
    .in('tipo', tipi)
    .order('data_caricamento', { ascending: false })
  if (error) throw error
  return data || []
}


// src/services/file.ts
export async function uploadGcodeFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number,
  organizzazione_nome: string,
  originalBase: string
): Promise<string> {
  // 1) prendi userId
  const { data: ud, error: ue } = await supabase.auth.getUser()
  if (ue || !ud.user) throw ue || new Error('Utente non autenticato')
  const userId = ud.user.id

  // 2) costruisci storageKey con nome-org e originalBase
  const timestamp = Date.now()
  const storageKey = `${organizzazione_nome}/${commessa}/${originalBase}.${timestamp}.gcode.3mf`

  // 3) upload
  const { error: upErr } = await supabase
    .storage.from('files')
    .upload(storageKey, file, { upsert: false })
  if (upErr) throw upErr

  // 4) inserisci record DB (tutti i campi richiesti dal modello SQL)
  const { data, error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file:         storageKey,
      commessa,
      descrizione,
      organizzazione_id,
      user_id:           userId,
      tipo:              'gcode.3mf',
      gcode_nome_file:   null,
      is_superato:       false,
      data_caricamento:  new Date().toISOString(),
    }])
    .select('nome_file')
    .single()

  if (dbErr || !data) throw dbErr || new Error('Upload record fallito')
  return data.nome_file
}


export async function markFileSuperato(nome_file: string): Promise<void> {
  const { error } = await supabase
    .from('file')
    .update({ is_superato: true })
    .eq('nome_file', nome_file)

  if (error) throw error
}

export async function deleteFile(nome_file: string): Promise<void> {
  const { error } = await supabase
    .from('file')
    .delete()
    .eq('nome_file', nome_file)
  if (error) throw error
}
