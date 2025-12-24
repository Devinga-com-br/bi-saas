import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

/* eslint-disable @next/next/no-img-element */

function ResetPasswordFormWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-white flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="/logo_bussola.svg"
              alt="Bússola ByDevIngá"
              style={{ height: '60px', width: 'auto' }}
            />
            <h1 className="text-xl font-bold text-gray-900">Redefinir Senha</h1>
            <p className="text-sm text-gray-500">
              Crie uma nova senha segura para sua conta
            </p>
          </div>

          {/* Form */}
          <ResetPasswordFormWrapper />

          {/* Back to Login Link */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[#4F46E5] hover:text-[#02403D] hover:underline transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
