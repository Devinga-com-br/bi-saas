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

    // Determine which filiais to use (can be array of IDs)
    let finalFilialIds: number[] | null = null

    if (authorizedBranches === null) {
      // User has no restrictions
      if (requestedFilialId) {
        // Parse comma-separated IDs or single ID
        const ids = requestedFilialId.split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(id => !isNaN(id))

        if (ids.length > 0) {
          finalFilialIds = ids
        }
      }
    } else {
      // User has restrictions
      if (!requestedFilialId) {
        // No filial requested - use all authorized
        finalFilialIds = authorizedBranches
          .map(id => parseInt(id, 10))
          .filter(id => !isNaN(id))
      } else {
        // Specific filials requested - filter by authorized
        const requestedIds = requestedFilialId.split(',')
          .map(id => id.trim())
          .filter(id => authorizedBranches.includes(id))
          .map(id => parseInt(id, 10))
          .filter(id => !isNaN(id))

        if (requestedIds.length > 0) {
          finalFilialIds = requestedIds
        } else {
          // None of requested are authorized - use all authorized
          finalFilialIds = authorizedBranches
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id))
        }
      }
    }

    const params: Record<string, number | string | number[] | null> = {
      p_schema: schema,
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_id: null,
      p_filial_ids: finalFilialIds
    }

    console.log('[API/METAS/REPORT] 📊 Calling RPC with params:', JSON.stringify(params, null, 2))
    console.log('[API/METAS/REPORT] 🔍 Requested filial:', requestedFilialId)
    console.log('[API/METAS/REPORT] 🔍 Final filial IDs:', finalFilialIds)
    console.log('[API/METAS/REPORT] 🔍 Is single filial?', finalFilialIds?.length === 1)
    console.log('[API/METAS/REPORT] 🔍 Authorized branches:', authorizedBranches)

    // TEMPORÁRIO: Usar client direto sem cache (igual ao dashboard)
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error} = await (directSupabase as any).rpc('get_metas_mensais_report', params)

    if (error) {
      console.error('[API/METAS/REPORT] ❌ RPC Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // Se a tabela não existe (primeira vez), retornar dados vazios ao invés de erro
      if (error.message && error.message.includes('does not exist')) {
        console.log('[API/METAS/REPORT] ⚠️ Tabela não existe ainda, retornando dados vazios')
        return NextResponse.json({
          metas: [],
          total_realizado: 0,
          total_meta: 0,
          percentual_atingido: 0,
          meta_d1: 0,
          realizado_d1: 0,
          percentual_atingido_d1: 0
        })
      }
      
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar metas' },
        { status: 500 }
      )
    }

    console.log('[API/METAS/REPORT] ✅ Success, data type:', typeof data)
    console.log('[API/METAS/REPORT] 📋 Data structure:', {
      hasMetas: !!data?.metas,
      metasLength: data?.metas?.length,
      firstDate: data?.metas?.[0]?.data,
      lastDate: data?.metas?.[data?.metas?.length - 1]?.data,
      totalRealizado: data?.total_realizado,
      totalMeta: data?.total_meta
    })

    return NextResponse.json(data || {
      metas: [],
      total_realizado: 0,
      total_meta: 0,
      percentual_atingido: 0,
      meta_d1: 0,
      realizado_d1: 0,
      percentual_atingido_d1: 0
    })
  } catch (error) {
    console.error('[API/METAS/REPORT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
