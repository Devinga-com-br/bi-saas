'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Tentando login com:', {
        email,
        passwordLength: password.length,
        passwordHasValue: !!password
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        console.error('Erro no login:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      console.log('Login bem-sucedido:', data)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
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
  )
}