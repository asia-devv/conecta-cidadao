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
  segmentId: 'sp-av-paulista',
  roadName: 'Av. Paulista',
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
      segmentId: 'sp-av-paulista',
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
    fake.measure('traffic001', 12)

    const snapshot = await getMobilitySnapshot('sao-paulo')
    const segment = snapshot.segments.find((s) => s.id === 'sp-av-paulista')
    expect(segment.reading).toMatchObject({
      source: 'iot',
      sensorId: '001',
      status: 'ok',
      speedKmh: 12,
      percent: 24,
      level: 'heavy',
    })
    expect(snapshot.iot).toEqual({ status: 'connected', count: 1 })
    // vias sem sensor: sem dados (cinza), nada simulado
    expect(
      snapshot.segments.find((s) => s.id === 'sp-av-reboucas').reading,
    ).toMatchObject({
      status: 'no_data',
      level: 'unknown',
    })
  })

  it('lê o sensor do smart-traffic (Traffic:003, speed_kmh) na Marginal Tietê', async () => {
    const fake = installFakeFiware()
    saveFiwareServer(SERVER)
    fake.entities.set('urn:ngsi-ld:Traffic:003', {
      id: 'urn:ngsi-ld:Traffic:003',
      type: 'Traffic',
      speed_kmh: 18,
      vehicle_count: 7,
      s: 'ON',
      TimeInstant: new Date().toISOString(),
    })
    const snapshot = await getMobilitySnapshot('sao-paulo')
    const marginal = snapshot.segments.find((s) => s.id === 'sp-marginal-tiete')
    // 18 km/h numa via de 60 km/h = 30% da máxima: congestionada
    expect(marginal.reading).toMatchObject({
      source: 'iot',
      sensorId: '003',
      speedKmh: 18,
      percent: 30,
      level: 'heavy',
      vehicleCount: 7,
    })
  })

  it('FIWARE fora do ar: as vias ficam sem dados e a tela avisa', async () => {
    installFakeFiware({ online: false })
    saveFiwareServer(SERVER)
    const snapshot = await getMobilitySnapshot('sao-paulo')
    expect(snapshot.iot.status).toBe('error')
    expect(snapshot.segments.every((s) => s.reading.status === 'no_data')).toBe(true)
  })
})
