import { BarChart3, CalendarDays, Home, MoreHorizontal } from 'lucide-react'
import { NavLink } from 'react-router-dom'
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
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav__inner">
        {items.map(({ to, key, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
          >
            <Icon size={22} strokeWidth={2.2} aria-hidden />
            {t(key, settings.locale)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
