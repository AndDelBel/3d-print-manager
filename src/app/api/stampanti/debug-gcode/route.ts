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
    
    // Conta i G-code
    const { count: gcodeCount, error: countError } = await supabase
      .from('gcode')
      .select('*', { count: 'exact', head: true })

    // Prova a selezionare tutti i G-code
    const { data: gcodeData, error: selectError } = await supabase
      .from('gcode')
      .select('id, nome_file, materiale, peso_grammi, tempo_stampa_min')
      .order('id', { ascending: true })

    // Conta gli ordini
    const { count: ordiniCount, error: ordiniCountError } = await supabase
      .from('ordine')
      .select('*', { count: 'exact', head: true })

    // Prova a selezionare alcuni ordini
    const { data: ordiniData, error: ordiniSelectError } = await supabase
      .from('ordine')
      .select('id, gcode_id, quantita, stato')
      .order('id', { ascending: true })
      .limit(10)

    // Conta la coda stampa
    const { count: codaCount, error: codaCountError } = await supabase
      .from('coda_stampa')
      .select('*', { count: 'exact', head: true })

    // Prova a selezionare la coda stampa
    const { data: codaData, error: codaSelectError } = await supabase
      .from('coda_stampa')
      .select('*')
      .order('posizione', { ascending: true })

    return NextResponse.json({
      auth: {
        hasUser: !!user,
        authError: authError?.message
      },
      gcode: {
        count: gcodeCount,
        countError: countError?.message,
        data: gcodeData || [],
        selectError: selectError?.message
      },
      ordini: {
        count: ordiniCount,
        countError: ordiniCountError?.message,
        data: ordiniData || [],
        selectError: ordiniSelectError?.message
      },
      codaStampa: {
        count: codaCount,
        countError: codaCountError?.message,
        data: codaData || [],
        selectError: codaSelectError?.message
      }
    })

  } catch (error) {
    console.error('Errore API debug gcode:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
} 