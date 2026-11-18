import { roadById, roadsOfCity } from '../data/monitoredRoads.js'
import { MOBILITY_CITIES } from '../data/seedMobility.js'
import {
  arrivalsAt,
  busesOf,
  isInService,
  lineProgress,
  withStopFractions,
} from '../domain/buses.js'
import { boundsOf, buildPath } from '../domain/geo.js'
import { classifyTraffic, trafficRatio } from '../domain/traffic.js'
import { clock } from './clock.js'
import { wait } from './latency.js'
import { ServiceError } from './ServiceError.js'
import { liveReading } from '../domain/iot.js'
import { getFiwareServer, listTrafficSensors } from './fiwareService.js'
import { getTrafficThresholds } from './settingsService.js'

/**
 * Mobilidade: trânsito (vias reais com sensores IoT/FIWARE) e ônibus (posições e
 * previsões simuladas, calculadas para o instante do relógio do app).
 *
 * Trânsito: cada via monitorada (data/monitoredRoads.js) mostra a leitura do
 * sensor ligado a ela; sem sensor ou sem leitura recente, "Sem dados" (cinza),
 * como no projeto de referência smart-traffic. Nada é inventado nessa camada.
 */

// Os percursos não mudam; prepará-los uma vez evita refazer as distâncias a cada leitura.
/** O sensor do smart-traffic não manda a velocidade máxima: vale a da via. */
export const withRoadMaxSpeed = (sensor) => ({
  ...sensor,
  maxSpeed: sensor.maxSpeed ?? roadById(sensor.segmentId)?.maxSpeed ?? null,
})

/** Via sem sensor ou sem leitura: cinza, sem número. */
export const NO_DATA = Object.freeze({
  status: 'no_data',
  level: 'unknown',
  speedKmh: null,
  percent: null,
  updatedAt: null,
  source: null,
})

const PATHS = new Map(
  MOBILITY_CITIES.flatMap((city) => city.lines.map((l) => [l.id, buildPath(l.path)])),
)

/**
 * Leituras dos sensores IoT (FIWARE), quando há servidor configurado. Cada
 * sensor monitora uma via (segmentId). Se o FIWARE não responder, as vias
 * ficam "Sem dados" e a tela avisa.
 */
async function iotReadings(thresholds) {
  const server = getFiwareServer()
  const result = { bySegment: new Map(), status: server ? 'connected' : 'off', count: 0 }
  if (!server) return result
  try {
    const sensors = await listTrafficSensors(server)
    // leituras do sensor usam a hora real (não a do relógio de demonstração)
    const realNow = new Date()
    for (const sensor of sensors) {
      const road = roadById(sensor.segmentId)
      if (!road) continue // sensor ligado a uma via que o mapa não conhece
      result.count += 1
      result.bySegment.set(
        road.id,
        liveReading(withRoadMaxSpeed(sensor), [], realNow, thresholds),
      )
    }
  } catch {
    result.status = 'error'
  }
  return result
}

/**
 * Situação de um município agora.
 * @param {string} cityId
 * @param {{ thresholds?: { freeFrom: number, heavyBelow: number } }} [options]  (padrão: os limites definidos pela administração)
 */
export async function getMobilitySnapshot(
  cityId,
  { thresholds = getTrafficThresholds() } = {},
) {
  await wait()
  const city = MOBILITY_CITIES.find((c) => c.id === cityId)
  if (!city)
    throw new ServiceError('not_found', 'Não temos dados de mobilidade deste município.')

  const now = clock.now()
  const nowMs = now.getTime()
  const sensorsById = new Map(city.segments.map((s) => [s.id, s.sensor]))

  const iot = await iotReadings(thresholds)
  const segments = roadsOfCity(city.id).map((road) => ({
    id: road.id,
    name: road.name,
    stretch: road.stretch ?? null,
    path: road.path,
    sensorAt: road.sensorAt ?? road.path[Math.floor(road.path.length / 2)],
    freeFlowKmh: road.maxSpeed,
    reading: iot.bySegment.get(road.id) ?? NO_DATA,
  }))

  const inService = isInService(now)
  const lines = city.lines.map((rawLine) => {
    const path = PATHS.get(rawLine.id)
    const line = withStopFractions(rawLine, path)
    // trânsito médio nos trechos da linha (o ônibus anda pelo trânsito real, mesmo se o sensor estiver sem sinal)
    const ratioAt = (ms) => {
      const sensors = line.segmentIds.map((id) => sensorsById.get(id))
      return sensors.reduce((sum, s) => sum + trafficRatio(s, ms), 0) / sensors.length
    }
    const currentRatio = ratioAt(nowMs)
    const buses = inService ? busesOf(line, path, lineProgress(line, ratioAt, now)) : []

    return {
      id: line.id,
      code: line.code,
      name: line.name,
      path: line.path,
      running: inService,
      trafficLevel: classifyTraffic(Math.round(currentRatio * 100), thresholds),
      buses,
      stops: line.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        position: line.path[stop.vertexIndex],
        arrivals: inService ? arrivalsAt(line, stop, buses, currentRatio) : [],
      })),
    }
  })

  return {
    cityId: city.id,
    cityName: city.name,
    center: city.center,
    zoom: city.zoom,
    bounds: boundsOf([
      ...segments.flatMap((s) => s.path),
      ...lines.flatMap((l) => l.path),
    ]),
    trafficBounds: segments.length ? boundsOf(segments.flatMap((s) => s.path)) : null,
    at: now.toISOString(),
    thresholds,
    iot: { status: iot.status, count: iot.count },
    segments,
    lines,
  }
}
