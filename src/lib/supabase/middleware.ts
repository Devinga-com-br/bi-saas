import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas
  const publicRoutes = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rotas que requerem superadmin
  const superAdminRoutes = ['/empresas']
  const isSuperAdminRoute = superAdminRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rotas que requerem admin ou superadmin
  const adminRoutes = ['/usuarios']
  const isAdminRoute = adminRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Permitir acesso à página de redefinir senha mesmo sem autenticação completa
  const isResetPasswordRoute = request.nextUrl.pathname.startsWith('/redefinir-senha')

  // Redirecionar para login se não autenticado (exceto rotas públicas)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verificar permissões de superadmin
  if (user && isSuperAdminRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Redirecionar para dashboard se não for superadmin
    if (!profile || profile.role !== 'superadmin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Verificar permissões de admin ou superadmin
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Redirecionar para dashboard se não for admin ou superadmin
    if (!profile || !['superadmin', 'admin'].includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirecionar para dashboard se autenticado (exceto na redefinição de senha)
  if (user && isPublicRoute && !isResetPasswordRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}