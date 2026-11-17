import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'
import { boundsOf } from '../../domain/geo.js'
import { trafficLineStyle } from './mapStyles.js'

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>'

const prefers = (query) =>
  typeof window.matchMedia === 'function' && window.matchMedia(query).matches

/**
 * Mapa com Leaflet e OpenStreetMap. É um complemento visual: as listas da tela
 * têm as mesmas informações. Por isso os marcadores não recebem foco do teclado
 * (seriam dezenas de paradas de Tab) e só os trechos reagem a toque/clique.
 *
 * O mapa é criado uma vez; os dados (que chegam a cada 15 s) só redesenham as
 * camadas, sem mexer no zoom e no deslocamento que a pessoa escolheu.
 */
export default function MapView({
  snapshot,
  mode,
  selectedLineId,
  selectedSegmentId,
  onSelectSegment,
  onTilesFailed,
  rail, // { lines, stations, selectedLineId, favorites } no modo "Metrô e trem"
  overlay, // alerta aberto: { id, center, radius, places, selectedPlaceId, stretch, routes, selectedRouteIndex }
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const lastFramingRef = useRef(null)
  const callbacks = useRef({ onSelectSegment, onTilesFailed })
  const coarsePointer = prefers('(pointer: coarse)')

  // Os eventos do Leaflet vivem mais que uma renderização: guardam sempre a versão atual.
  useEffect(() => {
    callbacks.current = { onSelectSegment, onTilesFailed }
  })

  useEffect(() => {
    const reduceMotion = prefers('(prefers-reduced-motion: reduce)')
    const map = L.map(containerRef.current, {
      attributionControl: false,
      // Em tela de toque, um dedo rola a página; dois dedos movem o mapa.
      dragging: !coarsePointer,
      zoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
    })
    L.control.attribution({ prefix: false }).addTo(map)

    let failed = false
    L.tileLayer(TILES, { maxZoom: 18, attribution: ATTRIBUTION })
      .on('tileerror', () => {
        if (failed) return
        failed = true
        callbacks.current.onTilesFailed?.()
      })
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // o contêiner pode ganhar tamanho só depois do primeiro desenho da tela
    const frame = requestAnimationFrame(() => map.invalidateSize())

    return () => {
      cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      layerRef.current = null
      lastFramingRef.current = null
    }
  }, [coarsePointer])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    // Enquadra só quando o que se olha muda (município, modo, linha, alerta), não a
    // cada atualização dos dados (senão o mapa "pularia" enquanto a pessoa o move).
    const framing = [
      snapshot.cityId,
      mode,
      selectedLineId,
      rail?.selectedLineId,
      overlay?.id,
      overlay?.selectedRouteIndex,
      overlay?.selectedPlaceId,
    ].join('|')
    if (lastFramingRef.current !== framing) {
      lastFramingRef.current = framing
      map.fitBounds(framingBounds({ snapshot, mode, selectedLineId, rail, overlay }), {
        padding: [28, 28],
        maxZoom: 16,
      })
    }

    layer.clearLayers()

    if (mode === 'traffic') drawTraffic(layer, snapshot, selectedSegmentId, callbacks)
    if (mode === 'bus') drawBuses(layer, snapshot, selectedLineId)
    if (mode === 'rail' && rail) drawRail(layer, rail)
    if (overlay) drawOverlay(layer, overlay)
  }, [snapshot, mode, selectedLineId, selectedSegmentId, rail, overlay])

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        role="region"
        aria-label="Mapa esquemático. As listas abaixo trazem as mesmas informações."
        className="nr-map h-72 overflow-hidden rounded-card hairline border-line"
      />
      {coarsePointer && (
        <p className="text-sm text-ink-muted">
          Use dois dedos para mover e aproximar o mapa.
        </p>
      )}
    </div>
  )
}

function framingBounds({ snapshot, mode, selectedLineId, rail, overlay }) {
  if (overlay) {
    const points = [overlay.center]
    if (overlay.places) {
      const chosen = overlay.places.find((p) => p.id === overlay.selectedPlaceId)
      points.push(...(chosen ? [chosen.position] : overlay.places.map((p) => p.position)))
    }
    if (overlay.stretch) points.push(...overlay.stretch)
    const route = overlay.routes?.[overlay.selectedRouteIndex]
    if (route) points.push(...route.legs.flatMap((leg) => leg.path))
    return boundsOf(points)
  }
  if (mode === 'rail' && rail) {
    const line = rail.lines.find((l) => l.id === rail.selectedLineId)
    return boundsOf(line ? line.path : rail.lines.flatMap((l) => l.path))
  }
  const line = mode === 'bus' && snapshot.lines.find((l) => l.id === selectedLineId)
  return line ? boundsOf(line.path) : snapshot.bounds
}

