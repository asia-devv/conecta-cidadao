import { describe, expect, it } from 'vitest'
import { responsibleFor } from './responsibility.js'

describe('responsibleFor', () => {
  it('em São Paulo, buraco vai para a subprefeitura do bairro', () => {
    const r = responsibleFor({ category: 'road', neighborhoodId: 'sao-paulo/tatuape' })
    expect(r.body).toEqual({
      kind: 'subprefeitura',
      name: 'Subprefeitura Fictícia Mooca',
    })
    expect(r.cityHall.name).toBe('Prefeitura Fictícia de São Paulo')
  })

  it('iluminação e alagamento vão para o departamento da cidade', () => {
    expect(
      responsibleFor({ category: 'lighting', neighborhoodId: 'sao-paulo/pinheiros' }).body
        .name,
    ).toBe('Departamento Fictício de Iluminação Pública de São Paulo')
    expect(
      responsibleFor({ category: 'flooding', neighborhoodId: 'campinas/cambui' }).body
        .name,
    ).toBe('Defesa Civil Fictícia de Campinas')
  })

  it('fora de São Paulo não há subprefeitura: vai para a secretaria', () => {
    const r = responsibleFor({ category: 'road', neighborhoodId: 'santos/gonzaga' })
    expect(r.body).toEqual({
      kind: 'department',
      name: 'Secretaria Fictícia de Obras de Santos',
    })
  })

  it('vereador(a) fictício(a), sempre o mesmo por bairro', () => {
    const a = responsibleFor({ category: 'road', neighborhoodId: 'santos/gonzaga' })
    const b = responsibleFor({ category: 'tree', neighborhoodId: 'santos/gonzaga' })
    expect(a.councilor).toEqual(b.councilor)
    expect(a.councilor.title).toMatch(/fictíci[ao]/)
  })

  it('bairro desconhecido não tem responsável', () => {
    expect(responsibleFor({ category: 'road', neighborhoodId: 'x/y' })).toBeNull()
  })
})
