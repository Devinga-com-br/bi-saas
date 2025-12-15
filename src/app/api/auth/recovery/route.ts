import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const tokenHash = searchParams.get('token_hash')

  console.log('[Recovery API] Received:', { code, token, tokenHash })

  const recoveryToken = code || token || tokenHash

  if (!recoveryToken) {
    console.log('[Recovery API] No token provided')
    return NextResponse.redirect(`${origin}/esqueci-senha?error=Link inválido`)
  }

  const supabase = await createClient()

  // Try to exchange the code for a session
  try {
    // First try exchangeCodeForSession (for PKCE codes)
    console.log('[Recovery API] Trying exchangeCodeForSession...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(recoveryToken)

    if (!error && data.session) {
      console.log('[Recovery API] Session established successfully')
      // Redirect to password reset page (session is now in cookies)
      return NextResponse.redirect(`${origin}/redefinir-senha`)
    }

    if (error) {
      console.error('[Recovery API] exchangeCodeForSession error:', error.message)
    }

    // If that fails, try verifyOtp with recovery type
    console.log('[Recovery API] Trying verifyOtp...')
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: recoveryToken,
      type: 'recovery',
    })

    if (!otpError && otpData.session) {
      console.log('[Recovery API] Session established via verifyOtp')
      return NextResponse.redirect(`${origin}/redefinir-senha`)
    }

    if (otpError) {
      console.error('[Recovery API] verifyOtp error:', otpError.message)
    }

    // All methods failed
    console.log('[Recovery API] All authentication methods failed')
    return NextResponse.redirect(`${origin}/esqueci-senha?error=Link expirado ou inválido. Solicite um novo.`)

  } catch (err) {
    console.error('[Recovery API] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/esqueci-senha?error=Erro ao processar link`)
  }
}
