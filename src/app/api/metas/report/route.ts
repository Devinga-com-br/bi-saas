import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const filialId = searchParams.get('filial_id')

    console.log('[API/METAS/REPORT] Request params:', { schema, mes, ano, filialId })

    if (!schema || !mes || !ano) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const params: Record<string, number | string> = {
      p_schema: schema,
      p_mes: parseInt(mes),
      p_ano: parseInt(ano)
    }

    if (filialId && filialId !== 'all') {
      params.p_filial_id = parseInt(filialId)
    }

    console.log('[API/METAS/REPORT] Calling RPC with params:', params)

    // @ts-expect-error - Function will exist after migration is applied
    const { data, error } = await supabase.rpc('get_metas_mensais_report', params)

    if (error) {
      console.error('[API/METAS/REPORT] RPC Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar metas' },
        { status: 500 }
      )
    }

    console.log('[API/METAS/REPORT] Success, data type:', typeof data)

    return NextResponse.json(data || { metas: [], total_realizado: 0, total_meta: 0, percentual_atingido: 0 })
  } catch (error) {
    console.error('[API/METAS/REPORT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
