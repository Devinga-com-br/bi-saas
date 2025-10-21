import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get authorized branches for a user
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!currentProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Determine which user's branches to fetch
    const targetUserId = userId || user.id

    // Only admins and superadmins can view other users' authorized branches
    if (targetUserId !== user.id && !['admin', 'superadmin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Fetch authorized branches
    const { data, error } = await supabase
      .from('user_authorized_branches')
      .select(`
        id,
        user_id,
        branch_id,
        created_at,
        branch:branches (
          id,
          nome,
          codigo
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Add authorized branch for a user
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!currentProfile || !['admin', 'superadmin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, branchId } = body

    if (!userId || !branchId) {
      return NextResponse.json({ error: 'userId e branchId são obrigatórios' }, { status: 400 })
    }

    // Insert authorized branch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_authorized_branches')
      .insert({
        user_id: userId,
        branch_id: branchId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remove authorized branch for a user
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const branchId = searchParams.get('branchId')

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!currentProfile || !['admin', 'superadmin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!userId || !branchId) {
      return NextResponse.json({ error: 'userId e branchId são obrigatórios' }, { status: 400 })
    }

    // Delete authorized branch
    const { error } = await supabase
      .from('user_authorized_branches')
      .delete()
      .eq('user_id', userId)
      .eq('branch_id', branchId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
