import { describe, expect, it } from 'vitest'
import { CITIES } from '../domain/places.js'
import { generateSeedPosts } from './seedPosts.js'

const EPOCH = new Date('2026-11-01T12:00:00-03:00').getTime()
const allNeighborhoods = CITIES.flatMap((c) => c.neighborhoods)

describe('seed de publicações', () => {
  const posts = generateSeedPosts(EPOCH)

  it('é determinístico', () => {
    expect(generateSeedPosts(EPOCH)).toEqual(posts)
  })

  it('tem ids únicos e seguros para URL (sem "/")', () => {
    const ids = posts.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true)
  })

  it('todo bairro do catálogo tem entre 3 e 5 relatos', () => {
    for (const n of allNeighborhoods) {
      const reports = posts.filter(
        (p) => p.neighborhoodId === n.id && p.type === 'report',
      )
      expect(reports.length).toBeGreaterThanOrEqual(3)
      expect(reports.length).toBeLessThanOrEqual(5)
    }
  })

  it('no máximo 1 aviso por bairro e nenhum anúncio comercial', () => {
    for (const n of allNeighborhoods) {
      expect(
        posts.filter((p) => p.neighborhoodId === n.id && p.type === 'notice').length,
      ).toBeLessThanOrEqual(1)
    }
    expect(posts.some((p) => p.type === 'commercial')).toBe(false)
  })

  it('todas as datas são anteriores à âncora, e os avisos vêm da moderação', () => {
    expect(posts.every((p) => new Date(p.createdAt).getTime() < EPOCH)).toBe(true)
    expect(
      posts.filter((p) => p.type === 'notice').every((p) => p.source === 'moderation'),
    ).toBe(true)
  })

  it('mudar a âncora desloca as datas sem mudar o conteúdo', () => {
    const later = generateSeedPosts(EPOCH + 86_400_000)
    expect(later.map((p) => p.title)).toEqual(posts.map((p) => p.title))
    expect(
      new Date(later[0].createdAt).getTime() - new Date(posts[0].createdAt).getTime(),
    ).toBe(86_400_000)
  })
})
