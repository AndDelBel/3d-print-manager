import { supabase } from '@/lib/supabaseClient'
import type { Gcode } from '@/types/gcode'
import { analyzeGcodeFile, type GcodeAnalysis } from '@/utils/gcodeParser'

function cleanName(str: string): string {
  return str
    .normalize('NFD').replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
}

export async function listGcode({ file_origine_id }: { file_origine_id?: number }): Promise<Gcode[]> {
  let query = supabase.from('gcode').select('*').order('data_caricamento', { ascending: false });
  
  if (file_origine_id) {
    query = query.eq('file_origine_id', file_origine_id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createProvisionalGcode(file_origine_id: number): Promise<number> {
  // Recupera utente
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError || new Error('Utente non autenticato')
  const userId = userData.user.id

  // Recupera info file origine per creare un nome provvisorio
  const { data: fileOrigine, error: fileErr } = await supabase
    .from('file_origine')
    .select('nome_file')
    .eq('id', file_origine_id)
    .single()
  if (fileErr || !fileOrigine) throw fileErr || new Error('File origine non trovato')

  // Crea un nome provvisorio per il G-code
  const fileBaseName = fileOrigine.nome_file.split('/').pop()?.split('.')[0] || 'origine'
  const provisionalName = `PROVVISORIO_${fileBaseName}_${Date.now()}.gcode`

  // Crea il G-code provvisorio
  const gcodeData = {
    file_origine_id,
    nome_file: provisionalName,
    user_id: userId,
    data_caricamento: new Date().toISOString(),
    note: 'G-code provvisorio - da sostituire con il file reale'
  }

  const { data, error } = await supabase
    .from('gcode')
    .insert([gcodeData])
    .select('id')
    .single()
  
  if (error) throw error
  return data.id
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

  // Analizza il G-code per estrarre informazioni automaticamente
  let gcodeAnalysis: GcodeAnalysis | null = null
  let gcodeMetadata: Record<string, string | undefined> | null = null
  
  try {
    // Determina il tipo di file e analizzalo di conseguenza
    const fileName = file.name.toLowerCase()
    
    if (fileName.endsWith('.gcode.3mf')) {
      // Per file .gcode.3mf, estrai anche i metadati
      const { extractGcodeMetadata } = await import('@/utils/gcodeParser')
      gcodeMetadata = await extractGcodeMetadata(file)
    }
    
    console.log('🔥 [GCODE SERVICE] Chiamando analyzeGcodeFile...')
    gcodeAnalysis = await analyzeGcodeFile(file)
    console.log('🔥 [GCODE SERVICE] analyzeGcodeFile completato, risultato:', gcodeAnalysis)
  } catch (error) {
    // Continua senza analisi se fallisce
  }

  // Upload su storage
  const { error: upErr } = await supabase.storage.from('files').upload(storageKey, file, { upsert: false })
  if (upErr) {
    if (upErr.message && upErr.message.includes('The resource already exists')) {
      throw new Error('Esiste già un G-code con questo nome per questo file. Rinomina il file o elimina quello esistente.')
    }
    throw upErr
  }

  // Prepara i dati per l'inserimento nel DB
  const gcodeData: Partial<Gcode> = {
    file_origine_id,
    nome_file: storageKey,
    user_id: userId,
    data_caricamento: new Date().toISOString(),
    ...metadati
  }

  // Aggiungi i dati analizzati se disponibili
  if (gcodeAnalysis) {
    console.log('🔍 [UPLOAD] Dati analisi da salvare:', {
      peso_grammi: gcodeAnalysis.peso_grammi,
      tempo_stampa_min: gcodeAnalysis.tempo_stampa_min,
      materiale: gcodeAnalysis.materiale,
      stampante: gcodeAnalysis.stampante
    })
    gcodeData.peso_grammi = gcodeAnalysis.peso_grammi
    gcodeData.tempo_stampa_min = gcodeAnalysis.tempo_stampa_min || undefined
    gcodeData.materiale = gcodeAnalysis.materiale
    gcodeData.stampante = gcodeAnalysis.stampante
  }

  // Aggiungi metadati specifici per .gcode.3mf se disponibili
  if (gcodeMetadata) {
    console.log('🔍 [UPLOAD] Metadati .gcode.3mf:', gcodeMetadata)
    // Estrai informazioni utili dai metadati
    if (gcodeMetadata.material_name) {
      gcodeData.materiale = gcodeMetadata.material_name
      console.log('✅ [UPLOAD] Materiale da metadati:', gcodeMetadata.material_name)
    }
    if (gcodeMetadata.printer_model) {
      gcodeData.stampante = gcodeMetadata.printer_model
      console.log('✅ [UPLOAD] Stampante da metadati:', gcodeMetadata.printer_model)
    }
    // I metadati vengono salvati nelle note per riferimento futuro
    if (gcodeMetadata.print_settings_name || gcodeMetadata.printer_model) {
      const metadataInfo = []
      if (gcodeMetadata.print_settings_name) metadataInfo.push(`Profilo: ${gcodeMetadata.print_settings_name}`)
      if (gcodeMetadata.printer_model) metadataInfo.push(`Stampante: ${gcodeMetadata.printer_model}`)
      gcodeData.note = metadataInfo.join(', ')
    }
  }

  // Insert DB
  console.log('🔍 [UPLOAD] Dati finali da inserire nel DB:', gcodeData)
  const { error: dbErr } = await supabase
    .from('gcode')
    .insert([gcodeData])
  if (dbErr) {
    console.log('❌ [UPLOAD] Errore inserimento DB:', dbErr)
    throw dbErr
  }
  console.log('✅ [UPLOAD] G-code salvato nel DB con successo')
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

export async function updateGcodeAnalysis(id: number): Promise<void> {
  try {
    // Recupera il G-code
    const { data: gcode, error: fetchError } = await supabase
      .from('gcode')
      .select('nome_file')
      .eq('id', id)
      .single()
    
    if (fetchError || !gcode) throw fetchError || new Error('G-code non trovato')

    // Scarica il file dal storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(gcode.nome_file)
    
    if (downloadError || !fileData) throw downloadError || new Error('Impossibile scaricare il file')

    // Determina il nome del file dallo storage path
    const fileName = gcode.nome_file.split('/').pop() || 'temp.gcode'
    
    // Determina il MIME type basato sull'estensione del file
    const lowerFileName = fileName.toLowerCase()
    let mimeType = 'text/plain' // default
    
    if (lowerFileName.endsWith('.gcode.3mf')) {
      mimeType = 'application/zip'
    } else if (lowerFileName.endsWith('.gcode') || lowerFileName.endsWith('.g') || lowerFileName.endsWith('.nc')) {
      mimeType = 'text/plain'
    } else if (lowerFileName.endsWith('.3mf')) {
      mimeType = 'application/zip'
    }
    
    // Converti il blob in File per l'analisi
    const file = new File([fileData], fileName, { type: mimeType })
    
    // Analizza il file usando la nuova logica che distingue tra .gcode e .gcode.3mf
    const analysis = await analyzeGcodeFile(file)
    
    // Aggiorna il database
    const { error: updateError } = await supabase
      .from('gcode')
      .update({
        peso_grammi: analysis.peso_grammi,
        tempo_stampa_min: analysis.tempo_stampa_min || undefined,
        materiale: analysis.materiale,
        stampante: analysis.stampante
      })
      .eq('id', id)
    
    if (updateError) throw updateError
  } catch (error) {
    throw error
  }
}

export async function analyzeAllGcodes(): Promise<void> {
  try {
    // Recupera tutti i G-code senza analisi
    const { data: gcodes, error: fetchError } = await supabase
      .from('gcode')
      .select('id, nome_file')
      .or('peso_grammi.is.null,tempo_stampa_min.is.null')
    
    if (fetchError) throw fetchError
    
    for (const gcode of gcodes || []) {
      try {
        await updateGcodeAnalysis(gcode.id)
        // Pausa per evitare sovraccarico
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        // Continua con gli altri
      }
    }
  } catch (error) {
    throw error
  }
} 