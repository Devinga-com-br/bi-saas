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

    console.log('[API/METAS/SETOR/REPORT] Request params:', {
      schema,
      setorId,
      mes,
      ano,
      requestedFilialId,
      finalFilialId,
    })

    // @ts-expect-error RPC function type not generated yet
    const { data, error }: { data: unknown; error: unknown } = await supabase.rpc('get_metas_setor_report', {
      p_schema: schema,
      p_setor_id: parseInt(setorId),
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_id: finalFilialId,
    })

    if (error) {
      console.error('[API/METAS/SETOR/REPORT] Error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    console.log('[API/METAS/SETOR/REPORT] Success, data length:', Array.isArray(data) ? data.length : 0)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API/METAS/SETOR/REPORT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
