import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeFiware } from '../test/fakeFiware.js'
import { clock } from './clock.js'
import {
  checkConnection,
  getFiwareServer,
  listTrafficSensors,
  provisionTrafficSensor,
  removeTrafficSensor,
  saveFiwareServer,
  sendTestReading,
} from './fiwareService.js'
import { getMobilitySnapshot } from './mobilityService.js'

const SERVER = '10.0.0.5'
const road = {
  segmentId: 'sao-paulo-s1',
  roadName: 'Ligação Pinheiros–Centro',
  maxSpeed: 50,
}

afterEach(() => vi.unstubAllGlobals())

describe('servidor FIWARE', () => {
  it('guarda só IPv4', () => {
    expect(saveFiwareServer('http://10.0.0.5:1026')).toBe('10.0.0.5')
    expect(getFiwareServer()).toBe('10.0.0.5')
    expect(() => saveFiwareServer('exemplo.com')).toThrow(/IPv4/)
  })

  it('testa a conexão pelo proxy, nas portas do Orion e do IoT Agent', async () => {
    const fake = installFakeFiware()
    expect(await checkConnection(SERVER)).toEqual({ version: '3.10.1' })
    expect(JSON.parse(fake.fetchMock.mock.calls[0][1].body)).toMatchObject({
      servidor: '10.0.0.5:1026',
      caminho: '/version',
    })
  })

  it('servidor fora do ar vira erro com a causa', async () => {
    installFakeFiware({ online: false })
    await expect(checkConnection(SERVER)).rejects.toThrow(/ECONNREFUSED/)
  })
})

describe('sensores de velocidade média', () => {
  it('cadastra, recebe a medida (MQTT → IoT Agent → Orion) e remove', async () => {
    const fake = installFakeFiware()
    const result = await provisionTrafficSensor(SERVER, '001', road)
    expect(result.topic).toBe('/TEF/traffic001/attrs')
    expect(fake.devices.get('traffic001').static_attributes).toContainEqual({
      name: 'maxSpeed',
      type: 'Integer',
      value: 50,
    })

    let [sensor] = await listTrafficSensors(SERVER)
    expect(sensor).toMatchObject({ id: '001', provisioned: true, averageSpeed: null })

    fake.measure('traffic001', 17.5)
    ;[sensor] = await listTrafficSensors(SERVER)
    expect(sensor).toMatchObject({
      averageSpeed: 17.5,
      maxSpeed: 50,
      segmentId: 'sao-paulo-s1',
    })

    await removeTrafficSensor(SERVER, '001')
    expect(await listTrafficSensors(SERVER)).toEqual([])
  })

  it('ID repetido é recusado com explicação', async () => {
    installFakeFiware()
    await provisionTrafficSensor(SERVER, '001', road)
    await expect(provisionTrafficSensor(SERVER, '001', road)).rejects.toMatchObject({
      code: 'exists',
    })
  })

  it('leitura de teste pelo Orion (como no Postman)', async () => {
    installFakeFiware()
    await sendTestReading(SERVER, '009', 33)
    const [sensor] = await listTrafficSensors(SERVER)
    expect(sensor).toMatchObject({ id: '009', provisioned: false, averageSpeed: 33 })
  })
})

describe('mapa com sensor IoT', () => {
  it('a via com sensor usa a leitura real: média 12 km/h numa via de 50 = congestionada', async () => {
    clock.reset()
    const fake = installFakeFiware()
    saveFiwareServer(SERVER)
    await provisionTrafficSensor(SERVER, '001', road)
    fake.measure('traffic001', 12, clock.now())

    const snapshot = await getMobilitySnapshot('sao-paulo')
    const segment = snapshot.segments.find((s) => s.id === 'sao-paulo-s1')
    expect(segment.reading).toMatchObject({
      source: 'iot',
      sensorId: '001',
      status: 'ok',
      speedKmh: 12,
      percent: 24,
      level: 'heavy',
    })
    expect(snapshot.iot).toEqual({ status: 'connected', count: 1 })
    // as outras vias continuam simuladas
    expect(
      snapshot.segments.find((s) => s.id === 'sao-paulo-s2').reading.source,
    ).toBeUndefined()
  })

  it('FIWARE fora do ar: o mapa segue com a simulação e avisa', async () => {
    installFakeFiware({ online: false })
    saveFiwareServer(SERVER)
    const snapshot = await getMobilitySnapshot('sao-paulo')
    expect(snapshot.iot.status).toBe('error')
    expect(snapshot.segments.every((s) => s.reading.source === undefined)).toBe(true)
  })
})
