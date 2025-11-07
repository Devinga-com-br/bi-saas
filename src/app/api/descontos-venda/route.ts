import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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

    // Usar RPC para buscar dados do schema customizado
    const { data: descontos, error } = await (supabase as SupabaseClient).rpc('get_descontos_venda', {
      p_schema: schema
    })

    if (error) {
      console.error('Erro ao buscar descontos:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json(descontos || [])
  } catch (error) {
    console.error('Erro catch:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
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
    const { filial_id, data_desconto, valor_desconto, desconto_custo, observacao, schema } = body

    // Validar campos obrigatórios
    if (!filial_id || !data_desconto || valor_desconto === undefined || desconto_custo === undefined || !schema) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: filial_id, data_desconto, valor_desconto, desconto_custo, schema' },
        { status: 400 }
      )
    }

    // Validar valor positivo
    if (valor_desconto < 0) {
      return NextResponse.json(
        { error: 'Valor do desconto deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Validar desconto_custo positivo
    if (desconto_custo < 0) {
      return NextResponse.json(
        { error: 'Desconto custo deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Inserir desconto usando RPC
    const { data, error } = await (supabase as SupabaseClient).rpc('insert_desconto_venda', {
      p_schema: schema,
      p_filial_id: parseInt(filial_id),
      p_data_desconto: data_desconto,
      p_valor_desconto: parseFloat(valor_desconto),
      p_desconto_custo: parseFloat(desconto_custo),
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

      return NextResponse.json({ error: error.message }, { status: 500 })
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
    const { id, filial_id, data_desconto, valor_desconto, desconto_custo, observacao, schema } = body

    // Validar campos obrigatórios
    if (!id || !filial_id || !data_desconto || valor_desconto === undefined || desconto_custo === undefined || !schema) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: id, filial_id, data_desconto, valor_desconto, desconto_custo, schema' },
        { status: 400 }
      )
    }

    // Validar valor positivo
    if (valor_desconto < 0) {
      return NextResponse.json(
        { error: 'Valor do desconto deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Validar desconto_custo positivo
    if (desconto_custo < 0) {
      return NextResponse.json(
        { error: 'Desconto custo deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Atualizar desconto usando RPC
    const { data, error } = await (supabase as SupabaseClient).rpc('update_desconto_venda', {
      p_schema: schema,
      p_id: id,
      p_filial_id: parseInt(filial_id),
      p_data_desconto: data_desconto,
      p_valor_desconto: parseFloat(valor_desconto),
      p_desconto_custo: parseFloat(desconto_custo),
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

      return NextResponse.json({ error: error.message }, { status: 500 })
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

    console.log('[DELETE] Recebido - id:', id, 'schema:', schema)

    // Validar parâmetros
    if (!id || !schema) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: id, schema' },
        { status: 400 }
      )
    }

    // Deletar desconto usando RPC
    console.log('[DELETE] Chamando RPC delete_desconto_venda')
    const { data, error } = await (supabase as SupabaseClient).rpc('delete_desconto_venda', {
      p_schema: schema,
      p_id: id
    })

    console.log('[DELETE] Resultado RPC - data:', data, 'error:', error)

    if (error) {
      console.error('[DELETE] Erro ao deletar desconto:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // data é boolean - true se deletou, false se não encontrou
    if (data === false) {
      return NextResponse.json({ error: 'Desconto não encontrado' }, { status: 404 })
    }

    console.log('[DELETE] Sucesso!')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE] Erro catch:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

