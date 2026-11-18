import { describe, expect, it } from 'vitest'
import { TRAFFIC_STYLES, trafficLineStyle } from './mapStyles.js'

describe('estilos do trânsito no mapa', () => {
  it('cada nível tem um padrão de traço diferente, não só uma cor', () => {
    // com dados, cada nível tem um traço próprio (sem dados se distingue pela cor cinza e pelo texto)
    const { free, moderate, heavy } = TRAFFIC_STYLES
    const signatures = [free, moderate, heavy].map((s) => `${s.dashArray}|${s.weight}`)
    expect(new Set(signatures).size).toBe(3)
  })

  it('o congestionamento intenso é o traço mais grosso', () => {
    const heaviest = Math.max(...Object.values(TRAFFIC_STYLES).map((s) => s.weight))
    expect(TRAFFIC_STYLES.heavy.weight).toBe(heaviest)
  })

  it('nível desconhecido cai no estilo "sem dados" (cinza contínuo, como no smart-traffic)', () => {
    expect(trafficLineStyle('qualquer-coisa')).toMatchObject({
      className: 'nr-line-unknown',
      dashArray: null,
    })
  })

  it('pontas arredondadas, como no smart-traffic', () => {
    expect(trafficLineStyle('free').lineCap).toBe('round')
    expect(trafficLineStyle('heavy').lineCap).toBe('round')
  })
})
