import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSchemaAccess } from '@/lib/security/validate-schema'

// PUT - Atualiza um setor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { schema, nome, nivel_departamento, departamento_ids } = body
    const { id } = await params

    if (!schema || !nome || !nivel_departamento || !departamento_ids) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .schema(schema)
      .from('setores')
      .update({
        nome,
        nivel_departamento,
        departamento_ids,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API/SETORES] Error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar setor' }, { status: 500 })
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

// DELETE - Exclui um setor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const { id } = await params

    if (!schema) {
      return NextResponse.json(
        { error: 'Schema é obrigatório' },
        { status: 400 }
      )
    }

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .schema(schema as 'public')
      .from('setores')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API/SETORES] Error:', error)
      return NextResponse.json({ error: 'Erro ao excluir setor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API/SETORES] Exception:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
