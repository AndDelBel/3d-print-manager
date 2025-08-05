import { NextResponse } from 'next/server'
import { getAvailablePrinters } from '@/services/homeAssistant'

export async function GET() {
  try {
    const printers = await getAvailablePrinters()
    return NextResponse.json({ success: true, printers })
  } catch (error) {
    console.error('Errore nel recupero stampanti:', error)
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero stampanti' },
      { status: 500 }
    )
  }
} 