import { vi } from 'vitest'

/**
 * FIWARE de mentira para os testes: responde ao POST /api/fiware (o proxy do
 * Vite) como responderiam o Orion (1026) e o IoT Agent (4041). `measure()` faz
 * o papel do dispositivo publicando por MQTT: o IoT Agent atualiza a entidade.
 */
export function installFakeFiware({ online = true } = {}) {
  const devices = new Map()
  const entities = new Map()
  const json = (status, body) =>
    new Response(body === undefined || status === 204 ? null : JSON.stringify(body), {
      status,
    })

  const fetchMock = vi.fn(async (url, init) => {
    if (url !== '/api/fiware') throw new Error(`URL inesperada: ${url}`)
    const { servidor, caminho, metodo = 'GET', body } = JSON.parse(init.body)
    if (!online)
      return json(502, {
        erro: 'Não foi possível conectar ao servidor FIWARE',
        causa: 'ECONNREFUSED',
      })
    const port = servidor.split(':')[1]
    const [path, query = ''] = caminho.split('?')

    if (port === '1026' && path === '/version')
      return json(200, { orion: { version: '3.10.1' } })

    if (port === '4041' && path === '/iot/devices') {
      if (metodo === 'GET')
        return json(200, { count: devices.size, devices: [...devices.values()] })
      const device = body.devices[0]
      if (devices.has(device.device_id)) return json(409, { name: 'DUPLICATE_DEVICE_ID' })
      devices.set(device.device_id, device)
      return json(201)
    }
    if (port === '4041' && path.startsWith('/iot/devices/') && metodo === 'DELETE') {
      return devices.delete(path.split('/').at(-1)) ? json(204) : json(404, {})
    }

    if (port === '1026' && path === '/v2/entities' && metodo === 'GET') {
      const types = new URLSearchParams(query).get('type')?.split(',')
      return json(
        200,
        [...entities.values()].filter((e) => !types || types.includes(e.type)),
      )
    }
    if (port === '1026' && path === '/v2/entities' && metodo === 'POST') {
      const flat = Object.fromEntries(
        Object.entries(body).map(([k, v]) => [
          k,
          v && typeof v === 'object' ? v.value : v,
        ]),
      )
      entities.set(body.id, { ...entities.get(body.id), ...flat })
      return json(204)
    }
    if (port === '1026' && path.startsWith('/v2/entities/') && metodo === 'DELETE') {
      return entities.delete(decodeURIComponent(path.split('/').at(-1)))
        ? json(204)
        : json(404, {})
    }
    return json(404, { error: 'NotFound', description: `${metodo} ${caminho}` })
  })
  vi.stubGlobal('fetch', fetchMock)

  return {
    fetchMock,
    devices,
    entities,
    /** O dispositivo publicou `v|<speed>`: o IoT Agent atualiza a entidade. */
    measure(deviceId, speed, at = new Date()) {
      const device = devices.get(deviceId)
      if (!device) throw new Error(`Dispositivo não cadastrado: ${deviceId}`)
      const statics = Object.fromEntries(
        (device.static_attributes ?? []).map((a) => [a.name, a.value]),
      )
      entities.set(device.entity_name, {
        id: device.entity_name,
        type: device.entity_type,
        ...statics,
        averageSpeed: speed,
        TimeInstant: at.toISOString(),
      })
    },
  }
}
