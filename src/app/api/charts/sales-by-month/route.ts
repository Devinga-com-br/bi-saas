
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

    // Call RPC with filiais parameter for branch filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawData, error } = await (supabase as any).rpc('get_sales_by_month_chart', {
      schema_name: requestedSchema,
      p_filiais: finalFiliais || 'all'
    });

    if (error) {
      console.error('[API/CHARTS/SALES-BY-MONTH] RPC Error:', error);
      return NextResponse.json({ error: 'Error fetching chart data', details: error.message }, { status: 500 });
    }

    return NextResponse.json(rawData);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in sales chart API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
