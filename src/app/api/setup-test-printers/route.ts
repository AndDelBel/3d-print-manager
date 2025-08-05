import { NextResponse } from 'next/server'
import { createStampante } from '@/services/stampante'
import type { CreateStampante } from '@/types/stampante'

export async function POST() {
  try {
    const testPrinters: CreateStampante[] = [
      {
        nome: 'Rat-Rig IDEX',
        descrizione: 'Stampante Rat-Rig con Klipper',
        user_id: '1de5d880-b490-41d7-b893-c322fd9a799d', // Sostituisci con il tuo user_id
        ha_entity_id: 'sensor.rat_rig_printer_status',
        ha_friendly_name: 'Rat-Rig-IDEX',
        ha_enabled: true,
        ha_printer_type: 'klipper'
      },
      {
        nome: 'Bambu Lab X1',
        descrizione: 'Stampante Bambu Lab X1',
        user_id: '1de5d880-b490-41d7-b893-c322fd9a799d', // Sostituisci con il tuo user_id
        ha_entity_id: 'sensor.x1_printer_status',
        ha_friendly_name: 'Bambu Lab X1',
        ha_enabled: true,
        ha_printer_type: 'bambu'
      },
      {
        nome: 'Bambu Lab A1',
        descrizione: 'Stampante Bambu Lab A1',
        user_id: '1de5d880-b490-41d7-b893-c322fd9a799d', // Sostituisci con il tuo user_id
        ha_entity_id: 'sensor.a1_printer_status',
        ha_friendly_name: 'Bambu Lab A1',
        ha_enabled: true,
        ha_printer_type: 'bambu'
      },
      {
        nome: 'Bambu Lab H2D',
        descrizione: 'Stampante Bambu Lab H2D',
        user_id: '1de5d880-b490-41d7-b893-c322fd9a799d', // Sostituisci con il tuo user_id
        ha_entity_id: 'sensor.h2d_printer_status',
        ha_friendly_name: 'Bambu Lab H2D',
        ha_enabled: true,
        ha_printer_type: 'bambu'
      }
    ]

    const createdPrinters = []
    
    for (const printer of testPrinters) {
      try {
        const created = await createStampante(printer)
        createdPrinters.push(created)
      } catch (error) {
        console.error(`Errore nella creazione di ${printer.nome}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Stampanti create: ${createdPrinters.length}/${testPrinters.length}`,
      stampanti: createdPrinters
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Errore nella configurazione stampanti di test' },
      { status: 500 }
    )
  }
} 