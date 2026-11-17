import { describe, expect, it } from 'vitest'
import { can, getAuthorLabel, getInitials } from './account.js'
import { loginSchema, profileSchema, signupSchema } from './accountSchemas.js'

const resident = {
  type: 'resident',
  name: 'Ana Souza Lima',
  neighborhoodId: 'sao-paulo/pinheiros',
  privacy: { authorDisplay: 'neighborhood' },
}

describe('permissões por tipo de conta', () => {
  it('cada tipo só faz o que lhe cabe', () => {
    expect(can(resident, 'report')).toBe(true)
    expect(can(resident, 'favorite_station')).toBe(true)
    expect(can({ type: 'admin' }, 'report')).toBe(false)
    expect(can({ type: 'admin' }, 'access_admin')).toBe(true)
    expect(can(resident, 'access_admin')).toBe(false)
  })

  it('sem conta ou com ação desconhecida, nega', () => {
    expect(can(null, 'report')).toBe(false)
    expect(can(resident, 'inventada')).toBe(false)
  })
})

describe('getAuthorLabel (D18)', () => {
  it('por padrão mostra só o bairro', () => {
    expect(getAuthorLabel(resident)).toBe('Morador(a) de Pinheiros')
  })

  it('com a opção "primeiro nome e bairro", mostra os dois', () => {
    const account = { ...resident, privacy: { authorDisplay: 'first_name' } }
    expect(getAuthorLabel(account)).toBe('Ana · Pinheiros')
  })

  it('não quebra sem bairro ou sem conta', () => {
    expect(getAuthorLabel({ type: 'resident', neighborhoodId: 'x' })).toBe(
      'Morador(a) de sua região',
    )
    expect(getAuthorLabel(null)).toBe('Morador(a)')
  })
})

describe('getInitials', () => {
  it('usa a primeira e a última inicial', () => {
    expect(getInitials('Ana Souza Lima')).toBe('AL')
    expect(getInitials('ana')).toBe('A')
    expect(getInitials('  ')).toBe('?')
  })
})

describe('schemas de formulário', () => {
  const valid = {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    neighborhoodId: 'sao-paulo/pinheiros',
    acceptedTerms: true,
  }

  it('aceita um cadastro válido, sem documento algum', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true)
  })

  it('recusa nome curto, bairro desconhecido e falta de aceite', () => {
    const result = signupSchema.safeParse({
      ...valid,
      name: 'A',
      neighborhoodId: '',
      acceptedTerms: false,
    })
    expect(result.success).toBe(false)
    const paths = result.error.issues.map((i) => i.path[0])
    expect(paths).toEqual(
      expect.arrayContaining(['name', 'neighborhoodId', 'acceptedTerms']),
    )
  })

  it('campos extras (como um documento) são descartados', () => {
    const parsed = signupSchema.parse({ ...valid, document: '529.982.247-25' })
    expect(parsed).not.toHaveProperty('document')
  })

  it('e-mail e login validam formato', () => {
    expect(loginSchema.safeParse({ email: 'sem-arroba' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: ' ana@exemplo.com ' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: '' }).success).toBe(false)
  })

  it('perfil exige nome com pelo menos 2 letras', () => {
    expect(profileSchema.safeParse({ name: 'A' }).success).toBe(false)
    expect(profileSchema.safeParse({ name: 'Ana' }).success).toBe(true)
  })
})
