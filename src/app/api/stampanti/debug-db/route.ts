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

    // Query diretta per vedere tutte le stampanti
    const { data: stampanti, error } = await supabase
      .from('stampante')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Errore query stampanti:', error)
      return NextResponse.json({ 
        error: 'Errore query database', 
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: stampanti?.length || 0,
      stampanti: stampanti || [],
      debug: {
        hasData: !!stampanti,
        dataType: typeof stampanti,
        isArray: Array.isArray(stampanti)
      }
    })

  } catch (error) {
    console.error('Errore generale:', error)
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 })
  }
} 