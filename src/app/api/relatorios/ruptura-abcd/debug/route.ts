import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const schema = searchParams.get('schema') || 'okilao'

    // Testar função diretamente
    const { data: funcao, error: erro5 } = await supabase.rpc('get_ruptura_abcd_report', {
      p_schema: schema,
      p_filial_id: null,
      p_curvas: ['A', 'B'],
      p_apenas_ativos: true,
      p_apenas_ruptura: true,
      p_departamento_id: null,
      p_busca: null,
      p_page: 1,
      p_page_size: 50,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as { data: any[] | null; error: any }

    return NextResponse.json({
      schema,
      error: erro5?.message || null,
      resultado_funcao: {
        total: funcao?.length || 0,
        primeiros_10: funcao?.slice(0, 10) || [],
        funcao_completa: funcao || [],
      },
    })
  } catch (e) {
    const error = e as Error
    return NextResponse.json(
      { error: 'Debug error', details: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
