import { NextRequest, NextResponse } from 'next/server'
import { updateGcodeAnalysis } from '@/services/gcode'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gcodeId = parseInt(id)
    
    if (isNaN(gcodeId)) {
      return NextResponse.json(
        { success: false, error: 'ID G-code non valido' },
        { status: 400 }
      )
    }

    console.log(`🔄 Avvio analisi del G-code ID: ${gcodeId}`)
    
    await updateGcodeAnalysis(gcodeId)
    
    console.log(`✅ Analisi del G-code ID: ${gcodeId} completata`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Analisi del G-code ID: ${gcodeId} completata con successo` 
    })
  } catch (error) {
    console.error(`❌ Errore nell'analisi del G-code:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
} 