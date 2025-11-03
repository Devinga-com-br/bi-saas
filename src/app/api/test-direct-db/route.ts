import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Conectar diretamente ao Supabase (sem o servidor wrapper)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Chamar a função RPC
    const { data, error } = await supabase.rpc('get_dashboard_data', {
      schema_name: 'saoluiz',
      p_data_inicio: '2025-11-01',
      p_data_fim: '2025-11-30',
      p_filiais_ids: null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any

    return NextResponse.json({
      test: 'direct connection',
      total_vendas: result.total_vendas,
      total_lucro: result.total_lucro,
      expected_vendas: 1564109.92,
      is_correct: Math.abs(result.total_vendas - 1564109.92) < 1
    })
  } catch (e) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
