import { describe, expect, it } from 'vitest'
import {
  buildCityFeed,
  isStateTabItem,
  mapLinkFor,
  noticeToAlert,
  stormAlertFor,
} from './cityFeed.js'

const NOW = new Date('2026-11-17T12:00:00Z')
const at = (h) => new Date(NOW.getTime() + h * 3_600_000).toISOString()
const alert = (id, cityId, level, pub, exp) => ({
  kind: 'alert',
  id,
  cityId,
  level,
  publishedAt: at(pub),
  expiresAt: at(exp),
})
const news = (id, cityId, pub) => ({ kind: 'news', id, cityId, publishedAt: at(pub) })

describe('isStateTabItem', () => {
  it('Estado fica com o estadual e com os eventos; o municipal vai para o Início', () => {
    expect(isStateTabItem({ kind: 'news', cityId: null })).toBe(true)
    expect(isStateTabItem({ kind: 'event', cityId: 'santos' })).toBe(true)
    expect(isStateTabItem({ kind: 'alert', cityId: 'santos' })).toBe(false)
  })
})

describe('buildCityFeed', () => {
  const items = [
    alert('sp-info', 'sao-paulo', 'info', -1, 5),
    alert('sp-urgente', 'sao-paulo', 'urgent', -3, 5),
    alert('sp-vencido', 'sao-paulo', 'urgent', -10, -1),
    alert('santos', 'santos', 'urgent', -1, 5),
    alert('estadual', null, 'urgent', -1, 5),
    news('sp-velha', 'sao-paulo', -20),
    news('sp-nova', 'sao-paulo', -2),
    news('sp-futura', 'sao-paulo', 3),
  ]

  it('só municípios pedidos, alertas ativos por gravidade e notícias por data', () => {
    const feed = buildCityFeed(items, [], { cityIds: ['sao-paulo'], now: NOW })
    expect(feed.alerts.map((a) => a.id)).toEqual(['sp-urgente', 'sp-info'])
    expect(feed.news.map((n) => n.id)).toEqual(['sp-nova', 'sp-velha'])
  })

  it('inclui avisos do município, e sem municípios não mostra nada', () => {
    const notice = noticeToAlert({
      id: 'post-1',
      type: 'notice',
      neighborhoodId: 'sao-paulo/mooca',
      createdAt: at(-1),
      title: 'Obra na rua',
      description: 'Interdição parcial.',
      level: 'attention',
      simulated: false,
    })
    const feed = buildCityFeed(items, [notice], { cityIds: ['sao-paulo'], now: NOW })
    expect(feed.alerts.map((a) => a.id)).toEqual(['sp-urgente', 'post-1', 'sp-info'])
    expect(buildCityFeed(items, [notice], { cityIds: [], now: NOW })).toEqual({
      alerts: [],
      news: [],
    })
  })
})

describe('noticeToAlert', () => {
  it('aviso de bairro aponta para o bairro; de município, sem alvo', () => {
    const base = {
      id: 'p',
      createdAt: at(-1),
      title: 't',
      description: 'd',
      level: 'urgent',
    }
    expect(noticeToAlert({ ...base, neighborhoodId: 'santos/gonzaga' })).toMatchObject({
      cityId: 'santos',
      target: { type: 'area', neighborhoodId: 'santos/gonzaga' },
      source: { id: 'admin' },
    })
    expect(noticeToAlert({ ...base, cityId: 'campinas', simulated: true })).toMatchObject(
      {
        cityId: 'campinas',
        target: null,
        source: { id: 'moderation' },
      },
    )
  })

  it('o link do mapa leva o id do alerta', () => {
    expect(mapLinkFor({ id: 'seed-city-sp-a1' })).toBe('/mapa?alerta=seed-city-sp-a1')
  })
})

describe('stormAlertFor', () => {
  const now = new Date('2026-03-01T12:00:00Z')
  const storm = (id, cityId, { pub = -1, exp = 5 } = {}) => ({
    kind: 'alert',
    id,
    cityId,
    alertType: 'storm',
    target: { type: 'area', neighborhoodId: `${cityId}/x` },
    publishedAt: new Date(now.getTime() + pub * 3_600_000).toISOString(),
    expiresAt: new Date(now.getTime() + exp * 3_600_000).toISOString(),
  })
  const items = [
    storm('sp', 'sao-paulo'),
    storm('cps', 'campinas'),
    storm('cps-old', 'campinas', { pub: -10, exp: -2 }),
    { kind: 'alert', id: 'flood', cityId: 'santos', alertType: 'flood', target: {} },
  ]

  it('prefere a tempestade ativa do município da pessoa', () => {
    expect(stormAlertFor(items, { cityId: 'campinas', now }).id).toBe('cps')
  })

  it('sem tempestade no município, usa a de São Paulo', () => {
    expect(stormAlertFor(items, { cityId: 'santos', now }).id).toBe('sp')
    expect(stormAlertFor(items, { cityId: null, now }).id).toBe('sp')
  })

  it('ignora alertas "do futuro" e devolve null sem tempestade', () => {
    expect(stormAlertFor([storm('f', 'sao-paulo', { pub: 2 })], { now })).toBeNull()
    expect(stormAlertFor([], { cityId: 'santos', now })).toBeNull()
  })
})