function drawTraffic(layer, snapshot, selectedSegmentId, callbacks) {
  for (const segment of snapshot.segments) {
    const style = trafficLineStyle(segment.reading.level)
    if (segment.id === selectedSegmentId) {
      L.polyline(segment.path, {
        className: 'nr-halo',
        weight: style.weight + 10,
        interactive: false,
      }).addTo(layer)
    }
    L.polyline(segment.path, style)
      .bindTooltip(segment.name, { sticky: true })
      .on('click', () => callbacks.current.onSelectSegment?.(segment.id))
      .addTo(layer)
  }
}

function drawBuses(layer, snapshot, selectedLineId) {
  const lines = selectedLineId
    ? snapshot.lines.filter((l) => l.id === selectedLineId)
    : snapshot.lines
  for (const line of snapshot.lines) {
    const selected = line.id === selectedLineId
    L.polyline(line.path, {
      className: selected ? 'nr-route-selected' : 'nr-route',
      weight: selected ? 6 : 3,
      interactive: false,
    }).addTo(layer)
  }
  if (selectedLineId) {
    for (const stop of lines.flatMap((l) => l.stops)) {
      L.circleMarker(stop.position, { className: 'nr-stop', radius: 7, weight: 3 })
        .bindTooltip(stop.name)
        .addTo(layer)
    }
  }
  for (const line of lines) {
    for (const bus of line.buses) {
      L.marker(bus.position, {
        keyboard: false,
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<span class="nr-bus">${line.code}</span>`,
          iconSize: [40, 24],
          iconAnchor: [20, 12],
        }),
      }).addTo(layer)
    }
  }
}

/** Linhas com a cor oficial sobre um contorno claro (lê bem em qualquer fundo). */
function drawRail(layer, rail) {
  const selected = rail.selectedLineId
  for (const line of rail.lines) {
    const dim = selected && line.id !== selected
    L.polyline(line.path, {
      className: 'nr-rail-casing',
      weight: dim ? 5 : 9,
      interactive: false,
    }).addTo(layer)
    L.polyline(line.path, {
      color: line.color,
      weight: dim ? 3 : 6,
      opacity: dim ? 0.45 : 1,
      interactive: false,
    }).addTo(layer)
  }
  const visible = selected
    ? (rail.lines.find((l) => l.id === selected)?.stations ?? [])
    : Object.keys(rail.stations)
  for (const id of visible) {
    const st = rail.stations[id]
    const favorite = rail.favorites.includes(id)
    if (favorite) continue // as favoritas são desenhadas por cima, com estrela
    L.circleMarker([st.lat, st.lng], {
      className: 'nr-station',
      radius: selected ? 6 : 4,
      weight: 2,
    })
      .bindTooltip(st.name)
      .addTo(layer)
  }
  for (const id of rail.favorites) {
    const st = rail.stations[id]
    if (!st) continue
    L.marker([st.lat, st.lng], {
      keyboard: false,
      icon: L.divIcon({
        className: '',
        html: '<span class="nr-star" aria-hidden="true">★</span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    })
      .bindTooltip(`${st.name} (favorita)`)
      .addTo(layer)
  }
}

/** Alerta: área afetada + pontos de apoio, ou trecho parado + rotas alternativas. */
function drawOverlay(layer, overlay) {
  if (overlay.radius) {
    L.circle(overlay.center, {
      radius: overlay.radius,
      className: 'nr-alert-area',
      weight: 3,
      dashArray: '8 6',
      interactive: false,
    }).addTo(layer)
  }
  overlay.places?.forEach((place, index) => {
    const chosen = place.id === overlay.selectedPlaceId
    L.marker(place.position, {
      keyboard: false,
      icon: L.divIcon({
        className: '',
        html: `<span class="nr-safe${chosen ? ' nr-safe-selected' : ''}">${index + 1}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    })
      .bindTooltip(place.name)
      .addTo(layer)
  })
  if (overlay.stretch) {
    L.polyline(overlay.stretch, {
      className: 'nr-blocked',
      weight: 10,
      dashArray: '2 12',
      lineCap: 'round',
      interactive: false,
    }).addTo(layer)
  }
  const route = overlay.routes?.[overlay.selectedRouteIndex]
  for (const leg of route?.legs ?? []) {
    L.polyline(leg.path, {
      className: 'nr-rail-casing',
      weight: 11,
      interactive: false,
    }).addTo(layer)
    L.polyline(leg.path, {
      color: leg.color ?? undefined,
      className: leg.color ? undefined : 'nr-route-selected',
      weight: 7,
      dashArray: leg.type === 'rail' ? null : '10 8',
      interactive: false,
    }).addTo(layer)
  }
}
