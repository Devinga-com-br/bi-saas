import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      schema,
      setor_id,
      mes,
      ano,
      filial_id,
      data_referencia,
      meta_percentual,
    } = body

    if (!schema || !setor_id || !mes || !ano || !data_referencia || !meta_percentual) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      )
    }

    console.log('[API/METAS/SETOR/GENERATE] Request params:', {
      schema,
      setor_id,
      mes,
      ano,
      filial_id,
      data_referencia,
      meta_percentual,
    })

    // @ts-expect-error RPC function type not generated yet
    const { data, error }: { data: unknown; error: unknown } = await supabase.rpc('generate_metas_setor', {
      p_schema: schema,
      p_setor_id: parseInt(setor_id),
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_id: filial_id && filial_id !== 'all' ? parseInt(filial_id) : null,
      p_data_referencia_inicial: data_referencia,
      p_meta_percentual: parseFloat(meta_percentual),
    })

    if (error) {
      console.error('[API/METAS/SETOR/GENERATE] Error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    console.log('[API/METAS/SETOR/GENERATE] Success:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[API/METAS/SETOR/GENERATE] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
