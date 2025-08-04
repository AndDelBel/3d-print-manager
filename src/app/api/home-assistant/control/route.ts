import { NextRequest, NextResponse } from 'next/server'
import { controlPrinter } from '@/services/homeAssistant'
import type { PrinterServiceCall } from '@/types/homeAssistant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const serviceCall: PrinterServiceCall = {
      entity_id: body.entity_id,
      service: body.service,
      data: body.data
    }

    const result = await controlPrinter(serviceCall)
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Comando eseguito con successo' })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Errore nell\'esecuzione del comando' },
      { status: 500 }
    )
  }
} 