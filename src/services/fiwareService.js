import {
  API_KEY,
  ENTITY_TYPE,
  REFERENCE_ENTITY_TYPE,
  deviceIdOf,
  deviceProvisioning,
  entityIdOf,
  mergeSensors,
  parseServer,
} from '../domain/iot.js'
import { ServiceError } from './ServiceError.js'
import { storage } from './storage.js'

/**
 * Sensores de trânsito no FIWARE (Orion Context Broker + IoT Agent MQTT).
 *
 * O app fala com o FIWARE pelo proxy /api/fiware do servidor do Vite (veja
 * server/fiwareProxy.js), que só existe com `npm run dev` ou `npm run preview`.
 * O endereço do servidor FIWARE é escolhido pela administração e fica neste
 * aparelho, como no Vinheria-Full. Também dá para deixar um padrão para todos
 * os navegadores com VITE_FIWARE_SERVER no .env.local (como o FIWARE_ORIGIN do
 * smart-traffic); o que a administração escolher no painel vale mais.
 */

const SERVER_KEY = 'fiware-server'

/** IPv4 do .env.local (VITE_FIWARE_SERVER), se houver um válido. */
export const defaultFiwareServer = () =>
  parseServer(import.meta.env?.VITE_FIWARE_SERVER ?? '') ?? null

export const getFiwareServer = () =>
  storage.read(SERVER_KEY, null) ?? defaultFiwareServer()

export function saveFiwareServer(text) {
  const host = parseServer(text)
  if (!host)
    throw new ServiceError('invalid', 'Informe um IPv4, por exemplo 98.91.20.39.')
  storage.write(SERVER_KEY, host)
  return host
}

export const forgetFiwareServer = () => storage.remove(SERVER_KEY)

async function fiware(server, path, { method = 'GET', body, port = 1026 } = {}) {
  let response
  try {
    response = await fetch('/api/fiware', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servidor: `${server}:${port}`,
        caminho: path,
        metodo: method,
        body,
      }),
    })
  } catch {
    throw new ServiceError(
      'proxy_unavailable',
      'O proxy do FIWARE não respondeu. Ele só existe com "npm run dev" ou "npm run preview".',
    )
  }
  const text = await response.text()
  let data = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // alguns endpoints do FIWARE respondem texto puro
  }
  return { ok: response.ok, status: response.status, data }
}

function errorMessage(data, fallback) {
  if (data && typeof data === 'object') {
    if (data.erro) return `${data.erro}${data.causa ? ` (${data.causa})` : ''}`
    return data.description || data.message || fallback
  }
  return typeof data === 'string' && data && !data.startsWith('<') ? data : fallback
}

/** Testa a conexão com o Orion. Devolve a versão dele. */
export async function checkConnection(server) {
  const res = await fiware(server, '/version')
  if (!res.ok) {
    throw new ServiceError(
      'unreachable',
      errorMessage(res.data, 'O Orion não respondeu.'),
    )
  }
  return { version: res.data?.orion?.version ?? 'desconhecida' }
}

// Os dois formatos: os sensores deste app e o do smart-traffic (Traffic).
const ENTITIES_PATH = `/v2/entities?type=${ENTITY_TYPE},${REFERENCE_ENTITY_TYPE}&options=keyValues&limit=200`

/** Sensores cadastrados (IoT Agent) e suas últimas leituras (Orion). */
export async function listTrafficSensors(server) {
  const [devices, entities] = await Promise.all([
    fiware(server, '/iot/devices?limit=200', { port: 4041 }).catch(() => null),
    fiware(server, ENTITIES_PATH),
  ])
  if (!entities.ok && !devices?.ok) {
    throw new ServiceError(
      'unreachable',
      errorMessage(entities.data, 'Não foi possível consultar o Orion.'),
    )
  }
  return mergeSensors(
    devices?.ok ? (devices.data?.devices ?? []) : [],
    entities.ok && Array.isArray(entities.data) ? entities.data : [],
  )
}

/**
 * Só as últimas leituras, direto do Orion (uma requisição). É o que o mapa
 * consulta a cada segundo para calcular a média de 30 s.
 */
export async function listSensorReadings(server) {
  const res = await fiware(server, ENTITIES_PATH)
  if (!res.ok) {
    throw new ServiceError(
      'unreachable',
      errorMessage(res.data, 'O Orion não respondeu.'),
    )
  }
  return mergeSensors([], Array.isArray(res.data) ? res.data : [])
}

/** Cadastra o sensor no IoT Agent, ligado a uma via (simulada) e à velocidade máxima dela. */
export async function provisionTrafficSensor(server, id, road) {
  const res = await fiware(server, '/iot/devices', {
    method: 'POST',
    port: 4041,
    body: deviceProvisioning(id, road),
  })
  if (res.status === 409) {
    throw new ServiceError(
      'exists',
      `Já existe um dispositivo ${deviceIdOf(id)} no IoT Agent.`,
    )
  }
  if (!res.ok) {
    throw new ServiceError(
      'iot_agent',
      `IoT Agent: ${errorMessage(res.data, String(res.status))}`,
    )
  }
  return { deviceId: deviceIdOf(id), topic: `/${API_KEY}/${deviceIdOf(id)}/attrs` }
}

/** Remove o dispositivo do IoT Agent e a entidade do Orion. */
export async function removeTrafficSensor(server, id) {
  const okOr404 = (r) => r.ok || r.status === 404
  const device = await fiware(server, `/iot/devices/${deviceIdOf(id)}`, {
    method: 'DELETE',
    port: 4041,
  })
  if (!okOr404(device)) throw new ServiceError('iot_agent', `IoT Agent: ${device.status}`)
  const entity = await fiware(server, `/v2/entities/${entityIdOf(id)}`, {
    method: 'DELETE',
  })
  if (!okOr404(entity)) throw new ServiceError('orion', `Orion: ${entity.status}`)
}

/**
 * Leitura de teste pelo HTTP do Orion (o mesmo que a coleção do Postman faz).
 * O caminho normal é o dispositivo publicar por MQTT.
 */
export async function sendTestReading(server, id, averageSpeed) {
  // upsert: cria a entidade se o IoT Agent ainda não a criou (só cria na 1ª medida)
  const res = await fiware(server, '/v2/entities?options=upsert', {
    method: 'POST',
    body: {
      id: entityIdOf(id),
      type: ENTITY_TYPE,
      averageSpeed: { type: 'Float', value: Number(averageSpeed) },
      TimeInstant: { type: 'DateTime', value: new Date().toISOString() },
    },
  })
  if (!res.ok) {
    throw new ServiceError(
      'orion',
      `Orion: ${errorMessage(res.data, String(res.status))}`,
    )
  }
}
