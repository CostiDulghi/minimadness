
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnjejjzqbopgxuboozsk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuamVqanpxYm9wZ3h1Ym9venNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDQ2NjUsImV4cCI6MjA3NjA4MDY2NX0.hMU1imuL-1yhEVL71p_y46weoaK6c3jN9e6W8YTRVJ4'
export const supabase = createClient(supabaseUrl, supabaseKey)