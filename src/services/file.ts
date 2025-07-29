// src/services/file.ts
import { supabase } from '@/lib/supabaseClient'
import type { FileRecord } from '@/types/file'

// Get user organizations for permission checks
export async function listUserOrgs() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')

  const { data, error } = await supabase
    .from('organizzazioni_utente')
    .select(`
      organizzazione_id,
      role,
      is_admin,
      organizzazione!inner(id, nome)
    `)
    .eq('user_id', userData.user.id)

  if (error) throw error
  return data?.map(item => {
    // Handle both single object and array responses from the join
    const org = Array.isArray(item.organizzazione) ? item.organizzazione[0] : item.organizzazione
    return {
      id: org?.id || item.organizzazione_id,
      nome: org?.nome || 'Unknown',
      role: item.role,
      is_admin: item.is_admin
    }
  }) || []
}

// Get commesse for a specific organization (optimized)
export async function listCommesseByOrg(organizationId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('commessa')
    .select('nome')
    .eq('organizzazione_id', organizationId)
    .order('nome')

  if (error) throw error
  return data?.map(c => (c as { nome: string }).nome) || []
}

// Legacy function for compatibility
export async function listFilesByOrgAndComm(
  orgId: number,
  commessa: string,
  tipi: string[] = ['stl', 'step', 'gcode', 'gcode.3mf']
): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(`
      id,
      nome_file,
      commessa,
      descrizione,
      data_caricamento,
      tipo,
      organizzazione_id,
      user_id,
      gcode_principale_id,
      is_superato,
      gcode_nome_file
    `)
    .eq('organizzazione_id', orgId)
    .eq('commessa', commessa)
    .in('tipo', tipi)
    .order('data_caricamento', { ascending: false })

  if (error) throw error
  return (data as FileRecord[]) || []
}

// Optimized file upload with better error handling
export async function uploadFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number
): Promise<void> {
  // Get user in parallel with org data
  const [userResult, orgResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('organizzazione')
      .select('nome')
      .eq('id', organizzazione_id)
      .single()
  ])

  if (userResult.error || !userResult.data.user) {
    throw userResult.error || new Error('Utente non autenticato')
  }
  if (orgResult.error || !orgResult.data) {
    throw orgResult.error || new Error('Organizzazione non trovata')
  }

  const userId = userResult.data.user.id
  const orgName = (orgResult.data as { nome: string }).nome.replace(/\s+/g, '_').toLowerCase()

  // Optimize file processing
  const originalBase = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
  const ext = file.name.split('.').pop() || ''
  const timestamp = Date.now()
  const storageKey = `${orgName}/${commessa}/${originalBase}.${timestamp}.${ext}`

  // Parallel upload and DB insert preparation
  const uploadPromise = supabase
    .storage
    .from('files')
    .upload(storageKey, file, { upsert: false })

  const { error: upErr } = await uploadPromise
  if (upErr) throw upErr

  // Insert DB record
  const { error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file: storageKey,
      commessa,
      descrizione,
      user_id: userId,
      organizzazione_id,
      tipo: ext === 'stl' ? 'stl' : ext === 'step' ? 'step' : 'stl'
    }])
  if (dbErr) throw dbErr
}

// Optimized file listing with specific columns and joins
export async function listFiles(): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(`
      id,
      nome_file,
      commessa,
      descrizione,
      data_caricamento,
      tipo,
      organizzazione_id,
      user_id,
      gcode_principale_id,
      is_superato,
      gcode_nome_file
    `)
    .order('data_caricamento', { ascending: false })

  if (error) throw error
  return data?.map(item => ({
    ...(item as FileRecord),
    is_superato: (item as FileRecord & { is_superato?: boolean }).is_superato || false
  })) || []
}

// Optimized files by organization with pagination
export async function listFilesByOrganization(
  organizationId: number,
  limit: number = 50,
  offset: number = 0
): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(`
      id,
      nome_file,
      commessa,
      descrizione,
      data_caricamento,
      tipo,
      organizzazione_id,
      user_id,
      gcode_principale_id,
      is_superato,
      gcode_nome_file
    `)
    .eq('organizzazione_id', organizationId)
    .order('data_caricamento', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data?.map(item => ({
    ...(item as FileRecord),
    is_superato: (item as FileRecord & { is_superato?: boolean }).is_superato || false
  })) || []
}

