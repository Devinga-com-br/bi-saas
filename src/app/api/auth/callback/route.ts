import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Tratar erros do Supabase
  if (error) {
    const message = encodeURIComponent(errorDescription || error)
    return NextResponse.redirect(`${origin}/login?error=${message}`)
  }

  // Processar código de autenticação
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      // Verificar se é uma confirmação de alteração de email
      const type = searchParams.get('type')
      
      if (type === 'email_change') {
        // Redirecionar para login com mensagem de sucesso
        const message = encodeURIComponent('Alteração de email confirmada! Use seu novo email para fazer login.')
        return NextResponse.redirect(`${origin}/login?message=${message}`)
      }
      
      // Login normal - redirecionar para dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Erro ao trocar código por sessão
    const message = encodeURIComponent('Erro ao confirmar. O link pode estar expirado.')
    return NextResponse.redirect(`${origin}/login?error=${message}`)
  }

  // Sem código - redirecionar para login
  return NextResponse.redirect(`${origin}/login`)
}