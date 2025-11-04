import { LoginForm } from '@/components/auth/login-form'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Image from 'next/image'

function LoginFormWrapper() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-11 bg-gray-200 rounded" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-md rounded-xl bg-white">
          <CardHeader className="flex flex-col items-center pt-8 pb-4">
            <Image 
              src="/logo_devinga_mobile.png" 
              alt="DevIngá" 
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </CardHeader>

          <CardContent>
            <LoginFormWrapper />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Não possui uma conta?{' '}
          <a 
            href="https://wa.me/5544997223315" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Solicite aqui.
          </a>
        </p>
      </div>
    </div>
  )
}