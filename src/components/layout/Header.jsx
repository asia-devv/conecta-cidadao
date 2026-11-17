import { Link } from 'react-router-dom'
import { APP_NAME } from '../../config/appConfig.js'
import { Logo } from './Logo.jsx'

/**
 * Cabeçalho do app: só a marca (o perfil agora fica no menu inferior).
 * O padding do topo respeita o notch em celulares reais (safe-area) e, na moldura,
 * deixa espaço para a "ilha" decorativa.
 */
export function Header() {
  return (
    <header className="flex shrink-0 items-center justify-between bg-canvas px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 frame:pt-12">
      <Link
        to="/inicio"
        aria-label={`${APP_NAME}, ir para o início`}
        className="rounded-control"
      >
        <Logo />
      </Link>
    </header>
  )
}
