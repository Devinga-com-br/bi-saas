import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// FORÇAR ROTA DINÂMICA - NÃO CACHEAR
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { schema, filialId: requestedFilialId, mes, ano, metaPercentual, dataReferenciaInicial } = body

    if (!schema || !mes || !ano || metaPercentual === undefined || !dataReferenciaInicial) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filial to use
    let finalFilialId: number | string

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      if (!requestedFilialId) {
        return NextResponse.json(
          { error: 'filialId é obrigatório' },
          { status: 400 }
        )
      }
      finalFilialId = requestedFilialId
    } else {
      // User has restrictions
      if (!requestedFilialId || requestedFilialId === 'all') {
        // Request for all - use first authorized branch
        if (authorizedBranches.length > 0) {
          const parsed = parseInt(authorizedBranches[0], 10)
          if (!isNaN(parsed)) {
            finalFilialId = parsed
          } else {
            return NextResponse.json(
              { error: 'Nenhuma filial autorizada válida encontrada' },
              { status: 400 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Usuário não tem acesso a nenhuma filial' },
            { status: 403 }
          )
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
          } else {
            return NextResponse.json(
              { error: 'Nenhuma filial autorizada válida encontrada' },
              { status: 400 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Usuário não tem acesso a nenhuma filial' },
            { status: 403 }
          )
        }
      }
    }

    console.log('[API/METAS/GENERATE] Params:', {
      schema,
      requestedFilialId,
      finalFilialId,
      mes,
      ano,
      metaPercentual,
      dataReferenciaInicial
    })

    // TEMPORÁRIO: Usar client direto sem cache (igual ao dashboard)
    const { createDirectClient } = await import('@/lib/supabase/admin')
    const directSupabase = createDirectClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (directSupabase as any).rpc('generate_metas_mensais', {
      p_schema: schema,
      p_filial_id: finalFilialId,
      p_mes: mes,
      p_ano: ano,
      p_meta_percentual: metaPercentual,
      p_data_referencia_inicial: dataReferenciaInicial
    })

    if (error) {
      console.error('[API/METAS/GENERATE] Error:', error)
      return NextResponse.json(
        { error: 'Erro ao gerar metas' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/METAS/GENERATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
