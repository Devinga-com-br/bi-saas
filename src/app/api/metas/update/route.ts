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
    const { schema, mes, ano, filial_id, metaId, valorMeta, metaPercentual } = body

    // Se tem metaId, é atualização individual de meta
    if (metaId !== undefined) {
      if (!schema || valorMeta === undefined || metaPercentual === undefined) {
        return NextResponse.json(
          { error: 'Parâmetros inválidos para atualização de meta' },
          { status: 400 }
        )
      }

      console.log('[API/METAS/UPDATE] Updating individual meta:', { 
        schema, 
        metaId, 
        valorMeta, 
        metaPercentual 
      })

      // Atualizar meta específica usando RPC
      // @ts-expect-error - Function will exist after migration is applied
      const { data, error } = await supabase.rpc('update_meta_mensal', {
        p_schema: schema,
        p_meta_id: metaId,
        p_valor_meta: valorMeta,
        p_meta_percentual: metaPercentual
      })

      if (error) {
        console.error('[API/METAS/UPDATE] RPC Error:', error)
        return NextResponse.json(
          { 
            error: error.message || 'Erro ao atualizar meta',
            details: error.details || null,
            hint: 'Verifique se a função update_meta_mensal está criada no banco'
          },
          { status: 500 }
        )
      }

      console.log('[API/METAS/UPDATE] Meta updated successfully:', data)

      return NextResponse.json({ 
        message: 'Meta atualizada com sucesso',
        success: true,
        data
      })
    }

    // Senão, é atualização em lote dos valores realizados
    if (!schema || !mes || !ano) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const params: Record<string, number | string> = {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano
    }

    if (filial_id) {
      params.p_filial_id = filial_id
    }

    console.log('[API/METAS/UPDATE] Calling RPC with params:', params)

    // @ts-expect-error - Function will exist after migration is applied
    const { data, error } = await supabase.rpc('atualizar_valores_realizados_metas', params)

    if (error) {
      console.error('[API/METAS/UPDATE] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar valores' },
        { status: 500 }
      )
    }

    console.log('[API/METAS/UPDATE] Success:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/METAS/UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
