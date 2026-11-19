import { Gauge, Radio } from 'lucide-react'
import { Badge } from '../../components/ui/Badge.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { TrafficBadge } from '../../components/ui/TrafficBadge.jsx'
import { DEFAULT_THRESHOLDS, compareBySeverity } from '../../domain/traffic.js'
import { formatClock } from '../../utils/format.js'

function summarize(segments) {
  const count = (level) => segments.filter((s) => s.reading.level === level).length
  const parts = [
    [count('heavy'), 'congestionada', 'congestionadas'],
    [count('moderate'), 'com trânsito moderado', 'com trânsito moderado'],
    [count('free'), 'livre', 'livres'],
    [count('unknown'), 'sem dados', 'sem dados'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? `via ${one}` : `vias ${many}`}`)
  return parts.join(', ')
}

/** O que dizer sobre a velocidade da via, conforme a leitura. */
function speedText(segment) {
  const { reading } = segment
  if (reading.status === 'ok') {
    const average = `${reading.speedKmh.toFixed(1).replace('.', ',')} km/h`
    return `Média de ${average} numa via de ${segment.freeFlowKmh} km/h (${reading.percent}% da máxima)`
  }
  if (reading.status === 'offline') return 'O sensor IoT está sem leitura recente.'
  return 'Sem sensor com dados nesta via agora.'
}

/**
 * Lista das vias monitoradas, da mais grave à mais leve. É a versão completa do
 * que o mapa mostra (velocidade, situação e de onde veio o dado).
 */
export function TrafficPanel({
  segments,
  cityName,
  thresholds = DEFAULT_THRESHOLDS,
  selectedId,
  onSelect,
}) {
  if (segments.length === 0) {
    return (
      <p className="text-ink">
        Ainda não há vias monitoradas em {cityName ?? 'este município'}. Os sensores IoT
        desta versão estão em São Paulo.
      </p>
    )
  }

  const sorted = segments
    .map((segment) => ({ ...segment, level: segment.reading.level }))
    .sort(compareBySeverity)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink" aria-live="polite">
        {summarize(segments)}.
      </p>

      <h2 className="sr-only">Vias monitoradas</h2>
      <ul className="flex flex-col gap-3">
        {sorted.map((segment) => {
          const { reading } = segment
          const selected = selectedId === segment.id
          return (
            <li key={segment.id}>
              <article
                aria-labelledby={`seg-${segment.id}`}
                className={`rounded-card bg-surface p-4 ${
                  selected ? 'border-2 border-primary' : 'hairline border-line'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3
                    id={`seg-${segment.id}`}
                    className="font-display text-base font-bold text-ink"
                  >
                    {segment.name}
                  </h3>
                  <TrafficBadge level={segment.level} />
                </div>
                {segment.stretch && (
                  <p className="text-sm text-ink-muted">{segment.stretch}</p>
                )}
                <p className="mt-2 flex items-center gap-2 text-ink">
                  <Icon icon={Gauge} />
                  {speedText(segment)}
                </p>
                {reading.source === 'iot' && (
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                    <Badge tone="info" icon={Radio}>
                      Sensor IoT {reading.sensorId}
                    </Badge>
                    {reading.samples
                      ? `${reading.samples} ${reading.samples === 1 ? 'medição' : 'medições'} nos últimos 30 s`
                      : 'Leitura recebida pelo FIWARE'}
                    {reading.latestKmh != null &&
                      ` · agora ${reading.latestKmh.toFixed(1).replace('.', ',')} km/h`}
                    {reading.vehicleCount != null &&
                      ` · ${reading.vehicleCount} veículos`}
                    {reading.updatedAt && ` · ${formatClock(reading.updatedAt)}`}
                  </p>
                )}
                {onSelect && (
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(selected ? null : segment.id)}
                    className="mt-2 min-h-(--tap-min) rounded-control px-1 font-bold text-primary underline"
                  >
                    {selected ? 'Tirar destaque do mapa' : 'Destacar no mapa'}
                  </button>
                )}
              </article>
            </li>
          )
        })}
      </ul>

      <section
        aria-labelledby="traffic-legend"
        className="rounded-card bg-surface-alt p-4"
      >
        <h3 id="traffic-legend" className="font-display font-bold text-ink">
          Como classificamos
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Comparamos a velocidade média dos últimos 30 segundos, enviada pelo sensor IoT,
          com a velocidade máxima da via. Sem sensor ou sem leitura recente, a via fica
          cinza.
        </p>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-ink">
          <li className="flex flex-wrap items-center gap-2">
            <TrafficBadge level="free" /> a partir de {thresholds.freeFrom}%
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <TrafficBadge level="moderate" /> de {thresholds.heavyBelow}% a{' '}
            {thresholds.freeFrom - 1}%
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <TrafficBadge level="heavy" /> abaixo de {thresholds.heavyBelow}%
          </li>
        </ul>
      </section>
    </div>
  )
}
