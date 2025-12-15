import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Handle password recovery codes that arrive at the root URL
  // Supabase sometimes sends the code to the Site URL instead of the redirectTo
  const code = request.nextUrl.searchParams.get('code')
  const isRootPath = request.nextUrl.pathname === '/'

  if (code && isRootPath) {
    // Check if this looks like a recovery/auth code (UUID format)
    const isValidCode = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)

    if (isValidCode) {
      console.log('[Middleware] Detected auth code at root, redirecting to /redefinir-senha')
      const url = request.nextUrl.clone()
      url.pathname = '/redefinir-senha'
      // Keep the code parameter
      return NextResponse.redirect(url)
    }
  }

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

  // Verificar se o módulo "Descontos Venda" está habilitado
  if (user && request.nextUrl.pathname.startsWith('/descontos-venda')) {
    // Obter tenant_id do cookie (para suportar superadmin que troca de tenant)
    const tenantCookie = request.cookies.get('current-tenant-id')
    let currentTenantId = tenantCookie?.value

    // Se não tiver cookie, usar o tenant_id do profile
    if (!currentTenantId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      currentTenantId = profile?.tenant_id
    }

    console.log('[Middleware] Descontos Venda - Tenant check:', {
      user_id: user.id,
      tenant_from_cookie: tenantCookie?.value,
      tenant_id_final: currentTenantId
    })

    if (currentTenantId) {
      const { data: parameter } = await supabase
        .from('tenant_parameters')
        .select('parameter_value')
        .eq('tenant_id', currentTenantId)
        .eq('parameter_key', 'enable_descontos_venda')
        .maybeSingle()

      // Log para debug
      console.log('[Middleware] Descontos Venda check:', {
        tenant_id: currentTenantId,
        parameter_found: !!parameter,
        parameter_value: parameter?.parameter_value,
        parameter_type: typeof parameter?.parameter_value,
        will_redirect: !parameter || parameter.parameter_value !== true
      })

      // Redirecionar para dashboard se o módulo estiver desabilitado ou não configurado
      // Aceita tanto boolean true quanto "true" (para compatibilidade)
      const isEnabled = parameter && (parameter.parameter_value === true || parameter.parameter_value === 'true')
      
      if (!isEnabled) {
        console.log('[Middleware] Redirecting to dashboard - module disabled or not configured')
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      console.log('[Middleware] Access granted - module enabled')
    } else {
      // Sem tenant_id, permitir acesso (será bloqueado na página se necessário)
      console.log('[Middleware] No tenant_id found, allowing access (page will validate)')
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