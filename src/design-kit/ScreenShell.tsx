import type { ReactNode } from 'react'
import { BottomNav } from '../components/BottomNav'

type Props = {
  children: ReactNode
  hideNav?: boolean
}

export function ScreenShell({ children, hideNav }: Props) {
  return (
    <div className="app-shell safe-top">
      <main className="app-main">{children}</main>
      {!hideNav ? <BottomNav /> : null}
    </div>
  )
}
