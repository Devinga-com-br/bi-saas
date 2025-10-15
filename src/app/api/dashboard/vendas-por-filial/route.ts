import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const filiais = searchParams.get('filiais') || 'all'

    if (!schema || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: schema, data_inicio, data_fim' },
        { status: 400 }
      )
    }

    // Chamar função RPC
    const { data, error } = await supabase.rpc('get_vendas_por_filial', {
      p_schema: schema,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
      p_filiais: filiais
    } as never)

    if (error) {
      console.error('[API/DASHBOARD/VENDAS-POR-FILIAL] RPC Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('[API/DASHBOARD/VENDAS-POR-FILIAL] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
