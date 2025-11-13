import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { TenantProvider } from '@/contexts/tenant-context'
import { RouteGuard } from '@/components/auth/route-guard'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <RouteGuard>
        <DashboardShell>{children}</DashboardShell>
      </RouteGuard>
    </TenantProvider>
  )
}