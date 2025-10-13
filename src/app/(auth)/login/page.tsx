import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex">
      {/* Coluna da Esquerda - Visual e Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12">
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

      {/* Coluna da Direita - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
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
              <h1 className="text-3xl font-bold text-white mb-2">Entrar</h1>
              <p className="text-gray-400">
                Digite seu email e senha para acessar o sistema
              </p>
            </div>

            <LoginForm />

            <div className="text-center text-sm">
              <span className="text-gray-400">Não tem uma conta? </span>
              <Link 
                href="/cadastro" 
                className="text-[#1cca5b] hover:text-[#1cca5b]/80 font-medium transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}