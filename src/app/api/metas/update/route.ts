import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeErrorResponse } from '@/lib/api/error-handler'
import { isValidSchema } from '@/lib/security/validate-schema'
import { z } from 'zod'

const updateMetaIndividualSchema = z.object({
  schema: z.string().min(1).refine(isValidSchema, 'Schema inválido'),
  metaId: z.string().uuid('ID da meta deve ser um UUID válido'),
  valorMeta: z.number().min(0, 'Valor da meta não pode ser negativo'),
  metaPercentual: z.number().min(0).max(1000, 'Meta percentual deve estar entre 0 e 1000'),
})

const updateMetaLoteSchema = z.object({
  schema: z.string().min(1).refine(isValidSchema, 'Schema inválido'),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2020).max(2100),
  filial_id: z.number().int().positive().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Se tem metaId, é atualização individual de meta
    if (body.metaId !== undefined) {
      const validation = updateMetaIndividualSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: validation.error.flatten() },
          { status: 400 }
        )
      }

      const { schema, metaId, valorMeta, metaPercentual } = validation.data

      console.log('[API/METAS/UPDATE] Updating individual meta:', { 
        schema, 
        metaId, 
        valorMeta, 
        metaPercentual 
      })

      // Atualizar meta específica usando RPC
      // @ts-expect-error - Function will exist after migration is applied
      const { data, error } = await supabase.rpc('update_meta_mensal', {
        p_schema: schema,
        p_meta_id: metaId,
        p_valor_meta: valorMeta,
        p_meta_percentual: metaPercentual
      })

      if (error) {
        console.error('[API/METAS/UPDATE] RPC Error:', error)
        return safeErrorResponse(error, 'metas-update')
      }

      console.log('[API/METAS/UPDATE] Meta updated successfully:', data)

      return NextResponse.json({ 
        message: 'Meta atualizada com sucesso',
        success: true,
        data
      })
    }

    // Senão, é atualização em lote dos valores realizados
    const validation = updateMetaLoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { schema, mes, ano, filial_id } = validation.data

    const params: Record<string, number | string> = {
      p_schema: schema,
      p_mes: mes,
      p_ano: ano
    }

    if (filial_id) {
      params.p_filial_id = filial_id
    }

    console.log('[API/METAS/UPDATE] Calling RPC with params:', params)

    // @ts-expect-error - Function will exist after migration is applied
    const { data, error } = await supabase.rpc('atualizar_valores_realizados_metas', params)

    if (error) {
      console.error('[API/METAS/UPDATE] Error:', error)
      
      // Se a tabela não existe, retornar sucesso silencioso (primeira vez)
      if (error.message && error.message.includes('does not exist')) {
        console.log('[API/METAS/UPDATE] ⚠️ Tabela não existe ainda, ignorando atualização')
        return NextResponse.json({
          message: 'Nenhuma meta para atualizar',
          success: true,
          registros_atualizados: 0
        })
      }

      return safeErrorResponse(error, 'metas-update')
    }

    console.log('[API/METAS/UPDATE] Success:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API/METAS/UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
