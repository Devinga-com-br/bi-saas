import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schema, filialId, mes, ano, page, pageSize } = body

    const supabase = createClient()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .rpc('get_ruptura_curva_a', {
        p_schema: schema,
        p_filial_id: filialId,
        p_mes: mes,
        p_ano: ano,
        p_page: page,
        p_page_size: pageSize
      })
      .range(from, to)

    if (error) {
      console.error('Erro ao buscar dados de ruptura:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data,
      total: count || 0,
      page,
      pageSize
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return Response.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}