// Cached download URL with optimized signed URL
const urlCache = new Map<string, { url: string; expires: number }>()

export async function getDownloadUrl(nome_file: string): Promise<string> {
  const now = Date.now()
  const cached = urlCache.get(nome_file)
  
  // Return cached URL if still valid (with 5 minute buffer)
  if (cached && cached.expires > now + 300000) {
    return cached.url
  }

  const { data, error } = await supabase
    .storage
    .from('files')
    .createSignedUrl(nome_file, 3600) // 1 hour validity
    
  if (error || !data) throw error || new Error('URL non disponibile')
  
  // Cache the URL
  urlCache.set(nome_file, {
    url: data.signedUrl,
    expires: now + 3600000 // 1 hour
  })
  
  // Clean old cache entries periodically
  if (urlCache.size > 100) {
    for (const [key, value] of urlCache.entries()) {
      if (value.expires <= now) {
        urlCache.delete(key)
      }
    }
  }
  
  return data.signedUrl
}

// Optimized G-code upload with better error handling
export async function uploadGcodeFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number,
  organizzazione_nome: string,
  originalBase: string
): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')

  const userId = userData.user.id
  const timestamp = Date.now()
  const storageKey = `${organizzazione_nome}/${commessa}/${originalBase}.${timestamp}.gcode.3mf`

  // Parallel upload and prepare DB insert
  const { error: upErr } = await supabase
    .storage
    .from('files')
    .upload(storageKey, file, { upsert: false })
  if (upErr) throw upErr

  const { data, error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file: storageKey,
      commessa,
      descrizione,
      user_id: userId,
      organizzazione_id,
      tipo: 'gcode.3mf'
    }])
    .select('nome_file')
    .single()

  if (dbErr || !data) throw dbErr || new Error('Upload record fallito')
  return (data as { nome_file: string }).nome_file
}

// Optimized G-code association
export async function associateGcodeFile(
  originalNome: string,
  gcodePath: string
): Promise<void> {
  // Get G-code file ID first
  const { data: gcodeData, error: gcodeError } = await supabase
    .from('file')
    .select('id')
    .eq('nome_file', gcodePath)
    .eq('tipo', 'gcode.3mf')
    .single()

  if (gcodeError || !gcodeData) {
    throw gcodeError || new Error('File G-code non trovato')
  }

  // Update original file with G-code association
  const { error: updateError } = await supabase
    .from('file')
    .update({ gcode_principale_id: gcodeData.id })
    .eq('nome_file', originalNome)

  if (updateError) throw updateError
}

// Bulk delete files with transaction-like behavior
export async function deleteFiles(fileIds: number[]): Promise<void> {
  // Get file paths for storage cleanup
  const { data: files, error: selectError } = await supabase
    .from('file')
    .select('nome_file')
    .in('id', fileIds)

  if (selectError) throw selectError

  // Delete from storage first
  if (files && files.length > 0) {
    const { error: storageError } = await supabase
      .storage
      .from('files')
      .remove(files.map(f => (f as { nome_file: string }).nome_file))
    
    if (storageError) throw storageError
  }

  // Then delete from database
  const { error: dbError } = await supabase
    .from('file')
    .delete()
    .in('id', fileIds)

  if (dbError) throw dbError

  // Clear relevant cache entries
  files?.forEach(f => urlCache.delete((f as { nome_file: string }).nome_file))
}

// Get file metadata without downloading
export async function getFileMetadata(nome_file: string): Promise<FileRecord | null> {
  const { data, error } = await supabase
    .from('file')
    .select(`
      id,
      nome_file,
      commessa,
      descrizione,
      data_caricamento,
      tipo,
      organizzazione_id,
      user_id,
      gcode_principale_id,
      is_superato
    `)
    .eq('nome_file', nome_file)
    .single()

  if (error) throw error
  return data ? {
    ...(data as FileRecord),
    is_superato: (data as FileRecord & { is_superato?: boolean }).is_superato || false,
    gcode_nome_file: null
  } : null
}
