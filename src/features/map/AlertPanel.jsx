import { Footprints, Bus, Route, ShieldCheck, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge.jsx'
import { IconButton } from '../../components/ui/Button.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { SimulatedBadge } from '../../components/ui/SimulatedBadge.jsx'
import { SAFE_PLACE_KINDS } from '../../data/safePlaces.js'
import { formatDistance } from '../../domain/safePlaces.js'
import { LineBadge } from './LineBadge.jsx'
import { railLine, station } from './railHelpers.js'

const LEVEL = {
  urgent: { label: 'Urgente', tone: 'danger' },
  attention: { label: 'Atenção', tone: 'warn' },
  info: { label: 'Informativo', tone: 'info' },
}

const stationName = (id) => station(id)?.name ?? id

function SafePlaces({ places, selectedId, onSelect, placeName }) {
  return (
    <section aria-labelledby="safe-title" className="flex flex-col gap-2">
      <h3 id="safe-title" className="font-display font-bold">
        Pontos de apoio mais próximos de {placeName}
      </h3>
      <ol className="flex flex-col gap-2">
        {places.map((place, index) => {
          const selected = place.id === selectedId
          return (
            <li key={place.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : place.id)}
                className={`hairline flex w-full items-start gap-3 rounded-card p-3 text-left ${
                  selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ok text-sm font-bold text-surface"
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-bold break-words text-ink">{place.name}</span>
                  <span className="text-sm text-ink-muted">
                    {SAFE_PLACE_KINDS[place.kind].label} · {place.services.join(', ')}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                    <Icon icon={Footprints} size="sm" />
                    {formatDistance(place.meters)} · cerca de {place.walkMinutes} min a pé
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function RouteSteps({ route }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {route.legs.map((leg, i) => {
        const from = stationName(leg.stations[0])
        const to = stationName(leg.stations.at(-1))
        if (leg.type === 'walk') {
          return (
            <li key={i} className="flex items-center gap-2 text-ink">
              <Icon icon={Footprints} size="sm" />A pé de {from} até {to}
            </li>
          )
        }
        if (leg.type === 'bus') {
          return (
            <li key={i} className="flex items-center gap-2 text-ink">
              <Icon icon={Bus} size="sm" />
              Ônibus de apoio de {from} até {to}
            </li>
          )
        }
        const stops = leg.stations.length - 1
        return (
          <li key={i} className="flex items-center gap-2 text-ink">
            <LineBadge lineId={leg.lineId} />
            <span>
              {railLine(leg.lineId)?.name}: {from} → {to}{' '}
              <span className="text-ink-muted">
                ({stops} {stops === 1 ? 'estação' : 'estações'})
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Alternatives({ result, lineId, selectedIndex, onSelect }) {
  const line = railLine(lineId)
  return (
    <section aria-labelledby="alt-title" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-ink">
        <LineBadge lineId={lineId} />
        <span>
          Trecho afetado: <strong>{line?.name}</strong>, de{' '}
          {stationName(result.stretch[0])} a {stationName(result.stretch.at(-1))} (
          {result.stretch.length} estações). Normalmente: cerca de {result.usualMinutes}{' '}
          min.
        </span>
      </p>
      <h3 id="alt-title" className="font-display font-bold">
        Rotas alternativas
      </h3>
      <ol className="flex flex-col gap-2">
        {result.routes.map((route, index) => {
          const selected = index === selectedIndex
          return (
            <li key={index}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(index)}
                className={`hairline flex w-full flex-col gap-2 rounded-card p-3 text-left ${
                  selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
                }`}
              >
                <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                  <Icon icon={route.type === 'bus' ? Bus : Route} />
                  {route.type === 'bus' ? 'Ônibus de apoio' : `Rota ${index + 1}`} · cerca
                  de {route.minutes} min
                  {route.type === 'bus' && <SimulatedBadge />}
                </span>
                <RouteSteps route={route} />
              </button>
            </li>
          )
        })}
      </ol>
      <p className="text-sm text-ink-muted">
        Tempos estimados pela distância entre estações, com 5 min por baldeação; não são
        horários reais.
      </p>
    </section>
  )
}

/**
 * O alerta aberto no mapa, em duas partes: o cabeçalho (o que o alerta diz) fica
 * acima do mapa; o que fazer (pontos de apoio ou rotas alternativas) vem logo
 * abaixo dele, para o mapa aparecer sem rolar a tela.
 */
export function AlertHeader({ alert, onClose }) {
  const level = LEVEL[alert.level] ?? LEVEL.info
  return (
    <section
      aria-labelledby="map-alert-title"
      className={`hairline flex flex-col gap-2 rounded-card border-l-8 border-line p-4 ${
        alert.level === 'urgent'
          ? 'border-l-danger bg-danger-soft'
          : 'border-l-warn bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={level.tone}>{level.label}</Badge>
            <SimulatedBadge />
          </div>
          <h2
            id="map-alert-title"
            className="font-display text-lg leading-snug font-bold"
          >
            {alert.title}
          </h2>
        </div>
        <IconButton icon={X} label="Fechar o alerta no mapa" onClick={onClose} />
      </div>
      <p className="text-ink">{alert.summary}</p>
    </section>
  )
}

export function AlertDetails({
  alert,
  placeName,
  safePlaces,
  selectedPlaceId,
  onSelectPlace,
  alternatives,
  selectedRouteIndex,
  onSelectRoute,
}) {
  return (
    <div className="flex flex-col gap-3">
      {safePlaces && (
        <SafePlaces
          places={safePlaces}
          selectedId={selectedPlaceId}
          onSelect={onSelectPlace}
          placeName={placeName}
        />
      )}
      {alternatives && (
        <Alternatives
          result={alternatives}
          lineId={alert.target.lineId}
          selectedIndex={selectedRouteIndex}
          onSelect={onSelectRoute}
        />
      )}
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Icon icon={ShieldCheck} size="sm" className="mt-0.5" />
        Pontos de apoio e rotas são de demonstração. Numa emergência real, siga a Defesa
        Civil (199) e o Corpo de Bombeiros (193).
      </p>
    </div>
  )
}
