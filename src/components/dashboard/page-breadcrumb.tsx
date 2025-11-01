'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'
import { Fragment } from 'react'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  relatorios: 'Relatórios',
  'ruptura-abcd': 'Ruptura ABCD',
  'venda-curva': 'Venda Curva',
  metas: 'Metas',
  mensal: 'Mensal',
  setor: 'Setor',
  despesas: 'Despesas',
  configuracoes: 'Configurações',
  setores: 'Setores',
  usuarios: 'Usuários',
  empresas: 'Empresas',
  perfil: 'Perfil',
  novo: 'Novo',
  editar: 'Editar',
}

export function PageBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Se estiver na raiz ou dashboard, não mostrar breadcrumb
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null
  }

  const breadcrumbItems = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const label = ROUTE_LABELS[segment] || segment
    const isLast = index === segments.length - 1

    return {
      path,
      label,
      isLast,
    }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              <span>Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <Fragment key={item.path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
