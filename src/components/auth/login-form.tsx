'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Info, Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    const message = searchParams.get('message')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (message) {
      const processedMessage = processSupabaseMessage(message)
      setUrlMessage({ type: 'info', text: processedMessage })
    } else if (errorParam) {
      const errorText = errorDescription || errorParam
      setUrlMessage({ type: 'error', text: processErrorMessage(errorText) })
    }
  }, [searchParams])

  const processSupabaseMessage = (message: string): string => {
    if (message.includes('Sessão expirada')) {
      return 'Sua sessão expirou. Por favor, faça login novamente.'
    }
    if (message.includes('Confirmation link accepted')) {
      return 'Email de confirmação aceito! Verifique sua nova caixa de entrada para o segundo link de confirmação.'
    }
    if (message.includes('Email confirmed')) {
      return 'Email confirmado com sucesso! Você pode fazer login com seu novo email.'
    }
    if (message.includes('Email change confirmed')) {
      return 'Alteração de email confirmada! Use seu novo email para fazer login.'
    }
    return message.replace(/\+/g, ' ')
  }

  const processErrorMessage = (error: string): string => {
    const errorLower = error.toLowerCase()

    if (errorLower.includes('acesso negado')) {
      return 'Acesso negado. Suas credenciais podem ter sido alteradas. Tente fazer login novamente.'
    }
    if (errorLower.includes('email not confirmed')) {
      return 'Email ainda não confirmado. Verifique sua caixa de entrada.'
    }
    if (errorLower.includes('invalid link')) {
      return 'Link inválido ou expirado. Solicite um novo link de confirmação.'
    }
    if (errorLower.includes('expired')) {
      return 'Link expirado. Por favor, solicite um novo link.'
    }
    return error.replace(/\+/g, ' ')
  }

  const getLoginErrorMessage = (error: { message: string; status?: number }): string => {
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes('invalid login credentials') ||
        errorMessage.includes('invalid credentials') ||
        errorMessage.includes('invalid email or password')) {
      return 'Login ou senha estão incorretos.'
    }
    if (errorMessage.includes('email not confirmed')) {
      return 'Email não confirmado. Verifique sua caixa de entrada.'
    }
    if (errorMessage.includes('user not found')) {
      return 'Usuário não encontrado. Verifique seu email.'
    }
    if (errorMessage.includes('user is disabled') || errorMessage.includes('account disabled')) {
      return 'Esta conta foi desabilitada. Entre em contato com o administrador.'
    }
    if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
    }
    if (errorMessage.includes('invalid email')) {
      return 'Email inválido. Verifique o formato do email.'
    }
    return 'Erro ao fazer login. Verifique suas credenciais e tente novamente.'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Tempo de login excedido. Tente novamente.')
    }, 10000)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        clearTimeout(timeoutId)
        setError(getLoginErrorMessage(error))
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Erro inesperado ao fazer login:', err)
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* URL Message Alert */}
      {urlMessage && (
        <Alert
          variant={urlMessage.type === 'error' ? 'destructive' : 'default'}
          className={
            urlMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : urlMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : ''
          }
        >
          {urlMessage.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {urlMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {urlMessage.type === 'info' && <Info className="h-4 w-4" />}
          <AlertDescription>{urlMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-black">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-black">Senha</Label>
            <Link
              href="/esqueci-senha"
              className="text-sm text-[#4F46E5] hover:text-[#02403D] hover:underline transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-[#4F46E5] text-white hover:bg-[#4F46E5]/90 transition-all duration-200"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando...
            </span>
          ) : (
            'Acessar'
          )}
        </Button>
      </form>

      {/* WhatsApp Help Link */}
      <div className="text-center">
        <a
          href="https://wa.me/5544997223315"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#4F46E5] hover:text-[#02403D] hover:underline transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Precisa de ajuda?
        </a>
      </div>
    </div>
  )
}
