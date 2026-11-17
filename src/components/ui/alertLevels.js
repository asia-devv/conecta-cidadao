import { Info, OctagonAlert, TriangleAlert } from 'lucide-react'

/**
 * Aparência de cada nível de alerta/aviso: rótulo, ícone, tom do selo e cor da faixa
 * lateral do cartão. Usada pelos cartões de publicação e do feed estadual.
 */
export const ALERT_LEVELS = {
  info: { label: 'Informativo', icon: Info, tone: 'info', strip: 'border-l-primary' },
  attention: {
    label: 'Atenção',
    icon: TriangleAlert,
    tone: 'warn',
    strip: 'border-l-warn',
  },
  urgent: {
    label: 'Urgente',
    icon: OctagonAlert,
    tone: 'danger',
    strip: 'border-l-danger',
  },
}
