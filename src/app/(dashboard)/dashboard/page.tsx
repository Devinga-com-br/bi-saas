import { StatsCard } from '@/components/dashboard/stats-card'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Users,
  FileText,
  Activity,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo ao sistema de Business Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Relatório
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Receita Total"
          value="R$ 45.231,89"
          description="+20.1% em relação ao mês passado"
          icon={TrendingUp}
          trend={{ value: 20.1, isPositive: true }}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Usuários Ativos"
          value="2.350"
          description="+180 novos esta semana"
          icon={Users}
          trend={{ value: 15, isPositive: true }}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Relatórios Gerados"
          value="12"
          description="+3 desde ontem"
          icon={FileText}
          trend={{ value: 33, isPositive: true }}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Taxa de Conversão"
          value="3.24%"
          description="-0.5% vs semana passada"
          icon={Activity}
          trend={{ value: -0.5, isPositive: false }}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Area */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Visão Geral</CardTitle>
                <CardDescription>
                  Desempenho dos últimos 6 meses
                </CardDescription>
              </div>
              <Badge variant="secondary">Este Ano</Badge>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="col-span-3">
          <RecentActivity />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Criar Relatório</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Download className="h-6 w-6" />
              <span>Exportar Dados</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Gerenciar Usuários</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do Sistema
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os serviços operacionais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Último Backup
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Há 2h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Backup automático concluído
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Armazenamento
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45%</div>
            <p className="text-xs text-muted-foreground mt-1">
              2.3 GB de 5 GB utilizados
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}