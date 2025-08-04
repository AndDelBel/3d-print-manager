import { NextRequest, NextResponse } from 'next/server'
import { analyzeAllGcodes } from '@/services/gcode'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Avvio analisi di tutti i G-code...')
    
    await analyzeAllGcodes()
    
    console.log('✅ Analisi di tutti i G-code completata')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Analisi di tutti i G-code completata con successo' 
    })
  } catch (error) {
    console.error('❌ Errore nell\'analisi di tutti i G-code:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    )
  }
} 