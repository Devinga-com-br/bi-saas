'use client'

import { ThemeToggle } from './theme-toggle'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard 360',
  '/dashboard-tempo-real': 'Dashboard Tempo Real',
  '/relatorios/ruptura-abcd': 'Ruptura por Curva ABCD',
  '/relatorios/venda-curva': 'Vendas por Curva',
  '/relatorios/previsao-ruptura': 'Previsão de Ruptura',
  '/relatorios/ruptura-venda-60d': 'Ruptura Vendas - Dias sem Giro',
  '/relatorios/perdas': 'Relatório de Perdas',
  '/metas/mensal': 'Metas Mensais',
  '/metas/setor': 'Metas por Setor',
  '/dre-gerencial': 'DRE Gerencial',
  '/dre-comparativo': 'DRE Comparativo',
  '/descontos-venda': 'Descontos de Vendas',
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
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  )
}