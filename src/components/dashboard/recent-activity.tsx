import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Activity {
  id: string
  user: string
  action: string
  time: string
  status: 'success' | 'pending' | 'error'
}

const activities: Activity[] = [
  {
    id: '1',
    user: 'Samuel Dutra',
    action: 'Criou um novo relatório de vendas',
    time: 'Há 2 minutos',
    status: 'success',
  },
  {
    id: '2',
    user: 'Sistema',
    action: 'Processou 1.234 registros',
    time: 'Há 15 minutos',
    status: 'success',
  },
  {
    id: '3',
    user: 'Sistema',
    action: 'Backup automático concluído',
    time: 'Há 1 hora',
    status: 'success',
  },
  {
    id: '4',
    user: 'Admin',
    action: 'Atualizou configurações',
    time: 'Há 2 horas',
    status: 'pending',
  },
]

const statusColors = {
  success: 'bg-green-500',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
        <CardDescription>
          Últimas ações realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const initials = activity.user
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div key={activity.id} className="flex items-start gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {activity.user}
                    </p>
                    <div className={`h-2 w-2 rounded-full ${statusColors[activity.status]}`} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
