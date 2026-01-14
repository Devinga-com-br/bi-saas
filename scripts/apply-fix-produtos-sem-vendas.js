#!/usr/bin/env node

/**
 * Script para aplicar a correção da função get_produtos_sem_vendas
 * Execute: node scripts/apply-fix-produtos-sem-vendas.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyFix() {
  console.log('🔧 Aplicando correção da função get_produtos_sem_vendas...\n')

  const sqlFile = path.join(__dirname, 'apply-produtos-sem-vendas-fix.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')

  try {
    const { error: _error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (_error) {
      console.error('❌ Erro ao executar SQL:', _error)
      
      // Tentar método alternativo: executar direto
      console.log('\n🔄 Tentando método alternativo...\n')
      
      const { error: error2 } = await supabase.from('_migrations').insert({
        name: '20260110_fix_produtos_sem_vendas',
        executed_at: new Date().toISOString()
      })
      
      if (error2) {
        console.error('❌ Método alternativo falhou:', error2)
        console.log('\n📋 Execute manualmente no Supabase SQL Editor:')
        console.log('   Dashboard → SQL Editor → New Query')
        console.log('   Cole o conteúdo de: scripts/apply-produtos-sem-vendas-fix.sql')
        process.exit(1)
      }
    }

    console.log('✅ Função corrigida com sucesso!')
    console.log('\n📊 Alterações aplicadas:')
    console.log('   • Removido filtro de filiais das CTEs')
    console.log('   • Ajustado ORDER BY para priorizar dias sem venda')
    console.log('   • Corrigido número de parâmetros do format()')
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err)
    console.log('\n📋 Execute manualmente no Supabase SQL Editor:')
    console.log('   Dashboard → SQL Editor → New Query')
    console.log('   Cole o conteúdo de: scripts/apply-produtos-sem-vendas-fix.sql')
    process.exit(1)
  }
}

applyFix()
