import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const {
      schema,
      setor_id,
      mes,
      ano,
      filial_id: requestedFilialId,
      data_referencia,
      meta_percentual,
    } = body

    if (!schema || !setor_id || !mes || !ano || !data_referencia || !meta_percentual) {
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

    console.log('[API/METAS/SETOR/GENERATE] Request params:', {
      schema,
      setor_id,
      mes,
      ano,
      requestedFilialId,
      finalFilialId,
      data_referencia,
      meta_percentual,
    })

    // @ts-expect-error RPC function type not generated yet
    const { data, error }: { data: unknown; error: unknown } = await supabase.rpc('generate_metas_setor', {
      p_schema: schema,
      p_setor_id: parseInt(setor_id),
      p_mes: parseInt(mes),
      p_ano: parseInt(ano),
      p_filial_id: finalFilialId,
      p_data_referencia_inicial: data_referencia,
      p_meta_percentual: parseFloat(meta_percentual),
    })

    if (error) {
      console.error('[API/METAS/SETOR/GENERATE] Error:', error)
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    console.log('[API/METAS/SETOR/GENERATE] Success:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[API/METAS/SETOR/GENERATE] Exception:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
