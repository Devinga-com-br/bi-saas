import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateSchemaAccess, isValidSchema } from '@/lib/security/validate-schema'
import { z } from 'zod'

const descontoSchema = z.object({
  schema: z.string().min(1).refine(isValidSchema, 'Schema inválido'),
  filial_id: z.number().int().positive('ID da filial inválido'),
  data_desconto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  valor_desconto: z.number().min(0, 'Valor não pode ser negativo'),
  desconto_custo: z.number().min(0, 'Desconto custo não pode ser negativo'),
  observacao: z.string().max(500).optional(),
})

const descontoUpdateSchema = descontoSchema.extend({
  id: z.string().min(1, 'ID é obrigatório'),
})

// GET - Listar todos os descontos
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const schema = searchParams.get('schema')

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!schema) {
      return NextResponse.json({ error: 'Schema é obrigatório' }, { status: 400 })
    }

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Usar RPC para buscar dados do schema customizado
    const { data: descontos, error } = await (supabase as SupabaseClient).rpc('get_descontos_venda', {
      p_schema: schema
    })

    if (error) {
      console.error('Erro ao buscar descontos:', error)
      return NextResponse.json({ error: 'Erro ao buscar descontos' }, { status: 500 })
    }

    return NextResponse.json(descontos || [])
  } catch (error) {
    console.error('Erro catch:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo desconto
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Obter dados do request
    const body = await request.json()

    // Validar dados com Zod
    const validation = descontoSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { filial_id, data_desconto, valor_desconto, desconto_custo, observacao, schema } = validation.data

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Inserir desconto usando RPC
    const { data, error } = await (supabase as SupabaseClient).rpc('insert_desconto_venda', {
      p_schema: schema,
      p_filial_id: filial_id,
      p_data_desconto: data_desconto,
      p_valor_desconto: valor_desconto,
      p_desconto_custo: desconto_custo,
      p_observacao: observacao || null,
      p_created_by: user.id
    })

    if (error) {
      console.error('Erro ao criar desconto:', error)

      // Tratar erro de duplicate key (filial + data já existe)
      if (error.message?.includes('duplicate') || error.message?.includes('já existe')) {
        return NextResponse.json(
          { error: 'Já existe um desconto lançado para esta filial nesta data' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Erro ao criar desconto' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar desconto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar desconto existente
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Obter dados do request
    const body = await request.json()

    // Validar dados com Zod
    const validation = descontoUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { id, filial_id, data_desconto, valor_desconto, desconto_custo, observacao, schema } = validation.data

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Atualizar desconto usando RPC
    const { data, error } = await (supabase as SupabaseClient).rpc('update_desconto_venda', {
      p_schema: schema,
      p_id: id,
      p_filial_id: filial_id,
      p_data_desconto: data_desconto,
      p_valor_desconto: valor_desconto,
      p_desconto_custo: desconto_custo,
      p_observacao: observacao || null
    })

    if (error) {
      console.error('Erro ao atualizar desconto:', error)

      if (error.message?.includes('duplicate') || error.message?.includes('já existe')) {
        return NextResponse.json(
          { error: 'Já existe um desconto lançado para esta filial nesta data' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Erro ao atualizar desconto' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar desconto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir desconto
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const schema = searchParams.get('schema')

    // Validar parâmetros
    if (!id || !schema) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: id, schema' },
        { status: 400 }
      )
    }

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, schema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Deletar desconto usando RPC
    const { data, error } = await (supabase as SupabaseClient).rpc('delete_desconto_venda', {
      p_schema: schema,
      p_id: id
    })

    if (error) {
      console.error('[DELETE] Erro ao deletar desconto:', error)
      return NextResponse.json({ error: 'Erro ao excluir desconto' }, { status: 500 })
    }

    // data é boolean - true se deletou, false se não encontrou
    if (data === false) {
      return NextResponse.json({ error: 'Desconto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE] Erro catch:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

