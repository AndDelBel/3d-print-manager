import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'

// Only create the client if we're in a browser environment or have real credentials
let supabase: ReturnType<typeof createClient>

if (typeof window !== 'undefined' || (supabaseUrl !== 'http://localhost:3000' && supabaseKey !== 'dummy-key-for-build')) {
  supabase = createClient(supabaseUrl, supabaseKey)
} else {
  // Create a mock client for build time
  supabase = createClient('http://localhost:3000', 'dummy-key-for-build')
}

export { supabase }