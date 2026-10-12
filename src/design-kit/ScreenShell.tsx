import type { ReactNode } from 'react'
import { BottomNav } from '../components/BottomNav'
import { PropertySwitcher } from '../components/PropertySwitcher'
import { usePageEnter } from './motion'

type Props = {
  children: ReactNode
  hideNav?: boolean
  showSwitcher?: boolean
  topRight?: ReactNode
}

export function ScreenShell({ children, hideNav, showSwitcher, topRight }: Props) {
  const enter = usePageEnter()
  return (
    <div className={`shell${hideNav ? ' shell--no-nav' : ''}`}>
      {showSwitcher || topRight ? (
        <header className="topbar">
          {showSwitcher ? <PropertySwitcher /> : <span />}
          {topRight}
        </header>
      ) : null}
      <main className={`shell__main ${enter}`}>{children}</main>
      {!hideNav ? <BottomNav /> : null}
    </div>
  )
}
