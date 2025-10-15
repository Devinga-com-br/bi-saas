'use client'

import { UserMenu } from './user-menu'

export function TopBar() {
  return (
    <div className="flex flex-1 items-center justify-end gap-4">
      <UserMenu />
    </div>
  )
}