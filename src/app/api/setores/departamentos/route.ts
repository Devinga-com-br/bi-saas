import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Lista departamentos de um nível específico
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const nivel = searchParams.get('nivel')

    if (!schema || !nivel) {
      return NextResponse.json(
        { error: 'Schema e nível são obrigatórios' },
        { status: 400 }
      )
    }

    const tableName = `departments_level_${nivel}`

    const { data, error } = await supabase
      .schema(schema as 'public')
      .from(tableName)
      .select('id, departamento_id, descricao')
      .order('descricao')

    if (error) {
      console.error('[API/SETORES/DEPARTAMENTOS] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/SETORES/DEPARTAMENTOS] Exception:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
