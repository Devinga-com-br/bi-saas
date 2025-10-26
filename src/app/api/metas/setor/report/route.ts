import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams

    const schema = searchParams.get('schema')
    const setorId = searchParams.get('setor_id')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const requestedFilialId = searchParams.get('filial_id')

    if (!schema || !setorId || !mes || !ano) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filiais to use (can be null for all, or array of IDs)
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
        // If no valid IDs parsed, finalFilialIds stays null (meaning all)
      }
      // If requestedFilialId is null/empty, finalFilialIds stays null (meaning all)
    } else {
      // User has restrictions - use authorized branches
      if (authorizedBranches.length === 0) {
        return NextResponse.json(
          { error: 'Usuário não possui acesso a nenhuma filial' },
          { status: 403 }
        )
      }

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

    console.log('[API/METAS/SETOR/REPORT] Request params:', {
      schema,
      setorId,
      mes,
      ano,
      requestedFilialId,
      finalFilialIds,
    })

    // Call RPC for each filial and aggregate results
    if (finalFilialIds === null) {
      // Get all filials for this tenant
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      const tenantId = (userProfile as unknown as { tenant_id?: string })?.tenant_id

      if (tenantId) {
        const { data: allBranches } = await supabase
          .from('branches')
          .select('branch_code')
          .eq('tenant_id', tenantId)

        if (allBranches && allBranches.length > 0) {
          finalFilialIds = allBranches
            .map(b => parseInt((b as { branch_code: string }).branch_code, 10))
            .filter(id => !isNaN(id))
        } else {
          finalFilialIds = []
        }
      } else {
        finalFilialIds = []
      }
    }

    // Fetch data for all filials in parallel
    const promises = finalFilialIds.map(async (filialId) => {
      // @ts-expect-error RPC function type not generated yet
      const { data, error } = await supabase.rpc('get_metas_setor_report', {
        p_schema: schema,
        p_setor_id: parseInt(setorId),
        p_mes: parseInt(mes),
        p_ano: parseInt(ano),
        p_filial_id: filialId,
      })

      if (error) {
        console.error(`[API/METAS/SETOR/REPORT] Error for filial ${filialId}:`, error)
        return []
      }

      return data || []
    })

    const results = await Promise.all(promises)
    const allData = results.flat()

    // Group data by date
    interface MetaFilial {
      filial_id: number
      data_referencia: string
      dia_semana_ref: string
      valor_referencia: number
      meta_percentual: number
      valor_meta: number
      valor_realizado: number
      diferenca: number
      diferenca_percentual: number
    }

    interface MetaPorData {
      data: string
      dia_semana: string
      filiais: MetaFilial[]
    }

    const groupedByDate = new Map<string, MetaPorData>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allData.forEach((item: any) => {
      if (!item.data) return

      if (!groupedByDate.has(item.data)) {
        groupedByDate.set(item.data, {
          data: item.data,
          dia_semana: item.dia_semana || '',
          filiais: []
        })
      }

      const group = groupedByDate.get(item.data)!

      // If item.filiais exists (single filial query result), use it
      if (Array.isArray(item.filiais)) {
        group.filiais.push(...item.filiais)
      }
    })

    const aggregatedData = Array.from(groupedByDate.values())
      .sort((a, b) => a.data.localeCompare(b.data))

    console.log('[API/METAS/SETOR/REPORT] Success, dates:', aggregatedData.length, 'total filials:', aggregatedData.reduce((sum, d) => sum + d.filiais.length, 0))
    return NextResponse.json(aggregatedData)
  } catch (error) {
    console.error('[API/METAS/SETOR/REPORT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
