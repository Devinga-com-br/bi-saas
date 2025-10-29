
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserAuthorizedBranchCodes } from '@/lib/authorized-branches'

// Valida o schema da query
const querySchema = z.object({
  schema: z.string().min(1),
  filiais: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = querySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.flatten() }, { status: 400 });
    }

    const { schema: requestedSchema, filiais: requestedFiliais } = validation.data;

    // Get user's authorized branches
    const authorizedBranches = await getUserAuthorizedBranchCodes(supabase, user.id)

    // Determine which filiais to use
    let finalFiliais: string | null = null

    if (authorizedBranches === null) {
      // User has no restrictions - use requested value
      if (requestedFiliais && requestedFiliais !== 'all') {
        finalFiliais = requestedFiliais
      }
    } else if (!requestedFiliais || requestedFiliais === 'all') {
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

    console.log('[API/CHARTS/SALES-BY-MONTH] Params:', {
      requestedSchema,
      requestedFiliais,
      finalFiliais,
      authorizedBranches
    })

    // Call RPC with filiais parameter for branch filtering - Sales
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: salesData, error: salesError } = await (supabase as any).rpc('get_sales_by_month_chart', {
      schema_name: requestedSchema,
      p_filiais: finalFiliais || 'all'
    });

    if (salesError) {
      console.error('[API/CHARTS/SALES-BY-MONTH] Sales RPC Error:', salesError);
      return NextResponse.json({ error: 'Error fetching sales chart data', details: salesError.message }, { status: 500 });
    }

    // Call RPC to get expenses by month
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: expensesData, error: expensesError } = await (supabase as any).rpc('get_expenses_by_month_chart', {
      schema_name: requestedSchema,
      p_filiais: finalFiliais || 'all'
    });

    if (expensesError) {
      console.error('[API/CHARTS/SALES-BY-MONTH] Expenses RPC Error:', expensesError);
      // Continue without expenses data if the function doesn't exist yet
      console.warn('[API/CHARTS/SALES-BY-MONTH] Continuing without expense data');
    }

    console.log('[API/CHARTS/SALES-BY-MONTH] Sales data:', salesData?.length || 0, 'records')
    console.log('[API/CHARTS/SALES-BY-MONTH] Expenses data:', expensesData?.length || 0, 'records')
    if (expensesData && expensesData.length > 0) {
      console.log('[API/CHARTS/SALES-BY-MONTH] Sample expense:', expensesData[0])
    }

    // Merge sales and expenses data by month
    const mergedData = (salesData || []).map((sale: { mes: string; total_vendas: number; total_vendas_ano_anterior: number }) => {
      const expense = expensesData?.find((exp: { mes: string }) => exp.mes === sale.mes)
      return {
        mes: sale.mes,
        total_vendas: sale.total_vendas,
        total_vendas_ano_anterior: sale.total_vendas_ano_anterior,
        total_despesas: expense?.total_despesas || 0,
        total_despesas_ano_anterior: expense?.total_despesas_ano_anterior || 0,
      }
    })

    console.log('[API/CHARTS/SALES-BY-MONTH] Merged data sample:', mergedData[0])

    return NextResponse.json(mergedData);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in sales chart API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
