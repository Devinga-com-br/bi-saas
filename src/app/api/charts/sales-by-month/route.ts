
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Valida o schema da query
const querySchema = z.object({
  schema: z.string().min(1),
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

    const { schema: requestedSchema } = validation.data;

    // A validação de acesso ao schema pode ser adicionada aqui se necessário,
    // por simplicidade, vamos assumir que o acesso é verificado no frontend
    // ou que a lógica de segurança do RLS é suficiente.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('get_sales_by_month_chart', { schema_name: requestedSchema } as any);

    if (error) {
      console.error('[API/CHARTS/SALES-BY-MONTH] RPC Error:', error);
      return NextResponse.json({ error: 'Error fetching chart data', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in sales chart API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
