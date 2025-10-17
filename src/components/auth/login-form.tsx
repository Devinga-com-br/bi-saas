'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const { data, error } = await supabase.auth.signInWithPassword({
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

  return (
    <div className="space-y-6">
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

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#1cca5b] focus:ring-[#1cca5b]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700 font-medium">Senha</Label>
            <Link
              href="/esqueci-senha"
              className="text-xs text-[#1cca5b] hover:text-[#1cca5b]/80 transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#1cca5b] focus:ring-[#1cca5b]"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-[#1cca5b] hover:bg-[#1cca5b]/90 text-black font-semibold py-3 transition-colors" 
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}