import { describe, expect, it } from 'vitest'
import { SAFE_PLACES } from '../data/safePlaces.js'
import { neighborhoodCenter } from '../data/seedMobility.js'
import { formatDistance, nearestSafePlaces, walkingMinutes } from './safePlaces.js'

describe('pontos de apoio', () => {
  it('cada bairro com mapa tem três pontos, todos com nome fictício', () => {
    const pinheiros = SAFE_PLACES.filter(
      (p) => p.neighborhoodId === 'sao-paulo/pinheiros',
    )
    expect(pinheiros).toHaveLength(3)
    expect(SAFE_PLACES.every((p) => /Fictíci[oa]/.test(p.name))).toBe(true)
  })

  it('devolve os mais próximos do centro do alerta, em ordem', () => {
    const center = neighborhoodCenter('sao-paulo/pinheiros')
    const near = nearestSafePlaces(SAFE_PLACES, center, { limit: 4 })
    expect(near).toHaveLength(4)
    expect(near[0].neighborhoodId).toBe('sao-paulo/pinheiros')
    const meters = near.map((p) => p.meters)
    expect(meters).toEqual([...meters].sort((a, b) => a - b))
    expect(near[0].walkMinutes).toBeGreaterThanOrEqual(1)
  })

  it('em Santos, os pontos ficam ao norte do bairro (longe do mar)', () => {
    const center = neighborhoodCenter('santos/boqueirao')
    for (const p of SAFE_PLACES.filter((s) => s.neighborhoodId === 'santos/boqueirao')) {
      expect(p.position[0]).toBeGreaterThanOrEqual(center[0])
    }
  })

  it('formata distância e tempo a pé', () => {
    expect(formatDistance(345)).toBe('350 m')
    expect(formatDistance(1234)).toBe('1,2 km')
    expect(walkingMinutes(750)).toBe(13)
  })
})
