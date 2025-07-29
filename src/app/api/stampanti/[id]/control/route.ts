import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, ...controlParams } = body

    console.log('Controllo stampante:', { id, action, controlParams })

    // Crea client Supabase per server
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Ottieni i dati della stampante
    const { data: stampante, error: stampanteError } = await supabase
      .from('stampante')
      .select('*')
      .eq('id', id)
      .single()

    if (stampanteError || !stampante) {
      return NextResponse.json({ error: 'Stampante non trovata' }, { status: 404 })
    }

    // Verifica che l'utente sia superuser o membro dell'organizzazione
    const { data: userData } = await supabase
      .from('utente')
      .select('is_superuser')
      .eq('id', user.id)
      .single()

    const isSuperuser = userData?.is_superuser || false

    if (!isSuperuser) {
      const { data: orgMember } = await supabase
        .from('organizzazioni_utente')
        .select('*')
        .eq('user_id', user.id)
        .eq('organizzazione_id', stampante.organizzazione_id)
        .single()

      if (!orgMember) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
      }
    }

    // Controllo per Klipper
    if (stampante.tipo_sistema === 'klipper') {
      try {
        const endpoint = stampante.endpoint_api
        const apiKey = stampante.api_key

        let response
        switch (action) {
          case 'start_print':
            response = await fetch(`${endpoint}/print/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              body: JSON.stringify({ filename: controlParams.filename }),
              signal: AbortSignal.timeout(10000)
            })
            break

          case 'pause_print':
            response = await fetch(`${endpoint}/print/pause`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'resume_print':
            response = await fetch(`${endpoint}/print/resume`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'cancel_print':
            response = await fetch(`${endpoint}/print/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'set_temperature':
            response = await fetch(`${endpoint}/printer/gcode/script`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              body: JSON.stringify({ script: `SET_HEATER_TEMPERATURE HEATER=extruder TARGET=${controlParams.temperature}` }),
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'set_bed_temperature':
            response = await fetch(`${endpoint}/printer/gcode/script`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'X-API-Key': apiKey })
              },
              body: JSON.stringify({ script: `SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=${controlParams.temperature}` }),
              signal: AbortSignal.timeout(5000)
            })
            break

          default:
            return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 })
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        return NextResponse.json({ success: true, result })
      } catch (error) {
        console.error('Errore controllo Klipper:', error)
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Errore di connessione'
        }, { status: 500 })
      }
    }

    // Controllo per Bambu Lab
    if (stampante.tipo_sistema === 'bambu') {
      try {
        const endpoint = stampante.endpoint_api
        const apiKey = stampante.api_key

        let response
        switch (action) {
          case 'start_print':
            response = await fetch(`${endpoint}/print/start`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ file_id: controlParams.file_id }),
              signal: AbortSignal.timeout(10000)
            })
            break

          case 'pause_print':
            response = await fetch(`${endpoint}/print/pause`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'resume_print':
            response = await fetch(`${endpoint}/print/resume`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          case 'cancel_print':
            response = await fetch(`${endpoint}/print/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            })
            break

          default:
            return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 })
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        return NextResponse.json({ success: true, result })
      } catch (error) {
        console.error('Errore controllo Bambu:', error)
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Errore di connessione'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Tipo sistema non supportato' }, { status: 400 })
  } catch (error) {
    console.error('Errore generale controllo:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 