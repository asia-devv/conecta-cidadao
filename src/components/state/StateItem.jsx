import { StateCard } from '../ui/StateCard.jsx'
import { formatPlace, getCity } from '../../domain/places.js'
import { RAIL_LINES } from '../../data/railNetwork.js'
import { formatRelative } from '../../domain/relativeTime.js'
import { alertState, eventTiming } from '../../domain/stateFeed.js'
import { formatDateTime, formatEventWhen } from '../../utils/format.js'

/** Onde o item vale: bairro, linha de trem/metrô, município ou o estado todo. */
function placeOf(item) {
  const target = item.target
  if (target?.type === 'area') return formatPlace(target.neighborhoodId)
  if (target?.type === 'rail') {
    return RAIL_LINES.find((l) => l.id === target.lineId)?.name ?? 'Metrô e trem'
  }
  if (item.neighborhoodId) return formatPlace(item.neighborhoodId)
  return item.cityId ? (getCity(item.cityId)?.name ?? '') : 'Todo o estado'
}

/** Traduz um item do feed estadual (dados do serviço) para o StateCard (apresentação). */
export function StateItem({
  item,
  now,
  onOpen,
  onToggleSave,
  savePending,
  detail,
  openLabel,
  openIcon,
  children,
}) {
  const place = placeOf(item)
  const common = {
    kind: item.kind,
    title: item.title,
    summary: item.summary,
    sourceName: item.source.name,
    place,
    timeLabel: formatRelative(item.publishedAt, now),
    detail,
    onOpen,
    openLabel,
    openIcon,
    children,
  }

  if (item.kind === 'alert') {
    const ended = alertState(item, now) === 'expired'
    return (
      <StateCard
        {...common}
        level={item.level}
        ended={ended}
        validityLabel={`${ended ? 'Encerrado em' : 'Vale até'} ${formatDateTime(item.expiresAt)}`}
      />
    )
  }
  if (item.kind === 'news') {
    return <StateCard {...common} body={item.body} />
  }
  return (
    <StateCard
      {...common}
      when={formatEventWhen(item.startsAt, item.endsAt)}
      venue={item.venue}
      price={item.price}
      timing={eventTiming(item, now)}
      saved={item.saved}
      onToggleSave={onToggleSave}
      savePending={savePending}
    />
  )
}
