import { NextResponse } from 'next/server'
import { getStampanteData } from '@/services/stampante'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const stampanteId = parseInt(id)
    
    if (isNaN(stampanteId)) {
      return NextResponse.json(
        { success: false, error: 'ID non valido' },
        { status: 400 }
      )
    }

    const stampanteData = await getStampanteData(stampanteId)
    
    if (!stampanteData) {
      return NextResponse.json(
        { success: false, error: 'Stampante non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, stampante: stampanteData })
  } catch (error) {
    console.error('Errore nel recupero dati stampante:', error)
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dati stampante' },
      { status: 500 }
    )
  }
} 