import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'
import { validateSchemaAccess } from '@/lib/security/validate-schema'

// Interface para os dados retornados do RPC
interface RupturaItem {
  total_records: number
  departamento_id: number
  departamento_nome: string
  produto_id: number
  filial_id: number
  filial_nome: string
  produto_descricao: string
  curva_lucro: string | null
  curva_venda: string
  estoque_atual: number
  venda_media_diaria_60d: number
  dias_de_estoque: number | null
  preco_venda: number
  filial_transfer_id: number | null
  filial_transfer_nome: string | null
  estoque_transfer: number | null
}

// Schema de validação
const querySchema = z.object({
  schema: z.string().min(1),
  filial_ids: z.string().optional(), // Mudou para plural (array via string)
  curvas: z.string().optional().default('A,B'),
  apenas_ativos: z.string().optional().default('true'),
  apenas_ruptura: z.string().optional().default('true'),
  departamento_ids: z.string().optional(), // Mudou para plural (array via string)
  setor_ids: z.string().optional(), // NOVO: filtro por setores
  busca: z.string().optional(),
  tipo_busca: z.enum(['produto', 'departamento', 'setor']).optional().default('departamento'),
  page: z.string().optional().default('1'),
  page_size: z.string().optional().default('50'),
})

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    const {
      schema: requestedSchema,
      filial_ids,
      curvas,
      apenas_ativos,
      apenas_ruptura,
      departamento_ids,
      setor_ids,
      busca,
      tipo_busca,
      page,
      page_size,
    } = validation.data

    // Validar acesso ao schema
    const hasAccess = await validateSchemaAccess(supabase, user, requestedSchema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Converter parâmetros
    const curvasArray = curvas.split(',').map(c => c.trim())
    const pageNum = parseInt(page, 10)
    const pageSizeNum = Math.min(parseInt(page_size, 10), 10000) // Limite máximo

    // Converter filial_ids para array de números
    const filialIdsArray = filial_ids
      ? filial_ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
      : null

    // Converter departamento_ids para array de números
    const departamentoIdsArray = departamento_ids
      ? departamento_ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
      : null

    // Converter setor_ids para array de números
    const setorIdsArray = setor_ids
      ? setor_ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
      : null

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Aplicar restrições de filiais autorizadas
    let finalFilialIds: number[] | null = null
    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      finalFilialIds = filialIdsArray && filialIdsArray.length > 0 ? filialIdsArray : null
    } else {
      // User has restrictions - filter by authorized branches
      const authorizedIds = authorizedBranches.map(b => parseInt(b, 10)).filter(id => !isNaN(id))
      if (filialIdsArray && filialIdsArray.length > 0) {
        // Filtrar apenas as filiais autorizadas
        finalFilialIds = filialIdsArray.filter(id => authorizedIds.includes(id))
        if (finalFilialIds.length === 0) {
          // Nenhuma filial autorizada selecionada, usar todas autorizadas
          finalFilialIds = authorizedIds.length > 0 ? authorizedIds : null
        }
      } else {
        // Nenhuma filial específica, usar todas autorizadas
        finalFilialIds = authorizedIds.length > 0 ? authorizedIds : null
      }
    }

    // Preparar busca apenas quando tipo_busca === 'produto'
    const buscaText = tipo_busca === 'produto' && busca?.trim() ? busca.trim() : null

    const rpcParams = {
      p_schema: requestedSchema,
      p_filial_ids: finalFilialIds,
      p_curvas: curvasArray,
      p_apenas_ativos: apenas_ativos === 'true',
      p_apenas_ruptura: apenas_ruptura === 'true',
      p_departamento_ids: departamentoIdsArray,
      p_setor_ids: setorIdsArray,
      p_busca: buscaText,
      p_page: pageNum,
      p_page_size: pageSizeNum,
    }

    console.log('[API/RELATORIOS/RUPTURA-ABCD] RPC Params:', JSON.stringify(rpcParams, null, 2))

    // Chamar a função RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('get_ruptura_abcd_report', rpcParams as any) as { data: any[] | null; error: any }

    if (error) {
      console.error('[API/RELATORIOS/RUPTURA-ABCD] RPC Error:', error)
      return NextResponse.json(
        { error: 'Error fetching report data', details: error.message },
        { status: 500 }
      )
    }

    // Filtrar dados baseado no tipo de busca (pós-processamento se necessário)
    const filteredData: RupturaItem[] = (data || []) as RupturaItem[]

    // Nota: filtros por departamento e setor são aplicados na RPC via p_departamento_ids e p_setor_ids
    // Nota: filtro por produto é aplicado na RPC via p_busca
    // Não é necessário filtro adicional no backend

    // Agrupar dados por departamento
    const groupedData: Record<string, {
      departamento_id: number
      departamento_nome: string
      produtos: Array<{
        total_records: number
        departamento_id: number
        departamento_nome: string
        produto_id: number
        filial_id: number
        filial_nome: string
        produto_descricao: string
        curva_lucro: string | null
        curva_venda: string
        estoque_atual: number
        venda_media_diaria_60d: number
        dias_de_estoque: number | null
        preco_venda: number
        filial_transfer_id: number | null
        filial_transfer_nome: string | null
        estoque_transfer: number | null
      }>
    }> = {}

    let totalRecords = 0

    if (filteredData && filteredData.length > 0) {
      totalRecords = filteredData[0].total_records || 0

      filteredData.forEach((item: RupturaItem) => {
        const deptKey = `${item.departamento_id}`
        if (!groupedData[deptKey]) {
          groupedData[deptKey] = {
            departamento_id: item.departamento_id,
            departamento_nome: item.departamento_nome,
            produtos: [],
          }
        }
        groupedData[deptKey].produtos.push(item)
      })
    }

    // Ordenar departamentos alfabeticamente
    const sortedDepartamentos = Object.values(groupedData).sort((a, b) => {
      const nameA = a.departamento_nome.toUpperCase()
      const nameB = b.departamento_nome.toUpperCase()
      
      // Colocar "SEM DEPARTAMENTO" no final
      if (nameA.includes('SEM DEPARTAMENTO')) return 1
      if (nameB.includes('SEM DEPARTAMENTO')) return -1
      
      return nameA.localeCompare(nameB, 'pt-BR')
    })

    return NextResponse.json({
      total_records: totalRecords,
      page: pageNum,
      page_size: pageSizeNum,
      total_pages: Math.ceil(totalRecords / pageSizeNum),
      departamentos: sortedDepartamentos,
    })
  } catch (e) {
    const error = e as Error
    console.error('Unexpected error in ruptura-abcd report API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}
