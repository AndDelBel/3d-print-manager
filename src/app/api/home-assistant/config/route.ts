import { NextRequest, NextResponse } from 'next/server'
import { getHomeAssistantConfig, upsertHomeAssistantConfig } from '@/services/homeAssistantConfig'
import type { CreateHomeAssistantConfig } from '@/types/homeAssistantConfig'

export async function GET() {
  try {
    const config = await getHomeAssistantConfig()
    return NextResponse.json({ success: true, config })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero configurazione' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config: CreateHomeAssistantConfig = {
      base_url: body.base_url,
      access_token: body.access_token,
      entity_prefix: body.entity_prefix
    }

    await upsertHomeAssistantConfig(config)
    
    return NextResponse.json({ success: true, message: 'Configurazione salvata' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Errore nel salvataggio configurazione' },
      { status: 500 }
    )
  }
} 