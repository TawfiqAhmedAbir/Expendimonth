import { BarChart3, CalendarDays, Home, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { haptic } from '../design-kit/motion'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'

const items = [
  { to: '/', key: 'nav.home', Icon: Home, end: true },
  { to: '/months', key: 'nav.months', Icon: CalendarDays },
  { to: '/insights', key: 'nav.insights', Icon: BarChart3 },
  { to: '/more', key: 'nav.more', Icon: MoreHorizontal },
]

export function BottomNav() {
  const { settings } = useAppData()
  const location = useLocation()
  const innerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const active = inner.querySelector('.nav__link--active') as HTMLElement | null
    if (!active) return
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
  }, [location.pathname])

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav__inner" ref={innerRef}>
        <span
          className="nav__indicator"
          aria-hidden
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        />
        {items.map(({ to, key, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
            onClick={() => haptic(6)}
          >
            <Icon size={22} strokeWidth={2.2} aria-hidden />
            {t(key, settings.locale)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
