import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface UseUserReturn {
  loading: boolean
  user: User | null
  isAuthenticated: boolean
}

export function useUser(): UseUserReturn {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const handleAuthStateChange = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        router.replace('/auth/login')
        return
      }

      setUser(session.user)
      setLoading(false)
    } catch (error) {
      console.error('Auth error:', error)
      setUser(null)
      setLoading(false)
      router.replace('/auth/login')
    }
  }, [router])

  useEffect(() => {
    // Initial session check
    handleAuthStateChange()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          router.replace('/auth/login')
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session.user)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [handleAuthStateChange, router])

  return { 
    loading, 
    user, 
    isAuthenticated: !!user 
  }
}