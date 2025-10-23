import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

function ForgotPasswordFormWrapper() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-11 bg-gray-200 rounded" />
        </div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-col items-center pt-8 pb-2">
            <img 
              src="/logo_devinga_mobile.png" 
              alt="DevIngá" 
              className="h-10 w-auto mb-4"
            />
            <h1 className="text-2xl font-semibold text-gray-900">Recuperar Senha</h1>
            <p className="text-sm text-gray-600 text-center mt-2">
              Informe seu email para receber as instruções
            </p>
          </CardHeader>

          <CardContent>
            <ForgotPasswordFormWrapper />
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