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

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Conta le stampanti
    const { count: stampantiCount, error: countError } = await supabase
      .from('stampante')
      .select('*', { count: 'exact', head: true })

    // Prova a selezionare tutte le stampanti
    const { data: stampanti, error: selectError } = await supabase
      .from('stampante')
      .select('*')

    // Verifica se esistono organizzazioni
    const { data: organizzazioni, error: orgError } = await supabase
      .from('organizzazione')
      .select('id, nome')

    return NextResponse.json({
      auth: {
        hasUser: !!user,
        authError: authError?.message
      },
      stampanti: {
        count: stampantiCount,
        countError: countError?.message,
        data: stampanti || [],
        selectError: selectError?.message
      },
      organizzazioni: {
        data: organizzazioni || [],
        error: orgError?.message
      }
    })

  } catch (error) {
    console.error('Errore API debug:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
} 