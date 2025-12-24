import { LoginForm } from '@/components/auth/login-form'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

/* eslint-disable @next/next/no-img-element */

function LoginFormWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

export default function LoginPage() {
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
            <h1 className="text-xl font-bold text-gray-900">Bem-vindo ao Bússola 360</h1>
            <p className="text-sm text-gray-600">Inteligência para negócios</p>
            <p className="text-sm text-gray-500">
              Não possui uma conta?{' '}
              <a
                href="https://wa.me/5544997223315"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Solicite aqui.
              </a>
            </p>
          </div>

          {/* Form */}
          <LoginFormWrapper />
        </div>
      </div>
    </div>
  )
}
