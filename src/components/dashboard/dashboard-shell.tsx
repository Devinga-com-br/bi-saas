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
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 shadow-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <TopBar />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-[1600px] mx-auto p-4 py-6 overflow-x-hidden">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}