import { NavLink } from 'react-router-dom'
import { CircleUserRound, House, Map, Plus, Search } from 'lucide-react'
import { Icon } from '../ui/Icon.jsx'

const TABS = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/explorar', label: 'Explorar', icon: Search },
  { to: '/relatar', label: 'Relatar', icon: Plus, action: true },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/perfil', label: 'Perfil', icon: CircleUserRound },
]

const itemClass = (isActive) =>
  `flex min-h-(--tap-min) flex-col items-center gap-1 px-1 py-2 text-[0.8125rem] ${
    isActive ? 'font-bold text-primary-ink' : 'font-normal text-ink-muted'
  }`

/**
 * Navegação principal: Início, Explorar, + (relatar um problema), Mapa e Perfil.
 * Ícone + texto em cada aba. A aba ativa se destaca por forma (pílula com borda),
 * peso do texto e aria-current, não só por cor. O "+" é um botão redondo cheio,
 * porque é uma ação (criar), não um lugar.
 */
export function BottomNavigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="hairline shrink-0 border-x-0 border-b-0 border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ to, label, icon, action }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-label={action ? 'Relatar um problema' : undefined}
              className={({ isActive }) => itemClass(isActive)}
            >
              {({ isActive }) =>
                action ? (
                  <>
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                      <Icon icon={icon} size="lg" />
                    </span>
                    <span aria-hidden="true">{label}</span>
                  </>
                ) : (
                  <>
                    <span
                      className={`hairline flex h-8 min-w-12 items-center justify-center rounded-full px-3 transition-colors ${
                        isActive ? 'border-primary bg-primary-soft' : 'border-transparent'
                      }`}
                    >
                      <Icon icon={icon} size="lg" />
                    </span>
                    {label}
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
