import { NextResponse } from 'next/server'
import { listStampanti } from '@/services/stampante'
import { getAvailablePrinters } from '@/services/homeAssistant'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isSuperuser = searchParams.get('isSuperuser') === 'true'

    const params = {
      userId: userId ? parseInt(userId) : undefined,
      isSuperuser
    }

    // Ottieni stampanti dal database
    const dbStampanti = await listStampanti(params)
    
    // Ottieni stampanti da Home Assistant
    const haPrinters = await getAvailablePrinters()
    
    // Combina i dati
    const stampantiCompletate = dbStampanti.map(stampante => {
      const haData = haPrinters.find(p => p.unique_id === stampante.unique_id)
      if (haData) {
        return {
          ...stampante,
          entity_id: haData.entity_id,
          nome: haData.friendly_name || stampante.unique_id,
          stato: haData.state,
          hotend_temperature: haData.hotend_temperature || 0,
          bed_temperature: haData.bed_temperature || 0,
          print_progress: haData.print_progress || 0,
          time_remaining: haData.time_remaining || 0,
          current_file: haData.current_file || '',
          last_update: haData.last_update || new Date().toISOString(),
        }
      }
      return null
    }).filter(Boolean)
    
    return NextResponse.json({ success: true, stampanti: stampantiCompletate })
  } catch (error) {
    console.error('Errore nel recupero stampanti:', error)
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero stampanti' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Importa createStampante dinamicamente per evitare problemi di import
    const { createStampante } = await import('@/services/stampante')
    
    const stampante = await createStampante({ unique_id: body.unique_id })
    
    return NextResponse.json({ success: true, stampante })
  } catch (error) {
    console.error('Errore nella creazione stampante:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nella creazione stampante',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  }
} 