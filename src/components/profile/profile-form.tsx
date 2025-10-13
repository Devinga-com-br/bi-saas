'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  currentName: string
  userId: string
}

export function ProfileForm({ currentName, userId }: ProfileFormProps) {
  const [fullName, setFullName] = useState(currentName)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'O nome não pode estar vazio' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('user_profiles')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Database types have an inference issue
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Nome atualizado com sucesso!' })
      router.refresh()
    } catch {
      setMessage({
        type: 'error',
        text: 'Erro ao atualizar nome. Tente novamente.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome completo"
          disabled={isLoading}
        />
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

      <Button type="submit" disabled={isLoading || fullName === currentName}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar alterações
      </Button>
    </form>
  )
}
