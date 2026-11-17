import { MOBILITY_CITIES } from '../data/seedMobility.js'
import {
  arrivalsAt,
  busesOf,
  isInService,
  lineProgress,
  withStopFractions,
} from '../domain/buses.js'
import { boundsOf, buildPath } from '../domain/geo.js'
import { classifyTraffic, sensorReading, trafficRatio } from '../domain/traffic.js'
import { clock } from './clock.js'
import { wait } from './latency.js'
import { ServiceError } from './ServiceError.js'
import { sensorStatus } from '../domain/iot.js'
import { getFiwareServer, listTrafficSensors } from './fiwareService.js'
import { getTrafficThresholds } from './settingsService.js'

/**
 * Mobilidade: trânsito (sensores simulados) e ônibus (posições e previsões
 * simuladas). Tudo é calculado, a cada consulta, para o instante do relógio do app:
 * um backend de verdade devolveria o mesmo formato a partir de sensores e GPS.
 */

// Os percursos não mudam; prepará-los uma vez evita refazer as distâncias a cada leitura.
const PATHS = new Map(
  MOBILITY_CITIES.flatMap((city) => city.lines.map((l) => [l.id, buildPath(l.path)])),
)

/**
 * Leituras dos sensores IoT (FIWARE), quando a administração configurou um
 * servidor. Cada sensor monitora uma via (segmentId) e substitui a simulação
 * dela. Se o FIWARE não responder, o mapa segue com a simulação e avisa.
 */
async function iotReadings(now, thresholds) {
  const server = getFiwareServer()
  const result = { bySegment: new Map(), status: server ? 'connected' : 'off', count: 0 }
  if (!server) return result
  try {
    const sensors = await listTrafficSensors(server)
    for (const sensor of sensors) {
      if (!sensor.segmentId) continue
      const status = sensorStatus(sensor, now, thresholds)
      result.count += 1
      result.bySegment.set(sensor.segmentId, {
        status: status.status === 'ok' ? 'ok' : 'offline',
        level: status.level,
        speedKmh: status.status === 'ok' ? Math.round(sensor.averageSpeed) : null,
        percent: status.percent,
        updatedAt: sensor.updatedAt ?? now.toISOString(),
        source: 'iot',
        sensorId: sensor.id,
      })
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

  const iot = await iotReadings(now, thresholds)
  const segments = city.segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    path: segment.path,
    freeFlowKmh: segment.sensor.freeFlowKmh,
    reading:
      iot.bySegment.get(segment.id) ?? sensorReading(segment.sensor, now, thresholds),
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
    at: now.toISOString(),
    thresholds,
    iot: { status: iot.status, count: iot.count },
    segments,
    lines,
  }
}
