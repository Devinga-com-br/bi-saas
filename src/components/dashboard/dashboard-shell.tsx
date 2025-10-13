import { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { TopBar } from './top-bar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <TopBar />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          <div className="py-4">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}