import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
      .select('role, tenant_id')
      .eq('id', user.id)
      .single() as { data: { role: string; tenant_id: string | null } | null }

    if (!currentProfile || !['superadmin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role, tenant_id, is_active, authorized_branches } = body

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    // Validate tenant_id (obrigatório exceto para superadmin)
    if (role !== 'superadmin' && !tenant_id) {
      return NextResponse.json({ error: 'tenant_id é obrigatório para este tipo de usuário' }, { status: 400 })
    }

    // Validate role permissions
    if (currentProfile.role === 'admin') {
      // Admin can only create admin, user, viewer in their own tenant
      if (role === 'superadmin') {
        return NextResponse.json({ error: 'Admin não pode criar superadmin' }, { status: 403 })
      }
      if (tenant_id !== currentProfile.tenant_id) {
        return NextResponse.json({ error: 'Admin só pode criar usuários na própria empresa' }, { status: 403 })
      }
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found')
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some(u => u.email === email)

    if (emailExists) {
      return NextResponse.json({
        error: 'Este email já está cadastrado no sistema'
      }, { status: 400 })
    }

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
    }

    // Check if profile already exists (might happen if previous attempt failed)
    // Use supabaseAdmin to bypass RLS
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (existingProfile) {
      // Profile already exists, just update it
      const updateData: Record<string, string | boolean | null> = {
        full_name,
        role,
        tenant_id: role === 'superadmin' ? null : tenant_id,
        is_active: is_active ?? true,
        can_switch_tenants: role === 'superadmin',
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
    } else {
      // Create new profile
      // Use supabaseAdmin to bypass RLS policies
      const profileData: Record<string, string | boolean | null> = {
        id: authData.user.id,
        full_name,
        role,
        tenant_id: role === 'superadmin' ? null : tenant_id,
        is_active: is_active ?? true,
        can_switch_tenants: role === 'superadmin',
      }

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData)

      if (profileError) {
        console.error('Profile error:', profileError)
        // Try to delete the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }
    }

    // Insert authorized branches if provided
    if (authorized_branches && Array.isArray(authorized_branches) && authorized_branches.length > 0) {
      const branchRecords = authorized_branches.map((branchId: string) => ({
        user_id: authData.user.id,
        branch_id: branchId,
      }))

      const { error: branchError } = await supabaseAdmin
        .from('user_authorized_branches')
        .insert(branchRecords)

      if (branchError) {
        console.error('Error inserting authorized branches:', branchError)
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
