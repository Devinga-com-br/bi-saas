import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

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
  filial_id: z.string().optional(),
  curvas: z.string().optional().default('A,B'),
  apenas_ativos: z.string().optional().default('true'),
  apenas_ruptura: z.string().optional().default('true'),
  departamento_id: z.string().optional(),
  busca: z.string().optional(),
  tipo_busca: z.enum(['produto', 'segmento']).optional().default('produto'),
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
      filial_id,
      curvas,
      apenas_ativos,
      apenas_ruptura,
      departamento_id,
      busca,
      tipo_busca,
      page,
      page_size,
    } = validation.data

    // Converter parâmetros
    const curvasArray = curvas.split(',').map(c => c.trim())
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(page_size, 10)

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Converter filial_id para número ou null, respeitando autorizações
    let filialIdNum: number | null = null
    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      if (filial_id && filial_id !== 'all') {
        const parsed = parseInt(filial_id, 10)
        if (!isNaN(parsed)) {
          filialIdNum = parsed
        }
      }
    } else {
      // User has restrictions - filter by authorized branches
      if (!filial_id || filial_id === 'all') {
        // Request for all - use first authorized branch (RPC expects single value)
        // Frontend should handle multiple authorized branches
        if (authorizedBranches.length > 0) {
          const parsed = parseInt(authorizedBranches[0], 10)
          if (!isNaN(parsed)) {
            filialIdNum = parsed
          }
        }
      } else {
        // Specific filial requested - check if authorized
        const parsed = parseInt(filial_id, 10)
        if (!isNaN(parsed) && authorizedBranches.includes(filial_id)) {
          filialIdNum = parsed
        } else if (authorizedBranches.length > 0) {
          // Requested filial not authorized - use first authorized
          const firstParsed = parseInt(authorizedBranches[0], 10)
          if (!isNaN(firstParsed)) {
            filialIdNum = firstParsed
          }
        }
      }
    }

    const rpcParams = {
      p_schema: requestedSchema,
      p_filial_id: filialIdNum,
      p_curvas: curvasArray,
      p_apenas_ativos: apenas_ativos === 'true',
      p_apenas_ruptura: apenas_ruptura === 'true',
      p_departamento_id: departamento_id ? parseInt(departamento_id, 10) : null,
      p_busca: busca || null,
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

    // Filtrar dados baseado no tipo de busca
    let filteredData: RupturaItem[] = (data || []) as RupturaItem[]

    if (busca && tipo_busca === 'segmento' && filteredData.length > 0) {
      // Quando buscar por segmento, filtrar por departamento_nome
      const buscaLower = busca.toLowerCase()
      filteredData = filteredData.filter((item: RupturaItem) =>
        item.departamento_nome?.toLowerCase().includes(buscaLower)
      )
    }
    // Nota: quando tipo_busca === 'produto', o RPC já filtra por p_busca no produto_descricao

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
      // Quando filtrar por segmento, recalcular total_records baseado nos dados filtrados
      if (busca && tipo_busca === 'segmento') {
        totalRecords = filteredData.length
      } else {
        totalRecords = filteredData[0].total_records || 0
      }

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
