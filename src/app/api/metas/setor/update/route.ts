import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { schema, setor_id, filial_id, data, meta_percentual, valor_meta } = body

    if (!schema || !setor_id || !filial_id || !data || meta_percentual === undefined || valor_meta === undefined) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    console.log('[API/METAS/SETOR/UPDATE] Updating meta:', {
      schema,
      setor_id,
      filial_id,
      data,
      meta_percentual,
      valor_meta
    })

    // Atualizar meta usando RPC
    // @ts-expect-error - Function will exist after migration is applied
    const { data: result, error } = await supabase.rpc('update_meta_setor', {
      p_schema: schema,
      p_setor_id: setor_id,
      p_filial_id: filial_id,
      p_data: data,
      p_meta_percentual: meta_percentual,
      p_valor_meta: valor_meta
    })

    if (error) {
      console.error('[API/METAS/SETOR/UPDATE] RPC Error:', error)
      return NextResponse.json(
        {
          error: error.message || 'Erro ao atualizar meta',
          details: error.details || null,
          hint: 'Verifique se a função update_meta_setor está criada no banco'
        },
        { status: 500 }
      )
    }

    console.log('[API/METAS/SETOR/UPDATE] Meta updated successfully:', result)

    return NextResponse.json({
      message: 'Meta atualizada com sucesso',
      success: true,
      data: result
    })

  } catch (error) {
    console.error('[API/METAS/SETOR/UPDATE] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
