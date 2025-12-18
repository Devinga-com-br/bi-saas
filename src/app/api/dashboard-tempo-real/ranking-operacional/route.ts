import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { UserProfile } from '@/types'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// FORCAR ROTA DINAMICA - NAO CACHEAR
export const dynamic = 'force-dynamic'
export const revalidate = 0

const querySchema = z.object({
  schema: z.string().min(1),
  filiais: z.string().optional(),
})

async function validateSchemaAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  requestedSchema: string
): Promise<boolean> {
  const { data: profile } = (await supabase
    .from('user_profiles')
    .select('role, can_switch_tenants, tenant_id')
    .eq('id', user.id)
    .single()) as { data: Pick<UserProfile, 'role' | 'can_switch_tenants' | 'tenant_id'> | null }

  if (!profile) return false

  if (profile.role === 'superadmin' && profile.can_switch_tenants) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('supabase_schema', requestedSchema)
      .eq('is_active', true)
      .single()
    return !!tenant && !error
  }

  if (profile.tenant_id) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('supabase_schema')
      .eq('id', profile.tenant_id)
      .single()
    if (error || !tenant) return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tenant as any).supabase_schema === requestedSchema
  }

  return false
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validation = querySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { schema: requestedSchema, filiais } = validation.data

    const hasAccess = await validateSchemaAccess(supabase, user, requestedSchema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filiais to use
    let finalFiliais: number[] | null = null

    if (authorizedBranches === null) {
      if (filiais && filiais !== 'all') {
        finalFiliais = filiais.split(',').map((f) => parseInt(f.trim(), 10)).filter((n) => !isNaN(n))
      }
    } else if (!filiais || filiais === 'all') {
      finalFiliais = authorizedBranches.map((f) => parseInt(f, 10)).filter((n) => !isNaN(n))
    } else {
      const requestedFiliais = filiais.split(',')
      const allowedFiliais = requestedFiliais.filter((f) => authorizedBranches.includes(f))
      finalFiliais =
        allowedFiliais.length > 0
          ? allowedFiliais.map((f) => parseInt(f, 10)).filter((n) => !isNaN(n))
          : authorizedBranches.map((f) => parseInt(f, 10)).filter((n) => !isNaN(n))
    }

    // Direct Supabase client for schema queries
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Query vendas_hoje to get caixa information
    let vendasQuery = directSupabase
      .schema(requestedSchema as 'public')
      .from('vendas_hoje')
      .select('filial_id, cupom, caixa')

    if (finalFiliais && finalFiliais.length > 0) {
      vendasQuery = vendasQuery.in('filial_id', finalFiliais)
    }

    const { data: vendasData, error: vendasError } = await vendasQuery

    if (vendasError) {
      console.error('[API/DASHBOARD-TEMPO-REAL/RANKING-OPERACIONAL] Vendas Query Error:', vendasError.message)
      return NextResponse.json(
        { error: 'Error fetching vendas data', details: vendasError.message },
        { status: 500 }
      )
    }

    // Create a map of cupom -> caixa for lookup
    const cupomCaixaMap = new Map<string, number>()
    if (vendasData) {
      vendasData.forEach((venda) => {
        const key = `${venda.filial_id}-${venda.cupom}`
        cupomCaixaMap.set(key, venda.caixa)
      })
    }

    // Query vendas_hoje_itens
    let itensQuery = directSupabase
      .schema(requestedSchema as 'public')
      .from('vendas_hoje_itens')
      .select('filial_id, cupom, produto_id, cancelado, quantidade_vendida, preco_venda')

    if (finalFiliais && finalFiliais.length > 0) {
      itensQuery = itensQuery.in('filial_id', finalFiliais)
    }

    const { data: itensData, error: itensError } = await itensQuery

    if (itensError) {
      console.error('[API/DASHBOARD-TEMPO-REAL/RANKING-OPERACIONAL] Itens Query Error:', itensError.message)
      return NextResponse.json(
        { error: 'Error fetching itens data', details: itensError.message },
        { status: 500 }
      )
    }

    // Get tenant_id from schema
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('supabase_schema', requestedSchema)
      .single()

    // Get branch names from public.branches filtered by tenant_id
    const { data: branchesData } = await supabase
      .from('branches')
      .select('branch_code, descricao')
      .eq('tenant_id', tenantData?.id || '') as { data: { branch_code: string; descricao: string | null }[] | null }

    const branchNameMap = new Map<string, string>()
    if (branchesData) {
      branchesData.forEach((b) => {
        branchNameMap.set(b.branch_code, b.descricao || `Filial ${b.branch_code}`)
      })
    }

    // Aggregate by filial_id and caixa
    const aggregateMap = new Map<string, {
      filial_id: number
      filial_nome: string
      caixa: number
      skus_venda: Set<number>
      skus_cancelados: Set<number>
      valor_cancelamentos: number
      valor_vendido: number
    }>()

    if (itensData) {
      itensData.forEach((item) => {
        // Lookup caixa from vendas_hoje
        const cupomKey = `${item.filial_id}-${item.cupom}`
        const caixa = cupomCaixaMap.get(cupomKey) || 0

        const key = `${item.filial_id}-${caixa}`
        const quantidade = parseFloat(item.quantidade_vendida) || 0
        const preco = parseFloat(item.preco_venda) || 0
        const valor = quantidade * preco

        if (!aggregateMap.has(key)) {
          aggregateMap.set(key, {
            filial_id: item.filial_id,
            filial_nome: branchNameMap.get(item.filial_id.toString()) || `Filial ${item.filial_id}`,
            caixa: caixa,
            skus_venda: new Set(),
            skus_cancelados: new Set(),
            valor_cancelamentos: 0,
            valor_vendido: 0,
          })
        }

        const entry = aggregateMap.get(key)!

        if (item.cancelado) {
          entry.skus_cancelados.add(item.produto_id)
          entry.valor_cancelamentos += valor
        } else {
          entry.skus_venda.add(item.produto_id)
          entry.valor_vendido += valor
        }
      })
    }

    // Convert to array and transform Sets to counts
    const ranking = Array.from(aggregateMap.values()).map((entry) => ({
      filial_id: entry.filial_id,
      filial_nome: entry.filial_nome,
      caixa: entry.caixa,
      skus_venda: entry.skus_venda.size,
      skus_cancelados: entry.skus_cancelados.size,
      valor_cancelamentos: entry.valor_cancelamentos,
      valor_vendido: entry.valor_vendido,
    }))

    // Sort by valor_vendido descending (default)
    ranking.sort((a, b) => b.valor_vendido - a.valor_vendido)

    console.log('[API/DASHBOARD-TEMPO-REAL/RANKING-OPERACIONAL] Result count:', ranking.length)

    return NextResponse.json({ ranking })
  } catch (e) {
    const error = e as Error
    console.error('Unexpected error in dashboard-tempo-real/ranking-operacional API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}
