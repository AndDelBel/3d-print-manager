import { NextResponse } from 'next/server'
import { getStates } from '@/services/homeAssistant'

export async function GET() {
  try {
    const states = await getStates()
    
    // La risposta di Home Assistant è un array di entità
    const entities = Array.isArray(states) ? states : Object.values(states)
    const entityIds = entities.map(e => e.entity_id)
    
    // Filtra le entità che potrebbero essere stampanti
    const printerEntities = entityIds.filter(id => 
      id.includes('printer') || id.includes('x1') || id.includes('a1') || id.includes('h2d') || id.includes('rat_rig')
    )
    
    // Controlla le entità specifiche
    const specificEntities = {
      'sensor.rat_rig_printer_status': entityIds.includes('sensor.rat_rig_printer_status'),
      'sensor.x1': entityIds.includes('sensor.x1'),
      'sensor.a1': entityIds.includes('sensor.a1'),
      'sensor.h2d': entityIds.includes('sensor.h2d')
    }
    
    return NextResponse.json({ 
      success: true, 
      total_entities: entities.length,
      printer_entities: printerEntities,
      specific_entities: specificEntities,
      first_10_entities: entityIds.slice(0, 10)
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Errore nel test' },
      { status: 500 }
    )
  }
} 