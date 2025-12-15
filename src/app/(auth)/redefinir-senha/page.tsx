import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Image from 'next/image'

function ResetPasswordFormWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-600">Carregando...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-col items-center pt-8 pb-2">
            <Image
              src="/logo_devinga_mobile.png"
              alt="DevIngá"
              width={120}
              height={40}
              className="h-10 w-auto mb-4"
              priority
            />
            <h1 className="text-2xl font-semibold text-gray-900">Redefinir Senha</h1>
            <p className="text-sm text-gray-600 text-center mt-2">
              Crie uma nova senha segura para sua conta
            </p>
          </CardHeader>

          <CardContent className="pb-6">
            <ResetPasswordFormWrapper />
          </CardContent>
        </Card>

        <div className="text-center mt-6">
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
  )
}
