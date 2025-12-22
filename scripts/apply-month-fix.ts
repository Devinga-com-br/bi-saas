import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251115155000_fix_month_comparison.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('Applying migration: fix_month_comparison...')
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration applied successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error applying migration:', error)
    process.exit(1)
  }
}

applyMigration()
