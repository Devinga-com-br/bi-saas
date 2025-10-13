'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export function PasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validações
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }

    setIsLoading(true)

    try {
      // Atualiza a senha diretamente
      // O Supabase requer que o usuário esteja autenticado recentemente para trocar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        // Tratamento específico para erro de senha igual
        if (updateError.message.includes('New password should be different')) {
          setMessage({ type: 'error', text: 'A nova senha deve ser diferente da senha atual' })
        } else {
          setMessage({ type: 'error', text: updateError.message })
        }
        setIsLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      setMessage({
        type: 'error',
        text: 'Erro ao alterar senha. Tente novamente.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPasswords.new ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Digite sua nova senha"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('new')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.new ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Digite sua nova senha novamente"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('confirm')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.confirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Alterar senha
      </Button>
    </form>
  )
}
