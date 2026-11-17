import { Star } from 'lucide-react'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { RAIL_LINES } from '../../data/railNetwork.js'
import { LineBadge } from './LineBadge.jsx'
import { railLine, station } from './railHelpers.js'

function StationRow({ stationId, favorite, onToggleFavorite, pending }) {
  const s = station(stationId)
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="font-bold break-words text-ink">{s.name}</span>
        {s.lines.length > 1 && (
          <span className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
            Baldeação:
            {s.lines.map((id) => (
              <span key={id} className="inline-flex items-center gap-1">
                <LineBadge lineId={id} />
                <span className="sr-only">{railLine(id)?.name}</span>
              </span>
            ))}
          </span>
        )}
      </span>
      <Button
        variant={favorite ? 'primary' : 'secondary'}
        icon={Star}
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Remover' : 'Favoritar'} a estação ${s.name}`}
        disabled={pending}
        onClick={() => onToggleFavorite(stationId)}
      >
        {favorite ? 'Favorita' : 'Favoritar'}
      </Button>
    </li>
  )
}

/**
 * Metrô e trem: linhas, estações e favoritas. Lista acessível; o mapa desenha
 * as mesmas linhas com as cores oficiais.
 */
export function RailPanel({
  favorites,
  selectedLineId,
  onSelectLine,
  onToggleFavorite,
  pendingStationId,
}) {
  const selected = railLine(selectedLineId)
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="fav-title" className="flex flex-col gap-2">
        <h2 id="fav-title" className="font-display text-lg font-bold">
          Suas estações favoritas
        </h2>
        {favorites.length === 0 ? (
          <p className="text-ink-muted">
            Nenhuma ainda. Abra uma linha e toque em “Favoritar” para acompanhar a estação
            no seu perfil.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {favorites.map((id) => (
              <StationRow
                key={id}
                stationId={id}
                favorite
                pending={pendingStationId === id}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="lines-title" className="flex flex-col gap-2">
        <h2 id="lines-title" className="font-display text-lg font-bold">
          Linhas
        </h2>
        <ul className="flex flex-col gap-2">
          {RAIL_LINES.map((line) => {
            const open = line.id === selectedLineId
            return (
              <li key={line.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onSelectLine(open ? null : line.id)}
                  className={`hairline flex min-h-(--tap-min) w-full items-center gap-3 rounded-card px-3 py-2 text-left ${
                    open ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
                  }`}
                >
                  <LineBadge lineId={line.id} />
                  <span className="flex flex-col">
                    <span className="font-bold text-ink">{line.name}</span>
                    <span className="text-sm text-ink-muted">
                      {line.kind} · {line.stations.length} estações
                    </span>
                  </span>
                </button>
                {open && (
                  <ul
                    aria-label={`Estações da ${line.name}`}
                    className="flex flex-col divide-y divide-line px-1 pt-1"
                  >
                    {line.stations.map((id) => (
                      <StationRow
                        key={id}
                        stationId={id}
                        favorite={favorites.includes(id)}
                        pending={pendingStationId === id}
                        onToggleFavorite={onToggleFavorite}
                      />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      {selected && (
        <p className="sr-only" aria-live="polite">
          {selected.name} aberta.
        </p>
      )}
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Icon icon={Star} size="sm" className="mt-0.5" />
        Estações e traçados reais (rede de 2017, dados abertos da SPTrans); estações
        abertas depois não aparecem.
      </p>
    </div>
  )
}
