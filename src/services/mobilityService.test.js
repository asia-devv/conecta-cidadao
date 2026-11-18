import { beforeEach, describe, expect, it } from 'vitest'
import { goToLocalHour } from '../test/clockHelpers.js'
import { clock } from './clock.js'
import { getMobilitySnapshot } from './mobilityService.js'

beforeEach(() => clock.reset())

describe('getMobilitySnapshot', () => {
  it('falha com not_found para município sem dados', async () => {
    await expect(getMobilitySnapshot('osasco')).rejects.toMatchObject({
      code: 'not_found',
    })
  })

  it('devolve as vias reais (sem sensor: sem dados) e linhas com ônibus e paradas', async () => {
    goToLocalHour(12)
    const snap = await getMobilitySnapshot('sao-paulo')
    expect(snap.cityName).toBe('São Paulo')
    expect(snap.segments.length).toBeGreaterThan(10)
    expect(snap.segments[0]).toMatchObject({ id: 'sp-marginal-tiete', freeFlowKmh: 60 })
    for (const segment of snap.segments) {
      // traçado da rua (muitos pontos), não uma reta entre dois bairros
      expect(segment.path.length).toBeGreaterThanOrEqual(10)
      expect(segment.reading).toMatchObject({ status: 'no_data', level: 'unknown' })
    }
    expect(snap.trafficBounds).not.toBeNull()
    expect(snap.lines.length).toBeGreaterThan(1)
    for (const line of snap.lines) {
      expect(line.running).toBe(true)
      expect(line.buses.length).toBeGreaterThan(0)
      expect(line.stops.every((s) => s.arrivals.length > 0)).toBe(true)
    }
  })

  it('o enquadramento do mapa contém todos os trechos', async () => {
    const snap = await getMobilitySnapshot('campinas')
    const [[south, west], [north, east]] = snap.bounds
    for (const [lat, lng] of snap.segments.flatMap((s) => s.path)) {
      expect(lat).toBeGreaterThanOrEqual(south)
      expect(lat).toBeLessThanOrEqual(north)
      expect(lng).toBeGreaterThanOrEqual(west)
      expect(lng).toBeLessThanOrEqual(east)
    }
  })

  it('de madrugada não há ônibus nem previsões', async () => {
    goToLocalHour(3)
    const snap = await getMobilitySnapshot('sao-paulo')
    for (const line of snap.lines) {
      expect(line.running).toBe(false)
      expect(line.buses).toEqual([])
      expect(line.stops.every((s) => s.arrivals.length === 0)).toBe(true)
    }
  })

  it('municípios sem vias monitoradas não desenham trânsito', async () => {
    const snap = await getMobilitySnapshot('santos')
    expect(snap.segments).toEqual([])
    expect(snap.trafficBounds).toBeNull()
    expect(snap.lines.length).toBeGreaterThan(0)
  })

  it('os ônibus se mexem com o relógio', async () => {
    goToLocalHour(12)
    const before = await getMobilitySnapshot('sao-paulo')
    clock.advance(10 * 60_000)
    const after = await getMobilitySnapshot('sao-paulo')
    expect(after.lines[0].buses[0].position).not.toEqual(
      before.lines[0].buses[0].position,
    )
  })
})
