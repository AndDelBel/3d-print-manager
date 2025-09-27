import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeGcodeFile } from '@/utils/gcodeParser'

export async function POST(request: NextRequest) {
  try {
    // Ottieni il token di autorizzazione dall'header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Crea un client Supabase con il token per verificare l'utente
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Verifica che l'utente sia autenticato
    const { data: userData, error: userError } = await supabaseWithToken.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica se l'utente è superuser usando il client con token
    const { data: user, error: userFetchError } = await supabaseWithToken
      .from('utente')
      .select('is_superuser')
      .eq('id', userData.user.id)
      .single()

    if (userFetchError || !user) {
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dati utente' },
        { status: 500 }
      )
    }

    if (!user.is_superuser) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato. Solo i superuser possono eseguire questa operazione.' },
        { status: 403 }
      )
    }

    console.log('🔄 [REANALYZE] Inizio rianalisi gcode con valori nulli...')

    // Trova tutti i gcode con valori nulli usando il client con token
    const { data: gcodesToReanalyze, error: fetchError } = await supabaseWithToken
      .from('gcode')
      .select('id, nome_file, peso_grammi, tempo_stampa_min, materiale, stampante')
      .or('peso_grammi.is.null,tempo_stampa_min.is.null,materiale.is.null,stampante.is.null')

    if (fetchError) {
      console.error('❌ [REANALYZE] Errore nel recupero gcode:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei gcode da rianalizzare' },
        { status: 500 }
      )
    }

    if (!gcodesToReanalyze || gcodesToReanalyze.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun gcode da rianalizzare trovato',
        reanalyzed: 0,
        errors: 0
      })
    }

    console.log(`🔍 [REANALYZE] Trovati ${gcodesToReanalyze.length} gcode da rianalizzare`)

    let reanalyzedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Rianalizza ogni gcode
    for (const gcode of gcodesToReanalyze) {
      try {
        console.log(`🔄 [REANALYZE] Rianalizzando gcode ID: ${gcode.id}, file: ${gcode.nome_file}`)

        // Scarica il file dal storage
        const { data: fileData, error: downloadError } = await supabaseWithToken.storage
          .from('files')
          .download(gcode.nome_file)

        if (downloadError || !fileData) {
          console.error(`❌ [REANALYZE] Impossibile scaricare file per gcode ${gcode.id}:`, downloadError)
          errors.push(`Gcode ${gcode.id}: Impossibile scaricare file`)
          errorCount++
          continue
        }

        // Determina il nome del file dallo storage path
        const fileName = gcode.nome_file.split('/').pop() || 'temp.gcode'
        
        // Determina il MIME type basato sull'estensione del file
        const lowerFileName = fileName.toLowerCase()
        let mimeType = 'text/plain'
        
        if (lowerFileName.endsWith('.gcode.3mf')) {
          mimeType = 'application/zip'
        } else if (lowerFileName.endsWith('.gcode') || lowerFileName.endsWith('.g') || lowerFileName.endsWith('.nc')) {
          mimeType = 'text/plain'
        } else if (lowerFileName.endsWith('.3mf')) {
          mimeType = 'application/zip'
        }

        // Converti il blob in File per l'analisi
        const file = new File([fileData], fileName, { type: mimeType })

        // Analizza il file
        console.log(`🔍 [REANALYZE] Inizio analisi file: ${fileName}`)
        const analysis = await analyzeGcodeFile(file)
        console.log(`📊 [REANALYZE] Analisi completata per ${fileName}:`, {
          peso_grammi: analysis.peso_grammi,
          tempo_stampa_min: analysis.tempo_stampa_min,
          materiale: analysis.materiale,
          stampante: analysis.stampante,
          errors: analysis.errors,
          warnings: analysis.warnings
        })

        // Prepara i dati da aggiornare (solo i campi che erano nulli)
        const updateData: {
          peso_grammi?: number
          tempo_stampa_min?: number
          materiale?: string
          stampante?: string
        } = {}
        
        if (gcode.peso_grammi === null && analysis.peso_grammi) {
          updateData.peso_grammi = analysis.peso_grammi
        }
        
        if (gcode.tempo_stampa_min === null && analysis.tempo_stampa_min) {
          updateData.tempo_stampa_min = analysis.tempo_stampa_min
        }
        
        if (gcode.materiale === null && analysis.materiale) {
          updateData.materiale = analysis.materiale
        }
        
        if (gcode.stampante === null && analysis.stampante) {
          updateData.stampante = analysis.stampante
        }

        // Aggiorna il database solo se ci sono dati da aggiornare
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseWithToken
            .from('gcode')
            .update(updateData)
            .eq('id', gcode.id)

          if (updateError) {
            console.error(`❌ [REANALYZE] Errore aggiornamento gcode ${gcode.id}:`, updateError)
            errors.push(`Gcode ${gcode.id}: Errore aggiornamento database`)
            errorCount++
          } else {
            console.log(`✅ [REANALYZE] Gcode ${gcode.id} aggiornato con successo:`, updateData)
            reanalyzedCount++
          }
        } else {
          console.log(`ℹ️ [REANALYZE] Gcode ${gcode.id}: Nessun dato da aggiornare`)
        }

      } catch (error) {
        console.error(`❌ [REANALYZE] Errore durante rianalisi gcode ${gcode.id}:`, error)
        errors.push(`Gcode ${gcode.id}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
        errorCount++
      }
    }

    console.log(`✅ [REANALYZE] Rianalisi completata. Rianalizzati: ${reanalyzedCount}, Errori: ${errorCount}`)

    return NextResponse.json({
      success: true,
      message: `Rianalisi completata. ${reanalyzedCount} gcode aggiornati, ${errorCount} errori`,
      reanalyzed: reanalyzedCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10) // Mostra solo i primi 10 errori
    })

  } catch (error) {
    console.error('❌ [REANALYZE] Errore generale:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
}
