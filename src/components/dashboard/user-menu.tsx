'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, Building2, Check, Moon, Sun } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useTenantContext } from '@/contexts/tenant-context'
import { useTheme } from '@/contexts/theme-context'

export function UserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useTenant()
  const { currentTenant, accessibleTenants, switchTenant, canSwitchTenants } = useTenantContext()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleProfileClick = () => {
    router.push('/perfil')
  }

  const handleTenantSwitch = (tenantId: string) => {
    switchTenant(tenantId)
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {profile?.role}
            </p>
            {currentTenant && (
              <p className="text-xs leading-none text-muted-foreground pt-1">
                {currentTenant.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canSwitchTenants && accessibleTenants.length > 1 && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Building2 className="mr-2 h-4 w-4" />
                <span>Trocar Empresa</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                {accessibleTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant.id)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        currentTenant?.id === tenant.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span className="truncate">{tenant.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-accent" onClick={toggleTheme}>
          <div className="flex items-center">
            {theme === 'dark' ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            <span className="text-sm">Modo Escuro</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}