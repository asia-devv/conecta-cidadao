import { classifyTraffic, DEFAULT_THRESHOLDS } from './traffic.js'

/**
 * Sensores de trânsito IoT no padrão FIWARE (mesmas convenções do Vinheria-Full):
 *
 *  - entidade no Orion: tipo `TrafficSensor`, id `urn:ngsi-ld:TrafficSensor:<ID>`;
 *  - dispositivo no IoT Agent: `traffic<ID>`, protocolo UltraLight sobre MQTT,
 *    apikey `TEF`;
 *  - medida: `v` → `averageSpeed` (km/h, velocidade média captada no trecho);
 *  - atributos fixos (static_attributes): a via simulada que o sensor monitora
 *    (`segmentId`, `roadName`) e a velocidade máxima dela (`maxSpeed`).
 *
 * Também lê o formato do projeto de referência smart-traffic: entidade do tipo
 * `Traffic` (ex.: urn:ngsi-ld:Traffic:003) com `speed_kmh`, `vehicle_count` e
 * `s`. Sem `segmentId`, ela vale para o trecho da Marginal Tietê do mesmo projeto.
 *
 * Há congestionamento quando a média fica muito abaixo da máxima da via:
 * percentual = média ÷ máxima, classificado pelos mesmos limites do mapa.
 */

export const ENTITY_TYPE = 'TrafficSensor'
/** Tipo usado pelo projeto smart-traffic (sensor da Marginal Tietê). */
export const REFERENCE_ENTITY_TYPE = 'Traffic'
export const REFERENCE_DEFAULT_ROAD = 'sp-marginal-tiete'
/** Janela da média, como no smart-traffic: leituras dos últimos 30 segundos. */
export const AVERAGE_WINDOW_MS = 30_000
export const ENTITY_PREFIX = `urn:ngsi-ld:${ENTITY_TYPE}:`
export const DEVICE_PREFIX = 'traffic'
export const API_KEY = 'TEF'
export const SENSOR_ID = /^[A-Za-z0-9]{1,12}$/
/** Leitura com mais de 10 min não vale mais (o sensor pode ter parado). */
export const STALE_AFTER_MIN = 10

export const deviceIdOf = (id) => `${DEVICE_PREFIX}${id}`
export const entityIdOf = (id) => `${ENTITY_PREFIX}${id}`
export const topicOf = (id, apiKey = API_KEY) => `/${apiKey}/${deviceIdOf(id)}/attrs`
/** Mensagem UltraLight 2.0 com a velocidade média: "v|42.5". */
export const ultralightPayload = (speedKmh) => `v|${Number(speedKmh).toFixed(1)}`

