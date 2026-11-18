import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BatteryFull,
  Camera,
  CloudLightning,
  Flashlight,
  Lock,
  Signal,
  Wifi,
} from 'lucide-react'
import { LogoMark } from '../../components/layout/Logo.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { APP_NAME } from '../../config/appConfig.js'
import { useClock } from '../../context/ClockContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { mapLinkFor, stormAlertFor } from '../../domain/cityFeed.js'
import { cityIdOf } from '../../domain/places.js'
import { listStateItems } from '../../services/stateService.js'
import { useDocumentTitle } from '../../utils/useDocumentTitle.js'

const TITLE = 'Tela de bloqueio (simulação)'

const timeText = (date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const dateText = (date) =>
  date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Notificação do app, no estilo das notificações do celular. É um link: tocar
 * nela abre o mapa no alerta, com os abrigos e pontos de apoio mais próximos.
 */
function StormNotification({ alert }) {
  return (
    <Link
      to={mapLinkFor(alert)}
      className="flex animate-[notification-in_450ms_ease-out_both] flex-col gap-1 rounded-[22px] bg-surface/95 p-3.5 text-ink shadow-lg backdrop-blur-md"
    >
      <span className="flex items-center gap-2 text-xs text-ink-muted">
        <LogoMark className="size-5" />
        <span className="flex-1 font-bold tracking-wide uppercase">{APP_NAME}</span>
        <span>agora</span>
      </span>
      <span className="flex items-center gap-1.5 font-bold">
        <Icon icon={CloudLightning} size="sm" className="text-danger" />
        Alerta de tempestade na sua região
      </span>
      <span className="text-sm">
        {alert.title}. Toque para ver os abrigos mais próximos no mapa.
      </span>
    </Link>
  )
}

/**
 * Simulação da tela de bloqueio do celular com uma notificação do app: um alerta
 * de tempestade no município da pessoa (ou em São Paulo, para visitantes). Tocar
 * na notificação "desbloqueia" e abre o app direto na aba Mapa, no alerta.
 *
 * Fica dentro da moldura de smartphone, mas sem cabeçalho nem menu do app. A
 * hora é a do relógio do app (respeita o relógio de demonstração).
 */
export function LockScreenPage() {
  useDocumentTitle(TITLE)
  const { now, offsetMs } = useClock()
  const { account } = useSession()
  const cityId = account?.neighborhoodId ? cityIdOf(account.neighborhoodId) : null

  const query = useQuery({
    queryKey: ['lockscreen-items', { offsetMs }],
    queryFn: () => listStateItems(),
  })
  const alert = query.data ? stormAlertFor(query.data, { cityId, now }) : null

  return (
    <main className="flex h-full flex-col bg-linear-to-b from-primary-ink via-primary to-black px-4 pb-3 text-white">
      <h1 className="sr-only">{TITLE}</h1>

      <div
        aria-hidden="true"
        className="flex items-center justify-between px-3 pt-3 text-sm font-bold"
      >
        <span className="tabular-nums">{timeText(now)}</span>
        <span className="flex items-center gap-1.5">
          <Icon icon={Signal} size="sm" />
          <Icon icon={Wifi} size="sm" />
          <Icon icon={BatteryFull} size="sm" />
        </span>
      </div>

      <div className="mt-8 flex flex-col items-center gap-1">
        <Icon icon={Lock} size="sm" />
        <p className="mt-1 font-bold first-letter:uppercase">{dateText(now)}</p>
        <p className="font-display text-7xl font-bold tracking-tight tabular-nums">
          {timeText(now)}
        </p>
      </div>

      <section aria-label="Notificações" className="mt-10 flex flex-col gap-2">
        {alert && <StormNotification alert={alert} />}
        {query.isError && (
          <p className="text-center text-sm">Não foi possível carregar a notificação.</p>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-3">
        {alert && (
          <p className="text-center text-sm font-bold">
            Toque na notificação para abrir o app
          </p>
        )}
        <div aria-hidden="true" className="flex items-center justify-between px-6">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/20">
            <Icon icon={Flashlight} />
          </span>
          <span className="flex size-12 items-center justify-center rounded-full bg-white/20">
            <Icon icon={Camera} />
          </span>
        </div>
        <p className="text-center text-xs">
          Simulação: o app ainda não envia notificações ao celular e o alerta é fictício.{' '}
          <Link to="/inicio" className="font-bold underline">
            Abrir o app
          </Link>
        </p>
        <span aria-hidden="true" className="mx-auto h-1.5 w-32 rounded-full bg-white" />
      </div>
    </main>
  )
}
