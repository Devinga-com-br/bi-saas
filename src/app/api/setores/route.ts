import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Lista todos os setores
// Parâmetros:
// - schema: Schema do tenant (obrigatório)
// - include_level1: Se true, inclui departamento_ids_nivel_1 mapeados (opcional)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const includeLevel1 = searchParams.get('include_level1') === 'true'

    if (!schema) {
      return NextResponse.json(
        { error: 'Schema é obrigatório' },
        { status: 400 }
      )
    }

    // Se precisa dos departamento_ids de nível 1, usa a RPC
    if (includeLevel1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        'get_setores_com_nivel1',
        { p_schema: schema }
      )

      if (error) {
        console.error('[API/SETORES] RPC Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data || [])
    }

    // Query padrão sem mapeamento
    const { data, error } = await supabase
      .schema(schema as 'public')
      .from('setores')
      .select('*')
      .order('nome')

    if (error) {
      console.error('[API/SETORES] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/SETORES] Exception:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Cria um novo setor
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { schema, nome, departamento_nivel, departamento_ids } = body

    if (!schema || !nome || !departamento_nivel || !departamento_ids) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .schema(schema as 'public')
      .from('setores')
      .insert({
        nome,
        departamento_nivel,
        departamento_ids
      })
      .select()
      .single()

    if (error) {
      console.error('[API/SETORES] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/SETORES] Exception:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
