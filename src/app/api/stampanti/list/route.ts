import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Ottieni tutte le stampanti
    const { data: stampanti, error } = await supabase
      .from('stampante')
      .select('*')
      .order('id')

    if (error) {
      console.error('Errore query stampanti:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      stampanti: stampanti || [],
      count: stampanti?.length || 0
    })

  } catch (error) {
    console.error('Errore API list stampanti:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
} 