import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ukdhstoqhcplbvqikhro.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZGhzdG9xaGNwbGJ2cWlraHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzk0MjAsImV4cCI6MjA5MzMxNTQyMH0.fkQeAdnfaroZnWNk6-NNhWBrF6Q9pjnnnZKOeIbMsIc'

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

export function createClient() {
  return supabase
}
