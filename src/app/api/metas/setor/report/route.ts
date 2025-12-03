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

    // Try optimized function first (if available), fallback to old function
    let allData, error

    const rpcParams = {
      p_schema: schema,
      p_setor_id: parseInt(setorId),
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_ids: finalFilialIds && finalFilialIds.length > 0 ? finalFilialIds : null,
    }

    console.log('[API/METAS/SETOR/REPORT] 🔍 Calling RPC with params:', JSON.stringify(rpcParams, null, 2))

    // USAR CLIENT DIRETO SEM CACHE (igual ao módulo metas mensais)
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optimizedResult = await (directSupabase as any).rpc('get_metas_setor_report_optimized', rpcParams)

    console.log('[API/METAS/SETOR/REPORT] 🔍 Raw optimizedResult:', {
      hasError: !!optimizedResult.error,
      errorMessage: optimizedResult.error?.message,
      errorDetails: optimizedResult.error?.details,
      errorHint: optimizedResult.error?.hint,
      dataType: typeof optimizedResult.data,
      dataIsArray: Array.isArray(optimizedResult.data),
      dataLength: Array.isArray(optimizedResult.data) ? optimizedResult.data.length : 'N/A',
      dataIsNull: optimizedResult.data === null,
      dataIsUndefined: optimizedResult.data === undefined,
    })

    // Use optimized if no error (even if empty array - that's valid when no metas exist)
    const optimizedData = optimizedResult.data
    const dataStr = optimizedData ? JSON.stringify(optimizedData).substring(0, 500) : 'null'
    console.log('[API/METAS/SETOR/REPORT] 🔍 Optimized data preview:', dataStr)

    // Check if optimized function succeeded (no error)
    // Empty array [] is a VALID result when no metas exist for the period
    const optimizedSucceeded = !optimizedResult.error && (
      Array.isArray(optimizedData) || // Array (even empty) is valid
      (typeof optimizedData === 'object' && optimizedData !== null)
    )

    console.log('[API/METAS/SETOR/REPORT] 🔍 Data validation:', {
      optimizedDataExists: !!optimizedData,
      isArray: Array.isArray(optimizedData),
      arrayLength: Array.isArray(optimizedData) ? optimizedData.length : 'N/A',
      isObject: typeof optimizedData === 'object',
      isNotNull: optimizedData !== null,
      optimizedSucceeded,
      hasError: !!optimizedResult.error,
      willUseOptimized: optimizedSucceeded,
    })

    if (optimizedSucceeded) {
      // Function succeeded - use result (even if empty array)
      allData = optimizedResult.data
      error = optimizedResult.error
      console.log('[API/METAS/SETOR/REPORT] Using optimized function, data length:', Array.isArray(allData) ? allData.length : 'object')
    } else {
      // Optimized function failed - try fallback
      console.log('[API/METAS/SETOR/REPORT] Optimized function error:', optimizedResult.error?.message)

      // @ts-expect-error RPC function type not generated yet
      const fallbackResult = await supabase.rpc('get_metas_setor_report', {
        p_schema: schema,
        p_mes: parseInt(mes),
        p_ano: parseInt(ano),
        p_filial_id: null,
        p_filial_ids: finalFilialIds && finalFilialIds.length > 0 ? finalFilialIds : null,
      })

      allData = fallbackResult.data
      error = fallbackResult.error

      if (error) {
        // Both functions failed
        console.error('[API/METAS/SETOR/REPORT] ⚠️  CRITICAL: Both functions failed')
        console.error('[API/METAS/SETOR/REPORT] ⚠️  Optimized:', optimizedResult.error?.message)
        console.error('[API/METAS/SETOR/REPORT] ⚠️  Fallback:', error.message)

        return NextResponse.json(
          {
            error: 'Function not available',
            message: `Both RPC functions failed: ${error.message}`,
            action: 'Check if RPC functions exist in the schema',
            details: error
          },
          { status: 503 } // Service Unavailable
        )
      }

      console.log('[API/METAS/SETOR/REPORT] Using fallback function, data length:', Array.isArray(allData) ? (allData as unknown[]).length : 'N/A')
    }

    if (error) {
      console.error('[API/METAS/SETOR/REPORT] RPC error:', error)
      throw error
    }

    const resultData = Array.isArray(allData) ? allData : (allData || [])
    const dataLength = Array.isArray(resultData) ? resultData.length : 0
    const totalFilials = Array.isArray(resultData) ? resultData.reduce((sum: number, d: { filiais?: unknown[] }) => sum + (d.filiais?.length || 0), 0) : 0
    console.log('[API/METAS/SETOR/REPORT] Success, dates:', dataLength, 'total filials:', totalFilials)
    return NextResponse.json(resultData)
  } catch (error) {
    console.error('[API/METAS/SETOR/REPORT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
