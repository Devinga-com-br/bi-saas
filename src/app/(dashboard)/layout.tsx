import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { TenantProvider } from '@/contexts/tenant-context'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <DashboardShell>{children}</DashboardShell>
    </TenantProvider>
  )
}