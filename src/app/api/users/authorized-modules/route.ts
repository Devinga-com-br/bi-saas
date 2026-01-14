/**
 * API: Módulos Autorizados por Usuário
 *
 * Gerencia os módulos que um usuário (role = user) tem acesso.
 * Superadmin e Admin sempre têm acesso full a todos os módulos.
 *
 * Endpoints:
 * - GET: Listar módulos autorizados de um usuário
 * - POST: Atualizar módulos autorizados (substituição completa)
 * - DELETE: Remover todos os módulos autorizados (usado quando role muda para admin/superadmin)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SystemModule } from '@/types/modules'
import { isValidModule, ALL_MODULE_IDS } from '@/types/modules'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * GET /api/users/authorized-modules
 *
 * Lista os módulos autorizados de um usuário
 *
 * Query Parameters:
 * - userId (string): UUID do usuário
 *
 * Response:
 * {
 *   user_id: string
 *   modules: SystemModule[]
 *   role: string
 *   has_full_access: boolean
 * }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 2. Obter perfil do solicitante
    const { data: requesterProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    // 3. Verificar permissões (admin ou superadmin)
    if (!requesterProfile || !['admin', 'superadmin'].includes(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 4. Obter userId dos query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // 5. Obter perfil do usuário alvo
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null }

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 6. Se role é superadmin ou admin, retornar todos os módulos (acesso full)
    if (['superadmin', 'admin'].includes(targetProfile.role)) {
      return NextResponse.json({
        user_id: userId,
        modules: ALL_MODULE_IDS,
        role: targetProfile.role,
        has_full_access: true
      })
    }

    // 7. Se role é user, buscar módulos autorizados
    const { data: authorizedModules, error } = await supabase
      .from('user_authorized_modules')
      .select('module')
      .eq('user_id', userId) as { data: Array<{ module: string }> | null; error: PostgrestError | null }

    if (error) throw error

    const modules = authorizedModules?.map(am => am.module as SystemModule) || []

    return NextResponse.json({
      user_id: userId,
      modules,
      role: targetProfile.role,
      has_full_access: false
    })

  } catch (error) {
    console.error('[API] Get authorized modules error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/authorized-modules
 *
 * Atualiza os módulos autorizados de um usuário (substituição completa)
 *
 * Body:
 * {
 *   user_id: string
 *   modules: SystemModule[]
 * }
 *
 * Response:
 * {
 *   user_id: string
 *   modules: SystemModule[]
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 2. Obter perfil do solicitante
    const { data: requesterProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    // 3. Verificar permissões (admin ou superadmin)
    if (!requesterProfile || !['admin', 'superadmin'].includes(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 4. Obter dados do body
    const body = await request.json()
    const { user_id, modules } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'modules must be an array' },
        { status: 400 }
      )
    }

    // 5. Obter perfil do usuário alvo
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user_id)
      .single() as { data: { role: string } | null }

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 6. Se role é superadmin ou admin, ignorar (acesso full automático)
    if (['superadmin', 'admin'].includes(targetProfile.role)) {
      return NextResponse.json({
        user_id,
        modules: ALL_MODULE_IDS,
        message: 'Superadmin and Admin users have full access to all modules'
      })
    }

    // 7. Validar que todos os módulos são válidos
    const invalidModules = modules.filter(m => !isValidModule(m))
    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid modules: ${invalidModules.join(', ')}` },
        { status: 400 }
      )
    }

    // 8. Validar que pelo menos um módulo foi selecionado
    if (modules.length === 0) {
      return NextResponse.json(
        { error: 'At least one module must be selected' },
        { status: 400 }
      )
    }

    // 9. Deletar todos os módulos existentes do usuário
    const { error: deleteError } = await supabase
      .from('user_authorized_modules')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) throw deleteError

    // 10. Inserir novos módulos
    const records: Array<{ user_id: string; module: string }> = modules.map(module => ({
      user_id,
      module
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('user_authorized_modules')
      .insert(records)

    if (insertError) throw insertError

    // 11. Retornar sucesso
    return NextResponse.json({
      user_id,
      modules,
      message: 'Authorized modules updated successfully'
    })

  } catch (error) {
    console.error('[API] Update authorized modules error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/authorized-modules
 *
 * Remove todos os módulos autorizados de um usuário
 * (usado quando role é alterado para admin ou superadmin)
 *
 * Body:
 * {
 *   user_id: string
 * }
 *
 * Response:
 * {
 *   user_id: string
 *   message: string
 * }
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 2. Obter perfil do solicitante
    const { data: requesterProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    // 3. Verificar permissões (admin ou superadmin)
    if (!requesterProfile || !['admin', 'superadmin'].includes(requesterProfile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 4. Obter dados do body
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // 5. Deletar todos os módulos do usuário
    const { error: deleteError } = await supabase
      .from('user_authorized_modules')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      user_id,
      message: 'All authorized modules removed successfully'
    })

  } catch (error) {
    console.error('[API] Delete authorized modules error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

