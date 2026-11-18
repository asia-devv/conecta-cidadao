import { describe, expect, it } from 'vitest'
import {
  liveReading,
  recordSamples,
  windowAverage,
  deviceProvisioning,
  mergeSensors,
  parseServer,
  sensorStatus,
  topicOf,
  ultralightPayload,
} from './iot.js'

const NOW = new Date('2026-11-17T18:00:00Z')
const ago = (min) => new Date(NOW.getTime() - min * 60_000).toISOString()

describe('convenções FIWARE', () => {
  it('tópico MQTT e mensagem UltraLight', () => {
    expect(topicOf('001')).toBe('/TEF/traffic001/attrs')
    expect(ultralightPayload(42)).toBe('v|42.0')
  })

  it('aceita só IPv4 (com ou sem porta)', () => {
    expect(parseServer(' 98.91.20.39 ')).toBe('98.91.20.39')
    expect(parseServer('http://10.0.0.5:1026/')).toBe('10.0.0.5')
    expect(parseServer('meu-servidor.com')).toBeNull()
    expect(parseServer('300.1.1.1')).toBeNull()
  })

  it('cadastro no IoT Agent leva a via e a velocidade máxima como atributos fixos', () => {
    const body = deviceProvisioning('001', {
      segmentId: 'sao-paulo-s1',
      roadName: 'Ligação Pinheiros–Centro',
      maxSpeed: 50,
    })
    const device = body.devices[0]
    expect(device).toMatchObject({
      device_id: 'traffic001',
      entity_name: 'urn:ngsi-ld:TrafficSensor:001',
      entity_type: 'TrafficSensor',
      transport: 'MQTT',
    })
    expect(device.attributes[0]).toEqual({
      object_id: 'v',
      name: 'averageSpeed',
      type: 'Float',
    })
    expect(device.static_attributes).toContainEqual({
      name: 'maxSpeed',
      type: 'Integer',
      value: 50,
    })
  })
})

describe('mergeSensors', () => {
  it('junta dispositivo (IoT Agent) e entidade (Orion)', () => {
    const sensors = mergeSensors(
      [
        {
          device_id: 'traffic002',
          entity_name: 'urn:ngsi-ld:TrafficSensor:002',
          entity_type: 'TrafficSensor',
          static_attributes: [{ name: 'maxSpeed', value: 60 }],
        },
        { device_id: 'lamp003', entity_name: 'x', entity_type: 'Lamp' },
      ],
      [
        {
          id: 'urn:ngsi-ld:TrafficSensor:001',
          type: 'TrafficSensor',
          averageSpeed: '31.5',
          maxSpeed: 50,
          TimeInstant: ago(1),
        },
      ],
    )
    expect(sensors.map((s) => s.id)).toEqual(['001', '002'])
    expect(sensors[0]).toMatchObject({ provisioned: false, averageSpeed: 31.5 })
    expect(sensors[1]).toMatchObject({
      provisioned: true,
      maxSpeed: 60,
      averageSpeed: null,
    })
  })
})

describe('sensorStatus: média captada x máxima da via', () => {
  const sensor = (averageSpeed, minutes = 1) => ({
    averageSpeed,
    maxSpeed: 60,
    updatedAt: ago(minutes),
  })

  it('classifica pela fração da velocidade máxima (75% / 40%)', () => {
    expect(sensorStatus(sensor(55), NOW)).toMatchObject({
      status: 'ok',
      level: 'free',
      percent: 92,
      differenceKmh: 5,
    })
    expect(sensorStatus(sensor(30), NOW).level).toBe('moderate')
    expect(sensorStatus(sensor(12), NOW).level).toBe('heavy')
  })

  it('respeita os limites configurados', () => {
    expect(sensorStatus(sensor(30), NOW, { freeFrom: 50, heavyBelow: 20 }).level).toBe(
      'free',
    )
  })

  it('sem leitura ou leitura velha não vira número', () => {
    expect(sensorStatus({ averageSpeed: null, maxSpeed: 60 }, NOW).status).toBe('no_data')
    expect(sensorStatus(sensor(40, 30), NOW)).toMatchObject({
      status: 'stale',
      level: 'unknown',
    })
  })
})

describe('média de 30 s (como no smart-traffic)', () => {
  const at = (s) => new Date(NOW.getTime() - s * 1000).toISOString()

  it('só conta medição nova quando o TimeInstant muda e descarta as antigas', () => {
    const history = new Map()
    const t = NOW.getTime()
    recordSamples(history, [{ id: '003', averageSpeed: 30, updatedAt: at(40) }], t)
    recordSamples(history, [{ id: '003', averageSpeed: 20, updatedAt: at(10) }], t)
    recordSamples(history, [{ id: '003', averageSpeed: 20, updatedAt: at(10) }], t) // repetida
    recordSamples(history, [{ id: '003', averageSpeed: 10, updatedAt: at(2) }], t)
    expect(history.get('003').map((s) => s.speed)).toEqual([20, 10])
    expect(windowAverage(history.get('003'))).toBe(15)
    expect(windowAverage([])).toBeNull()
  })

  it('a cor sai da média; "agora" mostra a última medição', () => {
    const sensor = { id: '003', averageSpeed: 10, maxSpeed: 60, updatedAt: at(2) }
    const reading = liveReading(sensor, [{ speed: 50 }, { speed: 40 }], NOW)
    expect(reading).toMatchObject({
      status: 'ok',
      speedKmh: 45,
      latestKmh: 10,
      level: 'free',
      samples: 2,
    })
  })

  it('sem medição na janela, usa a última leitura se ainda for recente', () => {
    const sensor = { id: '003', averageSpeed: 12, maxSpeed: 60, updatedAt: at(60) }
    expect(liveReading(sensor, [], NOW)).toMatchObject({ speedKmh: 12, level: 'heavy' })
    expect(liveReading({ ...sensor, updatedAt: at(60 * 20) }, [], NOW)).toMatchObject({
      status: 'offline',
      level: 'unknown',
    })
  })
})
