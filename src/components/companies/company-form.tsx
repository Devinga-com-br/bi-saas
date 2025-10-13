'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { maskCNPJInput, getCNPJError } from '@/lib/validations/cnpj'
import { maskPhoneInput, getPhoneError } from '@/lib/validations/phone'
import type { Tenant } from '@/types'

interface CompanyFormProps {
  company?: Tenant
  mode: 'create' | 'edit'
}

export function CompanyForm({ company, mode }: CompanyFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(company?.name || '')
  const [slug, setSlug] = useState(company?.slug || '')
  const [cnpj, setCNPJ] = useState(company?.cnpj || '')
  const [phone, setPhone] = useState(company?.phone || '')
  const [supabaseSchema, setSupabaseSchema] = useState(company?.supabase_schema || '')

  // Generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (mode === 'create') {
      const generatedSlug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleCNPJChange = (value: string) => {
    const masked = maskCNPJInput(value)
    setCNPJ(masked)
  }

  const handlePhoneChange = (value: string) => {
    const masked = maskPhoneInput(value)
    setPhone(masked)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    if (!name.trim()) {
      setError('Nome da empresa é obrigatório')
      return
    }

    if (!slug.trim()) {
      setError('Slug é obrigatório')
      return
    }

    if (cnpj) {
      const cnpjError = getCNPJError(cnpj)
      if (cnpjError) {
        setError(cnpjError)
        return
      }
    }

    if (phone) {
      const phoneError = getPhoneError(phone)
      if (phoneError) {
        setError(phoneError)
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'create') {
        // Create new company
        const tenantData: Record<string, string | boolean | null> = {
          name: name.trim(),
          slug: slug.trim(),
          cnpj: cnpj.trim() || null,
          phone: phone.trim() || null,
          supabase_schema: supabaseSchema.trim() || null,
          is_active: true,
        }

        const { error: insertError } = await supabase
          .from('tenants')
          // @ts-expect-error - Supabase type inference limitation
          .insert(tenantData)

        if (insertError) {
          if (insertError.message.includes('duplicate key')) {
            if (insertError.message.includes('slug')) {
              setError('Já existe uma empresa com este slug')
            } else if (insertError.message.includes('cnpj')) {
              setError('Já existe uma empresa com este CNPJ')
            } else if (insertError.message.includes('supabase_schema')) {
              setError('Já existe uma empresa com este schema')
            } else {
              setError('Erro ao criar empresa: dados duplicados')
            }
          } else {
            setError(`Erro ao criar empresa: ${insertError.message}`)
          }
          setLoading(false)
          return
        }

        router.push('/empresas')
        router.refresh()
      } else {
        // Update existing company
        const updateData: Record<string, string | null> = {
          name: name.trim(),
          slug: slug.trim(),
          cnpj: cnpj.trim() || null,
          phone: phone.trim() || null,
          supabase_schema: supabaseSchema.trim() || null,
        }

        const { error: updateError } = await supabase
          .from('tenants')
          // @ts-expect-error - Supabase type inference limitation
          .update(updateData)
          .eq('id', company!.id)

        if (updateError) {
          if (updateError.message.includes('duplicate key')) {
            if (updateError.message.includes('slug')) {
              setError('Já existe uma empresa com este slug')
            } else if (updateError.message.includes('cnpj')) {
              setError('Já existe uma empresa com este CNPJ')
            } else if (updateError.message.includes('supabase_schema')) {
              setError('Já existe uma empresa com este schema')
            } else {
              setError('Erro ao atualizar empresa: dados duplicados')
            }
          } else {
            setError(`Erro ao atualizar empresa: ${updateError.message}`)
          }
          setLoading(false)
          return
        }

        router.push('/empresas')
        router.refresh()
      }
    } catch {
      setError('Erro inesperado ao salvar empresa')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome da Empresa <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Minha Empresa Ltda"
            required
            disabled={loading}
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: minha-empresa"
            required
            disabled={loading}
            pattern="[a-z0-9-]+"
            title="Apenas letras minúsculas, números e hífens"
          />
          <p className="text-xs text-muted-foreground">
            Identificador único (apenas letras minúsculas, números e hífens)
          </p>
        </div>

        {/* CNPJ */}
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            value={cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            disabled={loading}
            maxLength={18}
          />
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 98765-4321"
            disabled={loading}
            maxLength={15}
          />
        </div>

        {/* Schema Supabase */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="supabase_schema">Schema Supabase</Label>
          <Input
            id="supabase_schema"
            value={supabaseSchema}
            onChange={(e) => setSupabaseSchema(e.target.value)}
            placeholder="Ex: empresa_dados"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Nome do schema no Supabase onde estão os dados financeiros desta empresa
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/empresas')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
