import { describe, expect, it } from 'vitest'
import { parseArgs, payloadFor, speedAt, topicFor } from './simular-sensores.mjs'

describe('simulador de sensores', () => {
  it('lê as opções da linha de comando', () => {
    expect(
      parseArgs(['--broker', '10.0.0.5', '--ids', '001, 002', '--max', '60']),
    ).toMatchObject({
      broker: '10.0.0.5',
      port: 1883,
      apikey: 'TEF',
      ids: ['001', '002'],
      max: 60,
    })
  })

  it('publica UltraLight no tópico do IoT Agent', () => {
    expect(topicFor('TEF', '001')).toBe('/TEF/traffic001/attrs')
    expect(payloadFor(23.456)).toBe('v|23.5')
  })

  it('a velocidade fica entre 10% e 100% da máxima', () => {
    for (let t = 0; t < 600; t += 7) {
      const v = speedAt(t, 1, 50)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(50)
    }
  })
})
