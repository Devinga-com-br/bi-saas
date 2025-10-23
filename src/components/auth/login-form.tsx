'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CardContent, CardFooter } from '@/components/ui/card'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Info, Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Extrair e processar mensagens da URL
  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    const message = searchParams.get('message')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (message) {
      // Processar mensagens de sucesso do Supabase
      const processedMessage = processSupabaseMessage(message)
      setUrlMessage({ type: 'info', text: processedMessage })
    } else if (errorParam) {
      // Processar erros do Supabase
      const errorText = errorDescription || errorParam
      setUrlMessage({ type: 'error', text: processErrorMessage(errorText) })
    }
  }, [searchParams])

  const processSupabaseMessage = (message: string): string => {
    // Sessão expirada
    if (message.includes('Sessão expirada')) {
      return 'Sua sessão expirou. Por favor, faça login novamente.'
    }
    // Mensagens relacionadas à confirmação de email
    if (message.includes('Confirmation link accepted')) {
      return 'Email de confirmação aceito! Verifique sua nova caixa de entrada para o segundo link de confirmação.'
    }
    if (message.includes('Email confirmed')) {
      return 'Email confirmado com sucesso! Você pode fazer login com seu novo email.'
    }
    if (message.includes('Email change confirmed')) {
      return 'Alteração de email confirmada! Use seu novo email para fazer login.'
    }
    
    // Mensagem padrão
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
    
    // Credenciais inválidas
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid credentials') ||
        errorMessage.includes('invalid email or password')) {
      return 'Login ou senha estão incorretos.'
    }
    
    // Email não confirmado
    if (errorMessage.includes('email not confirmed')) {
      return 'Email não confirmado. Verifique sua caixa de entrada.'
    }
    
    // Usuário não encontrado
    if (errorMessage.includes('user not found')) {
      return 'Usuário não encontrado. Verifique seu email.'
    }
    
    // Conta desabilitada
    if (errorMessage.includes('user is disabled') || errorMessage.includes('account disabled')) {
      return 'Esta conta foi desabilitada. Entre em contato com o administrador.'
    }
    
    // Muitas tentativas
    if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
      return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
    }
    
    // Email inválido
    if (errorMessage.includes('invalid email')) {
      return 'Email inválido. Verifique o formato do email.'
    }
    
    // Erro genérico
    return 'Erro ao fazer login. Verifique suas credenciais e tente novamente.'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Timeout de segurança para evitar travamento
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('Tempo de login excedido. Tente novamente.')
    }, 10000) // 10 segundos

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

      // Login bem-sucedido, redirecionar
      router.push('/dashboard')
      router.refresh()
      
      // Não limpar loading aqui - deixar o dashboard assumir o controle
      // O timeout vai limpar se algo der errado
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
    <>
      <CardContent className="space-y-4 pb-4">
        {/* Mensagem da URL */}
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[#1F1F1F] font-medium">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Informe seu e-mail de acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-[#1F1F1F] font-medium">Senha</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Informe a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={toggleShowPassword}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <div className="text-right mt-1">
              <Link href="/esqueci-senha" className="text-sm text-blue-600 hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}

          <Button 
            type="submit" 
            className="bg-emerald-500 hover:bg-emerald-600 w-full transition-all duration-200" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              'Acessar'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pb-6">
        <a 
          href="https://wa.me/5544997223315" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Precisa de ajuda?
        </a>
      </CardFooter>
    </>
  )
}