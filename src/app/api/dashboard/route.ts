import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { UserProfile } from '@/types'

// Valida os novos parâmetros de filtro
const querySchema = z.object({
  schema: z.string().min(1),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido, esperado YYYY-MM-DD'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido, esperado YYYY-MM-DD'),
  filiais: z.string().optional(), // ex: "1,4,7" ou "all"
});

async function validateSchemaAccess(supabase: ReturnType<typeof createClient>, user: any, requestedSchema: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, can_switch_tenants, tenant_id')
    .eq('id', user.id)
    .single() as { data: Pick<UserProfile, 'role' | 'can_switch_tenants' | 'tenant_id'> | null };

  if (!profile) return false;

  if (profile.role === 'superadmin' && profile.can_switch_tenants) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('supabase_schema', requestedSchema)
      .eq('is_active', true)
      .single();
    return !!tenant && !error;
  }

  if (profile.tenant_id) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('supabase_schema')
      .eq('id', profile.tenant_id)
      .single();
    if (error || !tenant) return false;
    return tenant.supabase_schema === requestedSchema;
  }

  return false;
}

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

    const { schema: requestedSchema, data_inicio, data_fim, filiais } = validation.data;

    const hasAccess = await validateSchemaAccess(supabase, user, requestedSchema);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepara os parâmetros para a função RPC
    const rpcParams = {
      schema_name: requestedSchema,
      p_data_inicio: data_inicio,
      p_data_fim: data_fim,
      p_filiais_ids: (filiais && filiais !== 'all') ? filiais.split(',') : null
    };

    const { data, error } = await supabase.rpc('get_dashboard_data', rpcParams).single();

    if (error) {
      console.error('[API/DASHBOARD] RPC Error:', error);
      return NextResponse.json({ error: 'Error fetching dashboard data', details: error.message }, { status: 500 });
    }

    // A função RPC já retorna todos os dados necessários
    return NextResponse.json(data);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in dashboard API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
