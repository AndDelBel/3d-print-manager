import { NextResponse } from 'next/server'
import { listStampanti } from '@/services/stampante'
import { getAvailablePrinters } from '@/services/homeAssistant'

export async function GET() {
  try {
    // Debug: stampanti nel database
    const dbStampanti = await listStampanti({ isSuperuser: true })
    
    // Debug: stampanti da Home Assistant
    const haPrinters = await getAvailablePrinters()
    
    return NextResponse.json({
      success: true,
      debug: {
        database: {
          count: dbStampanti.length,
          stampanti: dbStampanti
        },
        homeAssistant: {
          count: haPrinters.length,
          printers: haPrinters
        }
      }
    })
  } catch (error) {
    console.error('Errore debug stampanti:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel debug stampanti',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  }
} 