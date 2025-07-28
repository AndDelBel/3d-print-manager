import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Crea una stampante di test
    const { data, error } = await supabase
      .from('stampante')
      .insert({
        nome: 'rat-rig-test',
        modello: 'Ender 3',
        attiva: true,
        tipo_sistema: 'klipper',
        endpoint_api: 'http://10.0.0.24:7125',
        api_key: null,
        note: 'Stampante di test creata via API'
      })
      .select()
      .single()

    if (error) {
      console.error('Errore creazione stampante:', error)
      return NextResponse.json({ 
        error: 'Errore creazione stampante', 
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      stampante: data 
    })

  } catch (error) {
    console.error('Errore generale:', error)
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
} 