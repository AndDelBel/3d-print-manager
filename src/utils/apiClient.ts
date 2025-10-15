import { supabase } from '@/lib/supabaseClient'

/**
 * Enhanced fetch wrapper that ensures fresh auth tokens
 * Automatically refreshes session before making API calls
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  // Refresh session before making API call to ensure token is fresh
  const { data: { session }, error } = await supabase.auth.refreshSession()
  
  if (error || !session) {
    throw new Error('Authentication failed. Please log in again.')
  }

  // Add auth header with fresh token
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 401 errors by attempting one more refresh
  if (response.status === 401) {
    const { data: { session: retrySession }, error: retryError } = await supabase.auth.refreshSession()
    
    if (retryError || !retrySession) {
      // Session is truly invalid, redirect to login
      window.location.href = '/auth/login'
      throw new Error('Session expired. Please log in again.')
    }

    // Retry with new token
    const retryHeaders = {
      ...options.headers,
      'Authorization': `Bearer ${retrySession.access_token}`,
      'Content-Type': 'application/json',
    }

    return fetch(url, {
      ...options,
      headers: retryHeaders,
    })
  }

  return response
}

/**
 * Enhanced Supabase query wrapper that ensures fresh session
 * Use this for direct Supabase database queries
 */
export async function withFreshSession<T>(
  queryFn: () => Promise<T>
): Promise<T> {
  // Refresh session before query
  await supabase.auth.refreshSession()
  
  // Execute query
  return queryFn()
}

