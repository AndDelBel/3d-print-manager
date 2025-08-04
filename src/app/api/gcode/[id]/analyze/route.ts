import { NextRequest, NextResponse } from 'next/server'
import { updateGcodeAnalysis } from '@/services/gcode'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID G-code non valido' },
        { status: 400 }
      )
    }

    console.log(`🔄 Avvio analisi del G-code ID: ${id}`)
    
    await updateGcodeAnalysis(id)
    
    console.log(`✅ Analisi del G-code ID: ${id} completata`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Analisi del G-code ID: ${id} completata con successo` 
    })
  } catch (error) {
    console.error(`❌ Errore nell'analisi del G-code ID: ${params.id}:`, error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
} 