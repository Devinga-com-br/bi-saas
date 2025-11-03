import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'
import { subYears, subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

// FORÇAR ROTA DINÂMICA - NÃO CACHEAR
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const schema = searchParams.get('schema')
    const dataInicioParam = searchParams.get('dataInicio')
    const dataFimParam = searchParams.get('dataFim')
    const filiais = searchParams.get('filiais') || searchParams.get('filialId') || 'all' // Aceita ambos os formatos

    console.log('[API/DRE-GERENCIAL] RAW PARAMS:', {
      schema,
      dataInicioParam,
      dataFimParam,
      filiais,
      url: req.url
    })

    if (!schema || !dataInicioParam || !dataFimParam) {
      return NextResponse.json({ error: 'Schema, dataInicio and dataFim parameters are required' }, { status: 400 })
    }

    // Parse dates - but use the original strings to avoid timezone issues
    const dataInicio = new Date(dataInicioParam + 'T00:00:00')
    const dataFim = new Date(dataFimParam + 'T00:00:00')

    console.log('[API/DRE-GERENCIAL] PARSED DATES:', {
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      dataInicioString: dataInicioParam,
      dataFimString: dataFimParam,
      isValidInicio: !isNaN(dataInicio.getTime()),
      isValidFim: !isNaN(dataFim.getTime())
    })

    // Validate dates
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
      return NextResponse.json({ 
        error: 'Datas inválidas',
        dataInicio: dataInicioParam,
        dataFim: dataFimParam
      }, { status: 400 })
    }

    if (dataInicio > dataFim) {
      return NextResponse.json({ 
        error: 'Data inicial não pode ser maior que data final',
        dataInicio: dataInicioParam,
        dataFim: dataFimParam
      }, { status: 400 })
    }

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine final filial(s) to use (same logic as Dashboard API)
    let finalFiliais: string[] | null = null

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      finalFiliais = (filiais && filiais !== 'all') ? filiais.split(',') : null
    } else if (filiais === 'all') {
      // User has restrictions - use authorized branches
      finalFiliais = authorizedBranches
    } else if (filiais) {
      // Filter requested filiais by authorized branches
      const requestedFiliais = filiais.split(',')
      finalFiliais = requestedFiliais.filter(f => authorizedBranches.includes(f))
      if (finalFiliais.length === 0) {
        finalFiliais = authorizedBranches
      }
    } else {
      finalFiliais = authorizedBranches
    }

    // Calculate dates for current period - USE ORIGINAL STRINGS to avoid timezone conversion
    const dataInicioStr = dataInicioParam  // Already in yyyy-MM-dd format
    const dataFimStr = dataFimParam        // Already in yyyy-MM-dd format

    // Calculate dates for PAM (Período Anterior do Mesmo ano - mês anterior completo)
    const pamDataInicioDate = startOfMonth(subMonths(dataInicio, 1))
    const pamDataFimDate = endOfMonth(subMonths(dataInicio, 1))
    const pamDataInicioStr = format(pamDataInicioDate, 'yyyy-MM-dd')
    const pamDataFimStr = format(pamDataFimDate, 'yyyy-MM-dd')
    const pamAno = pamDataInicioDate.getFullYear()

    // Calculate dates for PAA (Período Anterior do Ano anterior - mesmo mês do ano passado)
    const paaDataInicioDate = startOfMonth(subYears(dataInicio, 1))
    const paaDataFimDate = endOfMonth(subYears(dataInicio, 1))
    const paaDataInicioStr = format(paaDataInicioDate, 'yyyy-MM-dd')
    const paaDataFimStr = format(paaDataFimDate, 'yyyy-MM-dd')
    const paaAno = paaDataInicioDate.getFullYear()

    console.log('[API/DRE-GERENCIAL] Fetching with params:', {
      schema,
      requestedFiliais: filiais,
      finalFiliais,
      current: `${dataInicioStr} to ${dataFimStr}`,
      pam: `${pamDataInicioStr} to ${pamDataFimStr} (${pamAno})`,
      paa: `${paaDataInicioStr} to ${paaDataFimStr} (${paaAno})`
    })

    // TEMPORÁRIO: Usar client direto sem cache (igual ao dashboard)
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch current period data using get_dashboard_data (same as dashboard)
    console.log('[API/DRE-GERENCIAL] Calling get_dashboard_data with:', {
      schema_name: schema,
      p_data_inicio: dataInicioStr,
      p_data_fim: dataFimStr,
      p_filiais_ids: finalFiliais
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentData, error: currentError } = await (directSupabase.rpc as any)('get_dashboard_data', {
      schema_name: schema,
      p_data_inicio: dataInicioStr,
      p_data_fim: dataFimStr,
      p_filiais_ids: finalFiliais
    }).single()

    if (currentError) {
      console.error('[API/DRE-GERENCIAL] Current period error:', currentError)
      
      return NextResponse.json({ 
        error: 'Erro ao buscar dados atuais',
        details: currentError.message 
      }, { status: 500 })
    }

    console.log('[API/DRE-GERENCIAL] Current data received:', {
      total_vendas: currentData?.total_vendas,
      total_lucro: currentData?.total_lucro,
      margem_lucro: currentData?.margem_lucro
    })

    // Fetch PAM data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pamData, error: pamError } = await (directSupabase.rpc as any)('get_dashboard_data', {
      schema_name: schema,
      p_data_inicio: pamDataInicioStr,
      p_data_fim: pamDataFimStr,
      p_filiais_ids: finalFiliais
    }).single()

    if (pamError) {
      console.error('[API/DRE-GERENCIAL] PAM error:', pamError)
    }

    console.log('[API/DRE-GERENCIAL] PAM data received:', pamData)

    // Fetch PAA data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paaData, error: paaError } = await (directSupabase.rpc as any)('get_dashboard_data', {
      schema_name: schema,
      p_data_inicio: paaDataInicioStr,
      p_data_fim: paaDataFimStr,
      p_filiais_ids: finalFiliais
    }).single()

    if (paaError) {
      console.error('[API/DRE-GERENCIAL] PAA error:', paaError)
    }

    console.log('[API/DRE-GERENCIAL] PAA data received:', paaData)

    // Map dashboard data to DRE format
    interface DashboardDataResponse {
      total_vendas?: number
      total_lucro?: number
      margem_lucro?: number
    }

    const mapToDreFormat = (data: DashboardDataResponse | null) => ({
      receita_bruta: data?.total_vendas || 0,
      lucro_bruto: data?.total_lucro || 0,
      cmv: (data?.total_vendas || 0) - (data?.total_lucro || 0),
      margem_lucro: data?.margem_lucro || 0
    })

    return NextResponse.json({
      current: mapToDreFormat(currentData),
      pam: {
        data: mapToDreFormat(pamData),
        ano: pamAno
      },
      paa: {
        data: mapToDreFormat(paaData),
        ano: paaAno
      }
    })

  } catch (e) {
    const error = e as Error
    console.error('[API/DRE-GERENCIAL] Unexpected error:', error)
    console.error('[API/DRE-GERENCIAL] Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Ocorreu um erro inesperado',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
