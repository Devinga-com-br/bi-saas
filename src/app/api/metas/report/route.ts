import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// FORÇAR ROTA DINÂMICA - NÃO CACHEAR
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schema = searchParams.get('schema')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const requestedFilialId = searchParams.get('filial_id')

    console.log('[API/METAS/REPORT] Request params:', { schema, mes, ano, filialId: requestedFilialId })

    if (!schema || !mes || !ano) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filial to use
    let finalFilialId: number | null = null

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      if (requestedFilialId && requestedFilialId !== 'all') {
        const parsed = parseInt(requestedFilialId, 10)
        if (!isNaN(parsed)) {
          finalFilialId = parsed
        }
      }
    } else {
      // User has restrictions
      if (!requestedFilialId || requestedFilialId === 'all') {
        // Request for all - use first authorized branch
        if (authorizedBranches.length > 0) {
          const parsed = parseInt(authorizedBranches[0], 10)
          if (!isNaN(parsed)) {
            finalFilialId = parsed
          }
        }
      } else {
        // Specific filial requested - check if authorized
        const parsed = parseInt(requestedFilialId, 10)
        if (!isNaN(parsed) && authorizedBranches.includes(requestedFilialId)) {
          finalFilialId = parsed
        } else if (authorizedBranches.length > 0) {
          // Not authorized - use first authorized
          const firstParsed = parseInt(authorizedBranches[0], 10)
          if (!isNaN(firstParsed)) {
            finalFilialId = firstParsed
          }
        }
      }
    }

    const params: Record<string, number | string> = {
      p_schema: schema,
      p_mes: parseInt(mes),
      p_ano: parseInt(ano)
    }

    if (finalFilialId !== null) {
      params.p_filial_id = finalFilialId
    }

    console.log('[API/METAS/REPORT] Calling RPC with params:', params)

    // TEMPORÁRIO: Usar client direto sem cache (igual ao dashboard)
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error} = await (directSupabase as any).rpc('get_metas_mensais_report', params)

    if (error) {
      console.error('[API/METAS/REPORT] RPC Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar metas' },
        { status: 500 }
      )
    }

    console.log('[API/METAS/REPORT] Success, data type:', typeof data)

    return NextResponse.json(data || { metas: [], total_realizado: 0, total_meta: 0, percentual_atingido: 0 })
  } catch (error) {
    console.error('[API/METAS/REPORT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
