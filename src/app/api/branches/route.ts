// import { type BranchInsert } from '@/types'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Listar filiais de uma empresa
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id é obrigatório' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get branches
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('branch_code', { ascending: true })

    if (error) {
      console.error('Error fetching branches:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar nova filial
// POST - Criar nova filial
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single() as { data: { role: string; tenant_id: string | null } | null }

    if (!currentProfile || !['superadmin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { tenant_id, branch_code, store_code, descricao, cep, rua, numero, bairro, cidade, estado } = body

    // Validate required fields
    if (!tenant_id || !branch_code) {
      return NextResponse.json({ error: 'tenant_id e branch_code são obrigatórios' }, { status: 400 })
    }

    // Validate permissions
    if (currentProfile.role === 'admin' && tenant_id !== currentProfile.tenant_id) {
      return NextResponse.json({ error: 'Admin só pode criar filiais na própria empresa' }, { status: 403 })
    }

    // Check if branch_code already exists
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('branch_code')
      .eq('branch_code', branch_code)
      .single()

    if (existingBranch) {
      return NextResponse.json({
        error: 'Este código de filial já está cadastrado'
      }, { status: 400 })
    }

    const newBranch = {
      tenant_id,
      branch_code,
      store_code: store_code || null,
      descricao: descricao || null,
      cep: cep || null,
      rua: rua || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      estado: estado || null,
    }

    // Create branch
    const { data: branch, error } = await supabase
      .from('branches')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(newBranch as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating branch:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, branch })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Deletar filial
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const branchCode = searchParams.get('branch_code')

    if (!branchCode) {
      return NextResponse.json({ error: 'branch_code é obrigatório' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single() as { data: { role: string; tenant_id: string | null } | null }

    if (!currentProfile || !['superadmin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Get branch to check tenant
    const { data: branch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('branch_code', branchCode)
      .single()

    if (!branch) {
      return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
    }

    // Validate permissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (currentProfile.role === 'admin' && (branch as any).tenant_id !== currentProfile.tenant_id) {
      return NextResponse.json({ error: 'Admin só pode deletar filiais da própria empresa' }, { status: 403 })
    }

    // Delete branch
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('branch_code', branchCode)

    if (error) {
      console.error('Error deleting branch:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PATCH - Atualizar filial
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const branchCode = searchParams.get('branch_code')

    if (!branchCode) {
      return NextResponse.json({ error: 'branch_code é obrigatório' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single() as { data: { role: string; tenant_id: string | null } | null }

    if (!currentProfile || !['superadmin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Get branch to check tenant
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('tenant_id')
      .eq('branch_code', branchCode)
      .single()

    if (!existingBranch) {
      return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
    }

    // Validate permissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (currentProfile.role === 'admin' && (existingBranch as any).tenant_id !== currentProfile.tenant_id) {
      return NextResponse.json({ error: 'Admin só pode editar filiais da própria empresa' }, { status: 403 })
    }

    const body = await request.json()
    const { store_code, descricao, cep, rua, numero, bairro, cidade, estado } = body

    // Update branch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.from('branches') as any).update({
      store_code: store_code || null,
      descricao: descricao || null,
      cep: cep || null,
      rua: rua || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      estado: estado || null,
      updated_at: new Date().toISOString(),
    })
      .eq('branch_code', branchCode)
      .select()
      .single()
    
    const { data: branch, error } = result

    if (error) {
      console.error('Error updating branch:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, branch })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
