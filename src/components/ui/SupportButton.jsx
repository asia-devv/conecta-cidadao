import { HandHeart } from 'lucide-react'
import { Button } from './Button.jsx'

/** Botão de apoiar um relato: mostra se a pessoa já apoiou e quantos apoios o relato tem. */
export function SupportButton({
  supported = false,
  supports = 0,
  pending = false,
  onClick,
}) {
  return (
    <Button
      variant={supported ? 'primary' : 'secondary'}
      icon={HandHeart}
      aria-pressed={supported}
      disabled={pending}
      onClick={onClick}
    >
      {supported ? 'Apoiado' : 'Apoiar'} · {supports}
    </Button>
  )
}
