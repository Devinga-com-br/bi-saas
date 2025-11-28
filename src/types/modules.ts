/**
 * Tipos e constantes para o sistema de módulos autorizados
 *
 * Sistema de controle de acesso por módulo para usuários com role = 'user'
 * Superadmin e Admin sempre têm acesso full a todos os módulos
 */

// Tipo dos módulos do sistema (deve corresponder ao ENUM no banco)
export type SystemModule =
  | 'dashboard'
  | 'dre_gerencial'
  | 'metas_mensal'
  | 'metas_setor'
  | 'relatorios_ruptura_abcd'
  | 'relatorios_venda_curva'
  | 'relatorios_ruptura_60d'
  | 'relatorios_perdas'

// Configuração de cada módulo (para exibição e ordenação)
export interface ModuleConfig {
  id: SystemModule
  label: string
  description: string
  order: number
  category: 'main' | 'metas' | 'relatorios'
  route: string
}

// Lista de todos os módulos disponíveis (na ordem especificada)
export const SYSTEM_MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Visão geral do sistema com indicadores principais',
    order: 1,
    category: 'main',
    route: '/dashboard'
  },
  {
    id: 'dre_gerencial',
    label: 'DRE Gerencial',
    description: 'Demonstrativo de Resultado do Exercício',
    order: 2,
    category: 'main',
    route: '/dre-gerencial'
  },
  {
    id: 'metas_mensal',
    label: 'Metas > Meta Mensal',
    description: 'Gestão de metas mensais por filial',
    order: 3,
    category: 'metas',
    route: '/metas/mensal'
  },
  {
    id: 'metas_setor',
    label: 'Metas > Meta por Setor',
    description: 'Gestão de metas por setor de negócio',
    order: 4,
    category: 'metas',
    route: '/metas/setor'
  },
  {
    id: 'relatorios_ruptura_abcd',
    label: 'Relatórios > Ruptura Curva ABCD',
    description: 'Produtos em ruptura por curva ABC',
    order: 5,
    category: 'relatorios',
    route: '/relatorios/ruptura-abcd'
  },
  {
    id: 'relatorios_venda_curva',
    label: 'Relatórios > Venda por Curva',
    description: 'Análise de vendas por curva ABC',
    order: 6,
    category: 'relatorios',
    route: '/relatorios/venda-curva'
  },
  {
    id: 'relatorios_ruptura_60d',
    label: 'Relatórios > Ruptura Venda 60d',
    description: 'Produtos sem venda nos últimos 60 dias',
    order: 7,
    category: 'relatorios',
    route: '/relatorios/ruptura-venda-60d'
  },
  {
    id: 'relatorios_perdas',
    label: 'Perdas > Relatório de Perdas',
    description: 'Análise de perdas por departamento e produto',
    order: 8,
    category: 'relatorios',
    route: '/relatorios/perdas'
  }
]

// Mapeamento de módulo para configuração (para acesso rápido)
export const MODULE_CONFIG_MAP: Record<SystemModule, ModuleConfig> =
  SYSTEM_MODULES.reduce((acc, module) => {
    acc[module.id] = module
    return acc
  }, {} as Record<SystemModule, ModuleConfig>)

// Tipo para módulo autorizado (do banco)
export interface UserAuthorizedModule {
  user_id: string
  module: SystemModule
  created_at: string
}

// Request body para atualizar módulos autorizados
export interface UpdateAuthorizedModulesRequest {
  user_id: string
  modules: SystemModule[]
}

// Response da API de módulos autorizados
export interface AuthorizedModulesResponse {
  user_id: string
  modules: SystemModule[]
}

// Helper: Obter módulos por categoria
export function getModulesByCategory(category: ModuleConfig['category']): ModuleConfig[] {
  return SYSTEM_MODULES.filter(m => m.category === category)
}

// Helper: Obter label do módulo
export function getModuleLabel(moduleId: SystemModule): string {
  return MODULE_CONFIG_MAP[moduleId]?.label || moduleId
}

// Helper: Obter route do módulo
export function getModuleRoute(moduleId: SystemModule): string {
  return MODULE_CONFIG_MAP[moduleId]?.route || '/'
}

// Helper: Verificar se módulo existe
export function isValidModule(moduleId: string): moduleId is SystemModule {
  return SYSTEM_MODULES.some(m => m.id === moduleId)
}

// Constante: IDs de todos os módulos (para seleção rápida)
export const ALL_MODULE_IDS: SystemModule[] = SYSTEM_MODULES.map(m => m.id)

// Constante: Módulos padrão para novos usuários (Dashboard + DRE)
export const DEFAULT_USER_MODULES: SystemModule[] = [
  'dashboard',
  'dre_gerencial'
]
