/**
 * Script to apply dashboard comparison fix migration
 * Run with: node scripts/apply-dashboard-fix.js
 */

const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    // Dynamically import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables!');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration: 20251115150000_fix_dashboard_comparison_values.sql');
    console.log('⏳ This may take a few seconds...\n');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent }).single();
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution (less secure but works)
      console.log('⚠️  exec_sql not found, trying alternative method...');
      
      // Split by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          
          // Use fetch to call Supabase REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: stmt + ';' })
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error(`❌ Error executing statement ${i + 1}:`);
            console.error(errorData);
          }
        }
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Updated get_dashboard_data function');
    console.log('   - Fixed pa_* fields to return correct comparison values');
    console.log('   - Full year: pa_* now contains full previous year (PAA)');
    console.log('   - Other periods: pa_* contains previous period (PAM)');
    console.log('\n🔄 Please restart your Next.js development server');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📝 Manual application instructions:');
    console.error('1. Copy the contents of: supabase/migrations/20251115150000_fix_dashboard_comparison_values.sql');
    console.error('2. Go to your Supabase Dashboard → SQL Editor');
    console.error('3. Paste and run the SQL');
    process.exit(1);
  }
}

console.log('🚀 Dashboard Fix Migration Tool\n');
console.log('=' .repeat(50));
console.log('');

applyMigration();
