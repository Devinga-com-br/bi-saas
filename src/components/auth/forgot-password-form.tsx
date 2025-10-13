'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })

      if (error) {
        console.error('Erro ao enviar email:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      console.error('Erro inesperado:', err)
      setError('Erro ao enviar email. Tente novamente.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-[#1cca5b]/30 bg-[#1cca5b]/10">
        <CheckCircle2 className="h-4 w-4 text-[#1cca5b]" />
        <AlertDescription className="text-[#1cca5b]">
          Email enviado com sucesso! Verifique sua caixa de entrada e siga as
          instruções para redefinir sua senha.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <p className="text-xs text-gray-500">
          Digite o email da sua conta para receber as instruções de redefinição
        </p>
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
        {loading ? 'Enviando...' : 'Enviar email de redefinição'}
      </Button>
    </form>
  )
}
