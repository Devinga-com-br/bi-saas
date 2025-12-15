import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Image from 'next/image'

function ForgotPasswordFormWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="bg-zinc-900 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Image
              src="/logo_branco.webp"
              alt="DevIngá"
              width={384}
              height={115}
              className="w-full h-auto"
              priority
            />
            <h1 className="text-xl font-bold text-white">Recuperar Senha</h1>
            <p className="text-sm text-zinc-400">
              Informe seu email para receber as instruções
            </p>
          </div>

          {/* Form */}
          <ForgotPasswordFormWrapper />

          {/* Back to Login Link */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline transition-colors"
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
