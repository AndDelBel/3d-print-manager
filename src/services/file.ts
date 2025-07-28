// src/services/file.ts
import { supabase } from '@/lib/supabaseClient'
import type { FileRecord } from '@/types/file'

// Type for join result from Supabase
interface FileWithOrgArray {
  commessa: string
  organizzazione: { nome: string }[]
}

// Optimized: single query with join instead of multiple queries
export async function listCommesse(): Promise<string[]> {
  const { data, error } = await supabase
    .from('file')
    .select(`
      commessa,
      organizzazione:organizzazione_id!inner(nome)
    `)
  
  if (error) throw error

  // Process results efficiently
  const seen = new Set<string>()
  const commesse: string[] = []

  for (const row of (data as FileWithOrgArray[]) || []) {
    if (row.organizzazione && row.organizzazione.length > 0 && row.commessa) {
      const orgName = row.organizzazione[0]?.nome?.replace(/\s+/g, '_').toLowerCase()
      if (orgName) {
        const path = `${orgName}/${row.commessa}`
        
        if (!seen.has(path)) {
          seen.add(path)
          commesse.push(path)
        }
      }
    }
  }

  return commesse
}

// Optimized fields selection
const FILE_FIELDS = `
  id,
  nome_file,
  commessa,
  descrizione,
  user_id,
  organizzazione_id,
  tipo,
  data_caricamento,
  is_superato,
  gcode_nome_file
` as const

// Cache for organization names to avoid repeated queries
const orgNameCache = new Map<number, string>()

async function getOrgName(orgId: number): Promise<string> {
  if (orgNameCache.has(orgId)) {
    return orgNameCache.get(orgId)!
  }

  const { data, error } = await supabase
    .from('organizzazione')
    .select('nome')
    .eq('id', orgId)
    .single()
  
  if (error || !data) throw error || new Error('Organizzazione non trovata')
  
  const cleanName = data.nome.replace(/\s+/g, '_').toLowerCase()
  orgNameCache.set(orgId, cleanName)
  return cleanName
}

// Optimized: select only necessary fields
export async function listFiles(): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(FILE_FIELDS)
    .order('data_caricamento', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function listFilesByType(types: string[]): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(FILE_FIELDS)
    .in('tipo', types)
    .order('data_caricamento', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Optimized: single query instead of multiple calls
export async function uploadFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number
): Promise<void> {
  // Get user and org name in parallel
  const [userResult, orgName] = await Promise.all([
    supabase.auth.getUser(),
    getOrgName(organizzazione_id)
  ])

  const { data: userData, error: userError } = userResult
  if (userError || !userData.user) {
    throw userError || new Error('Utente non autenticato')
  }

  // Optimize file path creation
  const fileExt = file.name.split('.').pop() || ''
  const originalBase = file.name
    .slice(0, file.name.lastIndexOf('.'))
    .replace(/\s+/g, '_')
    .toLowerCase()
  
  const timestamp = Date.now()
  const storageKey = `${orgName}/${commessa}/${originalBase}.${timestamp}.${fileExt}`

  // Upload and insert in parallel where possible
  const { error: upErr } = await supabase
    .storage
    .from('files')
    .upload(storageKey, file, { upsert: false })
  
  if (upErr) throw upErr

  // Determine file type more efficiently
  const tipo = fileExt === 'stl' ? 'stl' : fileExt === 'step' ? 'step' : 'stl'

  const { error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file: storageKey,
      commessa,
      descrizione,
      user_id: userData.user.id,
      organizzazione_id,
      tipo
    }])
  
  if (dbErr) throw dbErr
}

// Cached URL generation
const urlCache = new Map<string, { url: string, expires: number }>()

export async function getDownloadUrl(nome_file: string): Promise<string> {
  const now = Date.now()
  const cached = urlCache.get(nome_file)
  
  // Return cached URL if still valid (with 5 second buffer)
  if (cached && cached.expires > now + 5000) {
    return cached.url
  }

  const { data, error } = await supabase
    .storage
    .from('files')
    .createSignedUrl(nome_file, 300) // 5 minutes validity
  
  if (error || !data) throw error || new Error('URL non disponibile')
  
  // Cache the URL
  urlCache.set(nome_file, {
    url: data.signedUrl,
    expires: now + 300000 // 5 minutes
  })
  
  return data.signedUrl
}

// Optimized: use distinct instead of manual deduplication
export async function listCommesseByOrg(orgId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('file')
    .select('commessa')
    .eq('organizzazione_id', orgId)
    .order('commessa')
  
  if (error) throw error
  
  // Use Set for efficient deduplication
  return Array.from(new Set(data?.map(r => r.commessa) || []))
}

export async function listFilesByOrgAndComm(
  orgId: number,
  commessa: string,
  tipi: string[] = ['stl', 'step', 'gcode', 'gcode.3mf']
): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('file')
    .select(FILE_FIELDS)
    .eq('organizzazione_id', orgId)
    .eq('commessa', commessa)
    .in('tipo', tipi)
    .order('data_caricamento', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Optimized gcode upload with cached org name
export async function uploadGcodeFile(
  file: File,
  commessa: string,
  descrizione: string | null,
  organizzazione_id: number,
  organizzazione_nome: string,
  originalBase: string
): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw userError || new Error('Utente non autenticato')
  }

  const timestamp = Date.now()
  const storageKey = `${organizzazione_nome}/${commessa}/${originalBase}.${timestamp}.gcode.3mf`

  // Upload file
  const { error: upErr } = await supabase
    .storage
    .from('files')
    .upload(storageKey, file, { upsert: false })
  
  if (upErr) throw upErr

  // Insert record and return the filename
  const { data, error: dbErr } = await supabase
    .from('file')
    .insert([{
      nome_file: storageKey,
      commessa,
      descrizione,
      user_id: userData.user.id,
      organizzazione_id,
      tipo: 'gcode.3mf'
    }])
    .select('nome_file')
    .single()

  if (dbErr || !data) throw dbErr || new Error('Upload record fallito')
  return data.nome_file
}

export async function associateGcodeFile(
  originalNome: string,
  gcodeNome: string
): Promise<void> {
  const { error } = await supabase
    .from('file')
    .update({ gcode_nome_file: gcodeNome })
    .eq('nome_file', originalNome)
  
  if (error) throw error
}

export async function markFileSuperato(nome_file: string): Promise<void> {
  const { error } = await supabase
    .from('file')
    .update({ is_superato: true })
    .eq('nome_file', nome_file)

  if (error) throw error
}

// Batch operations for better performance
export async function markMultipleFilesSuperato(nome_files: string[]): Promise<void> {
  const { error } = await supabase
    .from('file')
    .update({ is_superato: true })
    .in('nome_file', nome_files)

  if (error) throw error
}

// Clean up expired URLs from cache periodically
export function cleanUrlCache(): void {
  const now = Date.now()
  for (const [key, value] of urlCache.entries()) {
    if (value.expires <= now) {
      urlCache.delete(key)
    }
  }
}
