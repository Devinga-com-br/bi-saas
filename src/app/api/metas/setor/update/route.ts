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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabase as any).rpc('update_meta_setor', {
      p_schema: schema,
      p_setor_id: setor_id,
      p_filial_id: filial_id,
      p_data: data,
      p_meta_percentual: meta_percentual,
      p_valor_meta: valor_meta
    }) as { data: { success: boolean; error?: string; message?: string; data?: unknown; calculated?: unknown } | null; error: { message: string; details?: string } | null }

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

    // Verificar se a função SQL retornou sucesso
    // A função pode retornar { success: false, error: '...' } sem gerar erro no Supabase
    if (result && result.success === false) {
      console.error('[API/METAS/SETOR/UPDATE] Function returned error:', result)
      return NextResponse.json(
        {
          error: result.error || 'Erro ao atualizar meta',
          success: false
        },
        { status: 400 }
      )
    }

    console.log('[API/METAS/SETOR/UPDATE] Meta updated successfully:', result)

    // Retornar o resultado completo da função (inclui calculated com diferenças)
    return NextResponse.json({
      message: result?.message || 'Meta atualizada com sucesso',
      success: true,
      data: result?.data,
      calculated: result?.calculated
    })

  } catch (error) {
    console.error('[API/METAS/SETOR/UPDATE] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
