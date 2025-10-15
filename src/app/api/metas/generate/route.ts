import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { schema, filialId, mes, ano, metaPercentual, dataReferenciaInicial } = body

    if (!schema || !filialId || !mes || !ano || metaPercentual === undefined || !dataReferenciaInicial) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // @ts-expect-error - Function will exist after migration is applied
    const { data, error } = await supabase.rpc('generate_metas_mensais', {
      p_schema: schema,
      p_filial_id: filialId,
      p_mes: mes,
      p_ano: ano,
      p_meta_percentual: metaPercentual,
      p_data_referencia_inicial: dataReferenciaInicial
    })

    if (error) {
      console.error('[API/METAS/GENERATE] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Erro ao gerar metas' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/METAS/GENERATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
