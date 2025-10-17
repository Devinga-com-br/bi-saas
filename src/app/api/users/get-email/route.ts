import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get current user profile
    const { data: currentProfile } = (await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (!currentProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Only superadmin and admin can get user emails
    if (!['superadmin', 'admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Get user email from auth using admin client
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !authUser.user) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      email: authUser.user.email || '',
      userId: authUser.user.id,
    })
  } catch (error) {
    console.error('Unexpected error getting user email:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao buscar email do usuário' },
      { status: 500 }
    )
  }
}
