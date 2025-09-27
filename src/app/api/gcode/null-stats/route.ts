import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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

    // Recupera tutti i gcode per calcolare le statistiche usando il client con token
    console.log('🔍 [NULL-STATS] Recupero dati gcode...')
    const { data: stats, error: statsError } = await supabaseWithToken
      .from('gcode')
      .select('peso_grammi, tempo_stampa_min, materiale, stampante')

    if (statsError) {
      console.error('❌ [NULL-STATS] Errore nel recupero gcode:', statsError)
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero delle statistiche' },
        { status: 500 }
      )
    }

    console.log(`📊 [NULL-STATS] Recuperati ${stats?.length || 0} gcode`)

    const totalGcodes = stats?.length || 0
    const nullStats = {
      peso_grammi: stats?.filter(g => g.peso_grammi === null).length || 0,
      tempo_stampa_min: stats?.filter(g => g.tempo_stampa_min === null).length || 0,
      materiale: stats?.filter(g => g.materiale === null).length || 0,
      stampante: stats?.filter(g => g.stampante === null).length || 0
    }

    // Conta i gcode che hanno almeno un valore nullo
    const gcodesWithNulls = stats?.filter(g => 
      g.peso_grammi === null || 
      g.tempo_stampa_min === null || 
      g.materiale === null || 
      g.stampante === null
    ).length || 0

    console.log(`📊 [NULL-STATS] Calcoli completati:`, {
      total: totalGcodes,
      withNulls: gcodesWithNulls,
      nullStats
    })

    return NextResponse.json({
      success: true,
      stats: {
        total: totalGcodes,
        withNulls: gcodesWithNulls,
        nullFields: nullStats,
        percentages: {
          peso_grammi: totalGcodes > 0 ? Math.round((nullStats.peso_grammi / totalGcodes) * 100) : 0,
          tempo_stampa_min: totalGcodes > 0 ? Math.round((nullStats.tempo_stampa_min / totalGcodes) * 100) : 0,
          materiale: totalGcodes > 0 ? Math.round((nullStats.materiale / totalGcodes) * 100) : 0,
          stampante: totalGcodes > 0 ? Math.round((nullStats.stampante / totalGcodes) * 100) : 0
        }
      }
    })

  } catch (error) {
    console.error('❌ [NULL-STATS] Errore:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
}
