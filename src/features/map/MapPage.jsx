import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Page } from '../../components/layout/Page.jsx'
import { Chip } from '../../components/ui/Chip.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { SimulatedBadge } from '../../components/ui/SimulatedBadge.jsx'
import { ErrorState, LoadingSkeleton, Skeleton } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useClock } from '../../context/ClockContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { useAccountGate } from '../../context/useAccountGate.js'
import { RAIL_LINES, RAIL_STATIONS, RAIL_TRANSFERS } from '../../data/railNetwork.js'
import { SAFE_PLACES } from '../../data/safePlaces.js'
import { MOBILITY_CITIES, neighborhoodCenter } from '../../data/seedMobility.js'
import { cityIdOf, getCity, getNeighborhood } from '../../domain/places.js'
import { alternativeRoutes } from '../../domain/rail.js'
import { nearestSafePlaces } from '../../domain/safePlaces.js'
import { getAlert } from '../../services/alertService.js'
import { getMobilitySnapshot } from '../../services/mobilityService.js'
import { formatClock } from '../../utils/format.js'
import { toggleItem } from '../../utils/list.js'
import { AlertDetails, AlertHeader } from './AlertPanel.jsx'
import { BusPanel } from './BusPanel.jsx'
import { MapLegend } from './MapLegend.jsx'
import { RailPanel } from './RailPanel.jsx'
import { railLine, stationPosition } from './railHelpers.js'
import { TrafficPanel } from './TrafficPanel.jsx'
import { useLiveTraffic } from './useLiveTraffic.js'

// O Leaflet só é baixado quando a aba Mapa é aberta: o resto do app não paga por ele.
const MapView = lazy(() => import('./MapView.jsx'))

const MODES = [
  { id: 'traffic', label: 'Trânsito' },
  { id: 'bus', label: 'Ônibus' },
  { id: 'rail', label: 'Metrô e trem', cityId: 'sao-paulo' },
]
const RAIL_NETWORK = {
  lines: RAIL_LINES,
  stations: RAIL_STATIONS,
  transfers: RAIL_TRANSFERS,
}
const ALERT_RADIUS_M = 900
const REFRESH_MS = 15_000

/** Município da conta, se tivermos dados dele; senão, São Paulo. */
function defaultCityId(account) {
  const home = cityIdOf(account?.neighborhoodId)
  return MOBILITY_CITIES.some((c) => c.id === home) ? home : 'sao-paulo'
}

/** De onde vêm os dados da camada Trânsito (e por que uma via pode estar cinza). */
function TrafficSourceNote({ iot, live, hasRoads }) {
  if (!hasRoads) return null
  if (!live.server) {
    return (
      <Notice tone="info" title="Nenhum servidor FIWARE configurado">
        <p>
          Sem sensores, as vias aparecem cinza (sem dados). A administração conecta o
          servidor em Parâmetros → Dispositivos IoT; também dá para definir
          VITE_FIWARE_SERVER no arquivo .env.local.
        </p>
      </Notice>
    )
  }
  if (live.isError || iot?.status === 'error') {
    return (
      <Notice tone="warn" title="Sensores IoT fora do ar">
        <p>
          O servidor FIWARE ({live.server}) não respondeu. As vias ficam sem dados até ele
          voltar.
        </p>
      </Notice>
    )
  }
  const count = live.readings.size || iot?.count || 0
  return (
    <p className="text-sm text-ink-muted">
      {count === 0
        ? `Conectado ao FIWARE (${live.server}), mas nenhum sensor está ligado a estas vias.`
        : `${count} ${count === 1 ? 'via com sensor' : 'vias com sensores'} IoT (FIWARE): cor pela média dos últimos 30 s, consultada a cada segundo.`}{' '}
      Vias sem sensor ficam cinza.
    </p>
  )
}

/**
 * Monta o que o mapa e o painel mostram para um alerta: pontos de apoio perto do
 * bairro (ou do bairro da pessoa, se o alerta vale para a cidade toda) ou, para
 * linha parada, o trecho e as rotas alternativas.
 */
function alertView(alert, account) {
  if (alert.target?.type === 'rail') {
    const result = alternativeRoutes(RAIL_NETWORK, alert.target)
    return {
      cityId: 'sao-paulo',
      mode: 'rail',
      alternatives: result,
      overlay: {
        center: stationPosition(result.stretch[0]),
        stretch: result.stretch.map(stationPosition),
        routes: result.routes.map((route) => ({
          ...route,
          legs: route.legs.map((leg) => ({
            type: leg.type,
            color: leg.type === 'rail' ? railLine(leg.lineId)?.color : null,
            path: leg.stations.map(stationPosition),
          })),
        })),
      },
    }
  }
  const home = account?.neighborhoodId
  const neighborhoodId =
    alert.target?.neighborhoodId ?? (home?.startsWith(`${alert.cityId}/`) ? home : null)
  const center =
    neighborhoodCenter(neighborhoodId) ??
    MOBILITY_CITIES.find((c) => c.id === alert.cityId)?.center ??
    null
  if (!center) return { cityId: alert.cityId, unsupported: true }
  return {
    cityId: alert.cityId,
    mode: 'traffic',
    placeName: getNeighborhood(neighborhoodId)?.name ?? getCity(alert.cityId)?.name,
    safePlaces: nearestSafePlaces(SAFE_PLACES, center, { limit: 4 }),
    overlay: { center, radius: neighborhoodId ? ALERT_RADIUS_M : null },
  }
}

