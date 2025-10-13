'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const trimmedPassword = password.trim()

    // Validações
    if (trimmedPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    try {
      console.log('Atualizando senha...')

      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      })

      if (error) {
        console.error('Erro ao atualizar senha:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      console.log('Senha atualizada com sucesso')

      // Redireciona para o dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError('Erro ao redefinir senha. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo de 6 caracteres
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          minLength={6}
        />
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir senha'}
      </Button>
    </form>
  )
}
