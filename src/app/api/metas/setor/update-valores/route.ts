import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { schema, mes, ano } = await req.json()

    console.log('[API/METAS/SETOR/UPDATE] Request params:', { schema, mes, ano })

    if (!schema || !mes || !ano) {
      return NextResponse.json(
        { error: 'Schema, mês e ano são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Chamar função RPC para atualizar valores realizados de TODOS os setores
    // A função processa todos os setores ativos do schema
    const { data, error } = await supabase.rpc('atualizar_valores_realizados_todos_setores', {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano
    })

    if (error) {
      console.error('[API/METAS/SETOR/UPDATE] RPC Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[API/METAS/SETOR/UPDATE] Success:', data)

    return NextResponse.json({ 
      success: true,
      message: 'Valores realizados atualizados com sucesso',
      data 
    })
  } catch (error) {
    console.error('[API/METAS/SETOR/UPDATE] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
