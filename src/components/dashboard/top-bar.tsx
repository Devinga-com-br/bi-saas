'use client'

import { UserMenu } from './user-menu'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard 360',
  '/relatorios/ruptura-abcd': 'Ruptura por Curva ABCD',
  '/relatorios/venda-curva': 'Vendas por Curva',
  '/relatorios/previsao-ruptura': 'Previsão de Ruptura',
  '/relatorios/ruptura-venda-60d': 'Ruptura Vendas - Dias sem Giro',
  '/relatorios/perdas': 'Relatório de Perdas',
  '/metas/mensal': 'Metas Mensais',
  '/metas/setor': 'Metas por Setor',
  '/dre-gerencial': 'DRE Gerencial',
  '/configuracoes': 'Configurações',
  '/configuracoes/setores': 'Setores',
  '/usuarios': 'Usuários',
  '/empresas': 'Empresas',
  '/perfil': 'Perfil',
}

export function TopBar() {
  const pathname = usePathname()
  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard'

  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <h1 className="text-lg font-semibold">{pageTitle}</h1>
      <UserMenu />
    </div>
  )
}