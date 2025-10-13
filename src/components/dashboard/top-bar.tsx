'use client'

import { UserMenu } from './user-menu'
import { CompanySwitcher } from './company-switcher'

export function TopBar() {
  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <CompanySwitcher />
      <UserMenu />
    </div>
  )
}