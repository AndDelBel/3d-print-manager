import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(_request: NextRequest) {
  try {
    // Verifica sessione
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'Errore sessione',
        details: sessionError.message 
      })
    }

    if (!session) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'Nessuna sessione attiva' 
      })
    }

    // Verifica/crea utente nel database (idempotente)
    const metadata = session.user.user_metadata as Record<string, unknown> | undefined
    const upsertPayload = {
      id: session.user.id,
      email: session.user.email,
      nome: typeof metadata?.nome === 'string' ? metadata.nome : null,
      cognome: typeof metadata?.cognome === 'string' ? metadata.cognome : null,
    }

    await supabase
      .from('utente')
      .upsert(upsertPayload, { onConflict: 'id' })

    const { data: userData, error: userError } = await supabase
      .from('utente')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'Utente non trovato nel database',
        details: userError?.message 
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        is_superuser: userData.is_superuser,
        nome: userData.nome,
        cognome: userData.cognome
      },
      session: {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at
      }
    })

  } catch (error) {
    console.error('Errore verifica autenticazione:', error)
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
} 