/** Aceita "98.91.20.39" ou "98.91.20.39:1026"; devolve só o IPv4, ou null. */
export function parseServer(text) {
  const host = String(text ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null
  if (host.split('.').some((part) => Number(part) > 255)) return null
  return host
}

/** Corpo do POST /iot/devices (IoT Agent) para cadastrar um sensor numa via. */
export function deviceProvisioning(id, road) {
  return {
    devices: [
      {
        device_id: deviceIdOf(id),
        entity_name: entityIdOf(id),
        entity_type: ENTITY_TYPE,
        protocol: 'PDI-IoTA-UltraLight',
        transport: 'MQTT',
        attributes: [
          { object_id: 'v', name: 'averageSpeed', type: 'Float' },
          { object_id: 'c', name: 'vehicleCount', type: 'Integer' },
        ],
        static_attributes: [
          { name: 'segmentId', type: 'Text', value: road.segmentId },
          { name: 'roadName', type: 'Text', value: road.roadName },
          { name: 'maxSpeed', type: 'Integer', value: road.maxSpeed },
        ],
      },
    ],
  }
}

const toNumber = (value) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

/**
 * Junta o que o IoT Agent sabe (dispositivos cadastrados) com o que o Orion
 * guarda (última leitura). Um sensor pode estar só em um dos dois.
 */
export function mergeSensors(devices, entities) {
  const sensors = new Map()
  const ensure = (entityName) => {
    if (!sensors.has(entityName)) {
      sensors.set(entityName, {
        id: entityName.split(':').at(-1),
        entityName,
        deviceId: null,
        provisioned: false,
        segmentId: null,
        roadName: null,
        maxSpeed: null,
        averageSpeed: null,
        vehicleCount: null,
        updatedAt: null,
      })
    }
    return sensors.get(entityName)
  }
  for (const device of devices) {
    if (device.entity_type !== ENTITY_TYPE) continue
    const sensor = ensure(device.entity_name)
    sensor.deviceId = device.device_id
    sensor.provisioned = true
    for (const attr of device.static_attributes ?? []) {
      if (attr.name === 'segmentId') sensor.segmentId = attr.value
      if (attr.name === 'roadName') sensor.roadName = attr.value
      if (attr.name === 'maxSpeed') sensor.maxSpeed = toNumber(attr.value)
    }
  }
  for (const entity of entities) {
    const reference = entity.type === REFERENCE_ENTITY_TYPE
    if (entity.type !== ENTITY_TYPE && !reference) continue
    const sensor = ensure(entity.id)
    sensor.format = reference ? 'smart-traffic' : 'nossa'
    sensor.segmentId =
      entity.segmentId ?? sensor.segmentId ?? (reference ? REFERENCE_DEFAULT_ROAD : null)
    sensor.roadName = entity.roadName ?? sensor.roadName
    sensor.maxSpeed = toNumber(entity.maxSpeed) ?? sensor.maxSpeed
    sensor.averageSpeed = toNumber(reference ? entity.speed_kmh : entity.averageSpeed)
    sensor.vehicleCount = toNumber(reference ? entity.vehicle_count : entity.vehicleCount)
    sensor.updatedAt = typeof entity.TimeInstant === 'string' ? entity.TimeInstant : null
  }
  return [...sensors.values()].sort((a, b) =>
    a.id.localeCompare(b.id, 'pt-BR', { numeric: true }),
  )
}

/**
 * Situação do trânsito a partir da leitura do sensor:
 * { status: 'ok' | 'stale' | 'no_data', level, percent, differenceKmh }.
 */
export function sensorStatus(sensor, now, thresholds = DEFAULT_THRESHOLDS) {
  if (sensor.averageSpeed === null || !sensor.maxSpeed) {
    return { status: 'no_data', level: 'unknown', percent: null, differenceKmh: null }
  }
  const updated = sensor.updatedAt ? new Date(sensor.updatedAt).getTime() : null
  if (updated !== null && now.getTime() - updated > STALE_AFTER_MIN * 60_000) {
    return { status: 'stale', level: 'unknown', percent: null, differenceKmh: null }
  }
  const percent = Math.round((Math.max(0, sensor.averageSpeed) / sensor.maxSpeed) * 100)
  return {
    status: 'ok',
    level: classifyTraffic(Math.min(percent, 100), thresholds),
    percent,
    differenceKmh: Math.round(sensor.maxSpeed - sensor.averageSpeed),
  }
}

/**
 * Média móvel de 30 s, do jeito do smart-traffic: consulta-se o Orion o tempo
 * todo, mas só conta como medição NOVA quando o `TimeInstant` muda.
 *
 * `history`: Map sensorId → [{ at, speed }] (é atualizado e devolvido).
 */
export function recordSamples(history, sensors, nowMs, windowMs = AVERAGE_WINDOW_MS) {
  for (const sensor of sensors) {
    if (sensor.averageSpeed === null || !sensor.updatedAt) continue
    const at = new Date(sensor.updatedAt).getTime()
    const samples = history.get(sensor.id) ?? []
    if (!samples.some((s) => s.at === at))
      samples.push({ at, speed: sensor.averageSpeed })
    history.set(
      sensor.id,
      samples.filter((s) => nowMs - s.at <= windowMs),
    )
  }
  return history
}

/** Média das medições na janela; `null` se não houve nenhuma. */
export function windowAverage(samples = []) {
  if (samples.length === 0) return null
  return samples.reduce((sum, s) => sum + s.speed, 0) / samples.length
}

/**
 * Leitura de uma via a partir do sensor e das medições da janela de 30 s:
 * a média decide a cor; a última medição aparece como "agora".
 */
export function liveReading(sensor, samples, now, thresholds = DEFAULT_THRESHOLDS) {
  const average = windowAverage(samples)
  const speed = average ?? sensor.averageSpeed
  const status = sensorStatus({ ...sensor, averageSpeed: speed }, now, thresholds)
  return {
    status:
      status.status === 'ok' ? 'ok' : status.status === 'stale' ? 'offline' : 'no_data',
    level: status.level,
    speedKmh: status.status === 'ok' ? speed : null,
    latestKmh: status.status === 'ok' ? sensor.averageSpeed : null,
    percent: status.percent,
    samples: samples?.length ?? 0,
    vehicleCount: sensor.vehicleCount,
    updatedAt: sensor.updatedAt,
    source: 'iot',
    sensorId: sensor.id,
  }
}
