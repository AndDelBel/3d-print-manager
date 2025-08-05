import { NextResponse } from 'next/server'
import { getStampanteData } from '@/services/stampante'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID non valido' },
        { status: 400 }
      )
    }

    const stampanteData = await getStampanteData(id)
    
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