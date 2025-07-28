import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { endpoint, tipo_sistema, api_key } = await request.json()

    if (!endpoint || !tipo_sistema) {
      return NextResponse.json({ 
        error: 'Endpoint e tipo_sistema sono richiesti' 
      }, { status: 400 })
    }

    // Test Klipper
    if (tipo_sistema === 'klipper') {
      try {
        const response = await fetch(`${endpoint}/printer/info`, {
          headers: api_key ? { 'X-API-Key': api_key } : {},
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        return NextResponse.json({
          success: true,
          data,
          message: 'Connessione Klipper riuscita'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Errore di connessione',
          message: 'Impossibile connettersi alla stampante Klipper'
        })
      }
    }

    // Test Bambu Lab
    if (tipo_sistema === 'bambu') {
      try {
        const response = await fetch(`${endpoint}/device/status`, {
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        return NextResponse.json({
          success: true,
          data,
          message: 'Connessione Bambu Lab riuscita'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Errore di connessione',
          message: 'Impossibile connettersi alla stampante Bambu Lab'
        })
      }
    }

    return NextResponse.json({ 
      error: 'Tipo sistema non supportato' 
    }, { status: 400 })
  } catch (error) {
    console.error('Errore test API:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 