/**
 * Mapa: trânsito (sensores simulados) e ônibus (posições simuladas).
 * As listas são a versão completa e acessível; o mapa (quando carregado) é um
 * complemento visual dos mesmos dados.
 */
export function MapPage() {
  const { account, updateAccount } = useSession()
  const { offsetMs } = useClock()
  const toast = useToast()
  const gate = useAccountGate()
  const [params, setParams] = useSearchParams()
  const alertId = params.get('alerta')

  const [cityId, setCityId] = useState(() =>
    params.get('camada') === 'metro' ? 'sao-paulo' : defaultCityId(account),
  )
  // /mapa?camada=metro abre direto em "Metrô e trem" (atalho do perfil)
  const [mode, setMode] = useState(() =>
    params.get('camada') === 'metro' ? 'rail' : 'traffic',
  )
  const [selectedLineId, setSelectedLineId] = useState(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [selectedRailLineId, setSelectedRailLineId] = useState(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [pendingStationId, setPendingStationId] = useState(null)
  const [tilesFailed, setTilesFailed] = useState(false)

  const alertQuery = useQuery({
    queryKey: ['map-alert', alertId, { offsetMs }],
    queryFn: () => getAlert(alertId),
    enabled: Boolean(alertId),
    retry: false,
  })
  const alert = alertId ? alertQuery.data : null
  const view = useMemo(() => (alert ? alertView(alert, account) : null), [alert, account])

  // Ao abrir um alerta, o mapa vai para o município e a camada dele (uma vez por alerta).
  const appliedAlert = useRef(null)
  useEffect(() => {
    if (!view || view.unsupported || appliedAlert.current === alert.id) return
    appliedAlert.current = alert.id
    setCityId(view.cityId)
    setMode(view.mode)
    setSelectedPlaceId(null)
    setSelectedRouteIndex(0)
  }, [view, alert])

  const query = useQuery({
    queryKey: ['mobility', cityId, { offsetMs }],
    queryFn: () => getMobilitySnapshot(cityId),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  })
  const snapshot = query.data
  const modes = MODES.filter((m) => !m.cityId || m.cityId === cityId)
  const activeMode = modes.some((m) => m.id === mode) ? mode : 'traffic'
  const favorites = account?.favoriteStations ?? []

  // Trânsito ao vivo (média de 30 s, consulta a cada 1 s), por cima do retrato do serviço.
  const live = useLiveTraffic(activeMode === 'traffic', snapshot?.thresholds)
  const shown = snapshot && {
    ...snapshot,
    segments: snapshot.segments.map((s) => ({
      ...s,
      reading: live.readings.get(s.id) ?? s.reading,
    })),
  }

  const overlay =
    view && !view.unsupported && view.cityId === cityId
      ? {
          ...view.overlay,
          id: alert.id,
          places: view.safePlaces,
          selectedPlaceId,
          selectedRouteIndex,
        }
      : null
  // O mapa só redesenha a camada de trilhos quando a lista de favoritas muda de
  // conteúdo, não a cada novo objeto de conta.
  const favoritesKey = favorites.join(',')
  const rail = useMemo(
    () => ({
      lines: RAIL_LINES,
      stations: RAIL_STATIONS,
      selectedLineId: selectedRailLineId,
      favorites: favoritesKey ? favoritesKey.split(',') : [],
    }),
    [selectedRailLineId, favoritesKey],
  )

  function changeCity(id) {
    setCityId(id)
    setSelectedLineId(null)
    setSelectedSegmentId(null)
    if (alertId) closeAlert()
  }

  function closeAlert() {
    appliedAlert.current = null
    setParams({}, { replace: true })
  }

  async function toggleFavorite(stationId) {
    if (!gate('favorite_station', { guest: 'Entre para favoritar estações.' })) return
    const added = !favorites.includes(stationId)
    setPendingStationId(stationId)
    try {
      await updateAccount({
        favoriteStations: toggleItem(favorites, stationId),
      })
      toast.show(added ? 'Estação favoritada' : 'Estação removida das favoritas', {
        tone: 'success',
      })
    } catch (error) {
      toast.show(error.message, { tone: 'danger' })
    } finally {
      setPendingStationId(null)
    }
  }

  return (
    <Page
      title="Mapa"
      description="Trânsito, ônibus, metrô e trem, e os alertas da sua cidade."
    >
      {alertId && alertQuery.isPending && <Skeleton className="h-40 w-full" />}
      {alertId && alertQuery.isError && (
        <Notice tone="warn" title="Alerta não encontrado">
          <p>{alertQuery.error.message}</p>
        </Notice>
      )}
      {view?.unsupported && (
        <Notice tone="info" title="O mapa ainda não cobre este município">
          <p>
            {alert.title}: por enquanto o mapa tem São Paulo, Campinas e Santos. Siga as
            orientações do alerta.
          </p>
        </Notice>
      )}
      {overlay && <AlertHeader alert={alert} onClose={closeAlert} />}

      {!overlay && (
        <Notice tone="info">
          <p>
            <strong>Trânsito:</strong> vias reais, coloridas pelos sensores IoT (FIWARE);
            sem sensor, ficam cinza. <strong>Ônibus</strong> são simulados e esquemáticos
            (ligam bairros em linha reta). Estações de metrô e trem são reais (rede de
            2017); alertas, pontos de apoio e rotas alternativas são de demonstração.
          </p>
          <p>
            As imagens de fundo do mapa vêm do OpenStreetMap: ao carregá-las, seu
            navegador informa a eles o seu endereço de IP e a região que você está vendo.
          </p>
        </Notice>
      )}

      <div role="group" aria-label="Município" className="flex flex-wrap gap-2">
        {MOBILITY_CITIES.map((city) => (
          <Chip
            key={city.id}
            selected={cityId === city.id}
            onClick={() => changeCity(city.id)}
          >
            {city.name}
          </Chip>
        ))}
      </div>

      <div role="group" aria-label="O que ver" className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <Chip key={m.id} selected={activeMode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>

      {query.isPending && <LoadingSkeleton label="Carregando o mapa…" />}
      {query.isError && !snapshot && (
        <ErrorState
          title="Não foi possível carregar a mobilidade"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )}

      {snapshot && (
        <>
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <MapView
              snapshot={shown}
              mode={activeMode}
              selectedLineId={selectedLineId}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={setSelectedSegmentId}
              onTilesFailed={() => setTilesFailed(true)}
              rail={activeMode === 'rail' ? rail : null}
              overlay={overlay}
            />
          </Suspense>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {activeMode !== 'traffic' && <SimulatedBadge />}
            Atualizado às {formatClock(snapshot.at)} · {snapshot.cityName}
          </p>
          {activeMode === 'traffic' && (
            <TrafficSourceNote
              iot={snapshot.iot}
              live={live}
              hasRoads={snapshot.segments.length > 0}
            />
          )}
          {tilesFailed && (
            <Notice tone="warn" title="O mapa-base não carregou">
              <p>
                Ele depende de internet e do OpenStreetMap. Os trechos e as linhas
                continuam desenhados e as listas abaixo têm todas as informações.
              </p>
            </Notice>
          )}
          {activeMode === 'traffic' && <MapLegend />}
          {activeMode === 'bus' && (
            <p className="text-sm text-ink-muted">
              Quadrados numerados são ônibus; ao abrir uma linha, os círculos são os
              pontos de parada.
            </p>
          )}
          {activeMode === 'rail' && (
            <p className="text-sm text-ink-muted">
              Cada linha aparece com a cor e o número oficiais; ★ marca as suas estações
              favoritas.
            </p>
          )}
          {overlay && (
            <AlertDetails
              alert={alert}
              placeName={view.placeName}
              safePlaces={view.safePlaces}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
              alternatives={view.alternatives}
              selectedRouteIndex={selectedRouteIndex}
              onSelectRoute={setSelectedRouteIndex}
            />
          )}
          {overlay && (
            <p className="text-sm text-ink-muted">
              {overlay.places
                ? 'Quadrados verdes numerados são os pontos de apoio; o círculo tracejado é a área do alerta.'
                : 'O pontilhado vermelho é o trecho parado; a rota escolhida aparece por cima, com as cores das linhas.'}
            </p>
          )}

          {activeMode === 'traffic' && (
            <TrafficPanel
              segments={shown.segments}
              cityName={snapshot.cityName}
              thresholds={snapshot.thresholds}
              selectedId={selectedSegmentId}
              onSelect={setSelectedSegmentId}
            />
          )}
          {activeMode === 'bus' && (
            <BusPanel
              lines={snapshot.lines}
              selectedId={selectedLineId}
              onSelect={setSelectedLineId}
            />
          )}
          {activeMode === 'rail' && (
            <RailPanel
              favorites={favorites}
              selectedLineId={selectedRailLineId}
              onSelectLine={setSelectedRailLineId}
              onToggleFavorite={toggleFavorite}
              pendingStationId={pendingStationId}
            />
          )}
        </>
      )}
    </Page>
  )
}
