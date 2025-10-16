import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const schema = searchParams.get('schema')
    const setorId = searchParams.get('setor_id')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const filialId = searchParams.get('filial_id')

    if (!schema || !setorId || !mes || !ano) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      )
    }

    console.log('[API/METAS/SETOR/REPORT] Request params:', {
      schema,
      setorId,
      mes,
      ano,
      filialId,
    })

    // @ts-expect-error RPC function type not generated yet
    const { data, error }: { data: unknown; error: unknown } = await supabase.rpc('get_metas_setor_report', {
      p_schema: schema,
      p_setor_id: parseInt(setorId),
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_id: filialId ? parseInt(filialId) : null,
    })

    if (error) {
      console.error('[API/METAS/SETOR/REPORT] Error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    console.log('[API/METAS/SETOR/REPORT] Success, data length:', Array.isArray(data) ? data.length : 0)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API/METAS/SETOR/REPORT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
