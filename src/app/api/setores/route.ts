import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Lista todos os setores
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')

    if (!schema) {
      return NextResponse.json(
        { error: 'Schema é obrigatório' },
        { status: 400 }
      )
    }

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
