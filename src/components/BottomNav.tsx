import { NavLink } from 'react-router-dom'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'

export function BottomNav() {
  const { settings } = useAppData()
  const locale = settings.locale

  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav__inner">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
          }
        >
          <span aria-hidden>🏠</span>
          {t('nav.home', locale)}
        </NavLink>
        <NavLink
          to="/months"
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
          }
        >
          <span aria-hidden>📅</span>
          {t('nav.months', locale)}
        </NavLink>
        <NavLink
          to="/more"
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
          }
        >
          <span aria-hidden>⋯</span>
          {t('nav.more', locale)}
        </NavLink>
      </div>
    </nav>
  )
}
