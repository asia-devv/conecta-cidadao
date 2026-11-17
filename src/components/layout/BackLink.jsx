import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Icon } from '../ui/Icon.jsx'

/** Link "Voltar" do topo das telas, com seta e área de toque mínima. */
export function BackLink({ to, children = 'Voltar' }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-(--tap-min) w-fit items-center gap-1.5 rounded-control pr-2 font-bold text-primary"
    >
      <Icon icon={ArrowLeft} />
      {children}
    </Link>
  )
}
