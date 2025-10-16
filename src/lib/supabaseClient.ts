import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Declare global window property for TypeScript
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient
    __supabaseAdmin?: SupabaseClient
  }
}

// Function to get or create Supabase client (more robust than IIFE)
function getSupabaseClient(): SupabaseClient {
  // Always check window first (survives hot reload)
  if (typeof window !== 'undefined' && window.__supabaseClient) {
    return window.__supabaseClient
  }
  
  // Create new instance only if needed
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: '3d-print-manager-supabase-auth'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.x'
      }
    }
  })
  
  // Store in window to survive hot reload
  if (typeof window !== 'undefined') {
    window.__supabaseClient = client
  }
  
  return client
}

export const supabase = getSupabaseClient()

// Function to get or create admin client
function getSupabaseAdmin(): SupabaseClient {
  // Check window first for server-side client too
  if (typeof window !== 'undefined' && window.__supabaseAdmin) {
    return window.__supabaseAdmin
  }
  
  const adminClient = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  // Store in window to survive hot reload
  if (typeof window !== 'undefined') {
    window.__supabaseAdmin = adminClient
  }
  
  return adminClient
}

export const supabaseAdmin = getSupabaseAdmin()