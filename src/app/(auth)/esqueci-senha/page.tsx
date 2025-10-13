import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Coluna da Esquerda - Visual e Branding (Cinza Escuro) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gray-900">
        {/* Logo */}
        <div className="mb-12">
          <Image
            src="/logo-devinga.png"
            alt="Devinga Logo"
            width={200}
            height={80}
            className="h-20 w-auto"
          />
        </div>
        
        {/* Ilustração */}
        <div className="max-w-md">
          <Image
            src="/undraw_data-reports_l2u3.svg"
            alt="Data Reports Illustration"
            width={400}
            height={300}
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Coluna da Direita - Formulário (Cinza Claro) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/logo-devinga.png"
              alt="Devinga Logo"
              width={150}
              height={60}
              className="h-15 w-auto mx-auto"
            />
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Esqueci minha senha</h1>
              <p className="text-gray-600">
                Informe seu email e enviaremos as instruções para redefinir sua senha
              </p>
            </div>

            <ForgotPasswordForm />

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#1cca5b] hover:text-[#1cca5b]/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                ← Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
