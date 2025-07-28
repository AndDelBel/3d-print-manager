import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('API route chiamata con ID:', id)
    
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
          setAll(cookiesToSet) {
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

    // Durante sviluppo, bypassa completamente l'autenticazione
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Log per debug
    console.log('Auth check:', { 
      isDevelopment, 
      bypassAuth: true
    })

    // Ottieni i dati della stampante
    console.log('Cercando stampante con ID:', id)
    
    const { data: stampante, error: stampanteError } = await supabase
      .from('stampante')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Query stampante risultato:', {
      hasStampante: !!stampante,
      error: stampanteError?.message,
      stampante: stampante ? {
        id: stampante.id,
        nome: stampante.nome,
        endpoint_api: stampante.endpoint_api,
        tipo_sistema: stampante.tipo_sistema
      } : null
    })

    if (stampanteError || !stampante) {
      return NextResponse.json({ error: 'Stampante non trovata' }, { status: 404 })
    }

    // Se non c'è endpoint API configurato, restituisci dati mock
    if (!stampante.endpoint_api || !stampante.tipo_sistema) {
      return NextResponse.json({
        stampante_id: stampante.id,
        stato: 'offline',
        ultimo_aggiornamento: new Date().toISOString(),
        error: 'Stampante non configurata per API'
      })
    }

    // Proxy per Klipper
    if (stampante.tipo_sistema === 'klipper') {
      try {
        const endpoint = stampante.endpoint_api
        const apiKey = stampante.api_key

        console.log('Tentativo connessione Klipper:', { 
          endpoint, 
          hasApiKey: !!apiKey,
          stampante_id: stampante.id,
          stampante_nome: stampante.nome
        })

        // Richiesta per ottenere lo stato della stampante
        const printerInfoResponse = await fetch(`${endpoint}/printer/info`, {
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
          signal: AbortSignal.timeout(5000) // Timeout 5 secondi
        })

        console.log('Risposta printer/info:', {
          status: printerInfoResponse.status,
          ok: printerInfoResponse.ok,
          headers: Object.fromEntries(printerInfoResponse.headers.entries())
        })

        if (!printerInfoResponse.ok) {
          throw new Error(`HTTP ${printerInfoResponse.status}`)
        }

        const printerInfo = await printerInfoResponse.json()
        console.log('Printer info ricevuta:', printerInfo)

        // Richiesta per ottenere i dati di temperatura
        const temperatureResponse = await fetch(`${endpoint}/printer/objects/query?extruder&heater_bed`, {
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
          signal: AbortSignal.timeout(5000)
        })

        console.log('Risposta temperature:', {
          status: temperatureResponse.status,
          ok: temperatureResponse.ok
        })

        if (!temperatureResponse.ok) {
          throw new Error(`HTTP ${temperatureResponse.status}`)
        }

        const temperatureData = await temperatureResponse.json()
        console.log('Temperature data ricevuta:', temperatureData)

        // Richiesta per ottenere lo stato di stampa
        const printStatusResponse = await fetch(`${endpoint}/printer/objects/query?print_stats`, {
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
          signal: AbortSignal.timeout(5000)
        })

        let printStats = null
        if (printStatusResponse.ok) {
          printStats = await printStatusResponse.json()
        }

        const status: any = { // Cast to any to allow dynamic properties
          stampante_id: stampante.id,
          stato: 'pronta',
          temperatura_nozzle: temperatureData.result?.status?.extruder?.temperature,
          temperatura_piatto: temperatureData.result?.status?.heater_bed?.temperature,
          ultimo_aggiornamento: new Date().toISOString()
        }

        // Determina lo stato basato sui dati
        if (printStats?.result?.status?.print_stats?.state === 'printing') {
          status.stato = 'in_stampa'
          status.percentuale_completamento = printStats.result.status.print_stats.progress * 100
          status.tempo_rimanente = printStats.result.status.print_stats.print_duration
          status.tempo_totale = printStats.result.status.print_stats.total_duration
          status.nome_file_corrente = printStats.result.status.print_stats.filename
        } else if (printStats?.result?.status?.print_stats?.state === 'paused') {
          status.stato = 'pausa'
        } else if (printStats?.result?.status?.print_stats?.state === 'error') {
          status.stato = 'errore'
        }

        return NextResponse.json(status)
      } catch (error) {
        console.error('Errore API Klipper:', error)
        return NextResponse.json({
          stampante_id: stampante.id,
          stato: 'offline',
          ultimo_aggiornamento: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Errore di connessione'
        })
      }
    }

    // Proxy per Bambu Lab
    if (stampante.tipo_sistema === 'bambu') {
      try {
        const endpoint = stampante.endpoint_api
        const apiKey = stampante.api_key

        const response = await fetch(`${endpoint}/device/status`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        const status: any = { // Cast to any to allow dynamic properties
          stampante_id: stampante.id,
          stato: data.state || 'pronta',
          temperatura_nozzle: data.temperature?.nozzle,
          temperatura_piatto: data.temperature?.bed,
          percentuale_completamento: data.progress?.percentage,
          tempo_rimanente: data.progress?.remaining_time,
          tempo_totale: data.progress?.total_time,
          nome_file_corrente: data.current_file,
          ultimo_aggiornamento: new Date().toISOString()
        }

        return NextResponse.json(status)
      } catch (error) {
        console.error('Errore API Bambu:', error)
        return NextResponse.json({
          stampante_id: stampante.id,
          stato: 'offline',
          ultimo_aggiornamento: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Errore di connessione'
        })
      }
    }

    return NextResponse.json({ error: 'Tipo sistema non supportato' }, { status: 400 })
  } catch (error) {
    console.error('Errore generale:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 