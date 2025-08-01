import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log('API route chiamata con ID:', id)
    
    // Dati mock per test
    const mockStatus: Record<string, unknown> = {
      stampante_id: parseInt(id),
      stato: 'pronta',
      temperatura_nozzle: 200 + Math.random() * 20,
      temperatura_piatto: 60 + Math.random() * 10,
      ultimo_aggiornamento: new Date().toISOString()
    }

    // Simula una stampa in corso ogni tanto
    if (Math.random() > 0.7) {
      mockStatus.stato = 'in_stampa'
      mockStatus.percentuale_completamento = Math.random() * 100
      mockStatus.tempo_rimanente = 1800 + Math.random() * 3600
      mockStatus.tempo_totale = 7200 + Math.random() * 7200
      mockStatus.nome_file_corrente = `test_print_${id}.gcode`
    }

    return NextResponse.json(mockStatus)
  } catch (error) {
    console.error('Errore API route:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
} 