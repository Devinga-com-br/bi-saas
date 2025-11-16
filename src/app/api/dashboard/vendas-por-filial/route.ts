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
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const requestedFiliais = searchParams.get('filiais') || 'all'
    const filterType = searchParams.get('filter_type') || 'month' // 'month', 'year', 'custom'

    if (!schema || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: schema, data_inicio, data_fim' },
        { status: 400 }
      )
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filiais to use
    let finalFiliais: string

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      finalFiliais = requestedFiliais
    } else if (requestedFiliais === 'all') {
      // User requested all but has restrictions - use authorized branches as comma-separated string
      finalFiliais = authorizedBranches.join(',')
    } else {
      // User requested specific filiais - filter by authorized
      const requestedArray = requestedFiliais.split(',').map(f => f.trim())
      const allowedFiliais = requestedArray.filter(f => authorizedBranches.includes(f))

      // If none of requested filiais are authorized, use all authorized
      finalFiliais = allowedFiliais.length > 0
        ? allowedFiliais.join(',')
        : authorizedBranches.join(',')
    }

    console.log('[API/DASHBOARD/VENDAS-POR-FILIAL] Params:', {
      schema,
      dataInicio,
      dataFim,
      requestedFiliais,
      finalFiliais,
      filterType,
      authorizedBranches
    })

    // TEMPORÁRIO: Usar client direto sem cache (igual ao dashboard)
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Chamar função RPC
    const { data, error } = await directSupabase.rpc('get_vendas_por_filial', {
      p_schema: schema,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
      p_filiais: finalFiliais,
      p_filter_type: filterType
    } as never)

    if (error) {
      console.error('[API/DASHBOARD/VENDAS-POR-FILIAL] RPC Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('[API/DASHBOARD/VENDAS-POR-FILIAL] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
