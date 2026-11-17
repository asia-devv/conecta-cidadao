import { describe, expect, it } from 'vitest'
import { RAIL_LINES, RAIL_STATIONS, RAIL_TRANSFERS } from '../data/railNetwork.js'
import { alternativeRoutes, blockedStretch, buildGraph, shortestRoute } from './rail.js'

const network = { lines: RAIL_LINES, stations: RAIL_STATIONS, transfers: RAIL_TRANSFERS }

// Rede de brinquedo: A-B-C na linha 1; A-D-C na linha 2 (desvio mais longo).
const toy = {
  lines: [
    { id: 'L1', kind: 'Metrô', stations: ['a', 'b', 'c'] },
    { id: 'L2', kind: 'Metrô', stations: ['a', 'd', 'c'] },
  ],
  stations: {
    a: { lat: 0, lng: 0 },
    b: { lat: 0, lng: 0.01 },
    c: { lat: 0, lng: 0.02 },
    d: { lat: 0.01, lng: 0.01 },
  },
  transfers: [],
}

describe('rede de brinquedo', () => {
  it('sem bloqueio, vai pela linha direta', () => {
    const route = shortestRoute(buildGraph(toy), 'a', 'c')
    expect(route.legs).toEqual([
      { type: 'rail', lineId: 'L1', stations: ['a', 'b', 'c'] },
    ])
  })

  it('com o trecho bloqueado, desvia pela outra linha e oferece ônibus de apoio', () => {
    const result = alternativeRoutes(toy, { lineId: 'L1', from: 'a', to: 'c' })
    expect(result.stretch).toEqual(['a', 'b', 'c'])
    expect(result.routes[0].legs[0]).toMatchObject({ lineId: 'L2' })
    expect(result.routes.at(-1).type).toBe('bus')
    expect(result.routes[0].minutes).toBeGreaterThan(result.usualMinutes)
  })

  it('trecho inválido não quebra', () => {
    expect(blockedStretch(toy, { lineId: 'L9', from: 'a', to: 'c' }).stations).toEqual([])
    expect(alternativeRoutes(toy, { lineId: 'L1', from: 'a', to: 'a' }).routes).toEqual(
      [],
    )
  })
})

describe('rede real (GTFS 2017)', () => {
  it('Linha 9 parada entre Osasco e Pinheiros: desvia pela 8, 3 e 4', () => {
    const result = alternativeRoutes(network, {
      lineId: 'trem-9',
      from: 'osasco',
      to: 'pinheiros',
    })
    expect(result.stretch[0]).toBe('osasco')
    expect(result.stretch.at(-1)).toBe('pinheiros')
    const best = result.routes[0]
    expect(best.type).toBe('rail')
    const lines = best.legs.map((l) => l.lineId)
    expect(lines).not.toContain('trem-9')
    expect(lines).toEqual(expect.arrayContaining(['trem-8', 'metro-4']))
    expect(best.legs.at(-1).stations.at(-1)).toBe('pinheiros')
  })

  it('Linha 3 lenta entre Sé e Brás: Linha 1 até a Luz e depois a 11 (ou 10/12)', () => {
    const result = alternativeRoutes(network, {
      lineId: 'metro-3',
      from: 'se',
      to: 'bras',
    })
    const best = result.routes[0]
    expect(best.legs[0].lineId).toBe('metro-1')
    expect(best.legs.at(-1).stations.at(-1)).toBe('bras')
    expect(result.routes.filter((r) => r.type === 'rail').length).toBeGreaterThanOrEqual(
      1,
    )
  })

  it('baldeação a pé Paulista–Consolação entra na conta', () => {
    const route = shortestRoute(buildGraph(network), 'pinheiros', 'vila-madalena')
    expect(route.legs.some((l) => l.type === 'walk')).toBe(true)
  })
})
