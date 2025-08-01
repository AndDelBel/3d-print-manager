import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    // Crea un client Supabase con i cookie della richiesta
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Estrai i cookie dalla richiesta
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      // Parsing dei cookie per trovare i token Supabase
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      // Se abbiamo i token, li usiamo per autenticare
      if (cookies['sb-access-token'] && cookies['sb-refresh-token']) {
        const { data: { user }, error: userError } = await supabase.auth.getUser(cookies['sb-access-token'])
        
        if (userError || !user) {
          return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
        }

        console.log('Utente autenticato:', user.id)

        // Test 2: Verifica se l'utente è superuser
        const { data: userData, error: userDataError } = await supabase
          .from('utente')
          .select('is_superuser')
          .eq('id', user.id)
          .single()

        if (userDataError) {
          return NextResponse.json({ error: 'Errore recupero dati utente' }, { status: 500 })
        }

        const isSuperuser = userData?.is_superuser || false
        console.log('Is superuser:', isSuperuser)

        // Test 3: Verifica organizzazioni dell'utente
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('organizzazioni_utente')
          .select('organizzazione_id, role')
          .eq('user_id', user.id)

        if (userOrgsError) {
          return NextResponse.json({ error: 'Errore recupero organizzazioni utente' }, { status: 500 })
        }

        console.log('Organizzazioni utente:', userOrgs)

        // Test 4: Verifica accesso a file_origine
        const { data: files, error: filesError } = await supabase
          .from('file_origine')
          .select('*')
          .limit(5)

        console.log('File accessibili:', files?.length || 0)
        if (filesError) {
          console.error('Errore accesso file:', filesError)
        }

        // Test 5: Verifica accesso a ordini
        const { data: orders, error: ordersError } = await supabase
          .from('ordine')
          .select('*')
          .limit(5)

        console.log('Ordini accessibili:', orders?.length || 0)
        if (ordersError) {
          console.error('Errore accesso ordini:', ordersError)
        }

        // Test 6: Verifica accesso a commesse
        const { data: commesse, error: commesseError } = await supabase
          .from('commessa')
          .select('*')
          .limit(5)

        console.log('Commesse accessibili:', commesse?.length || 0)
        if (commesseError) {
          console.error('Errore accesso commesse:', commesseError)
        }

        return NextResponse.json({
          user: {
            id: user.id,
            is_superuser: isSuperuser
          },
          organizzazioni: userOrgs,
          test_results: {
            files_count: files?.length || 0,
            orders_count: orders?.length || 0,
            commesse_count: commesse?.length || 0,
            files_error: filesError?.message,
            orders_error: ordersError?.message,
            commesse_error: commesseError?.message
          }
        })
      }
    }

    return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })

  } catch (error) {
    console.error('Errore test accesso:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
} 