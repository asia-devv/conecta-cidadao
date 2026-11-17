import { describe, expect, it, vi } from 'vitest'
import { storage, writeOrThrow } from './storage.js'

describe('storage', () => {
  it('grava e lê valores JSON com o prefixo do app', () => {
    expect(storage.write('k', { a: 1 })).toBe(true)
    expect(storage.read('k')).toEqual({ a: 1 })
    expect(window.localStorage.getItem('nossa-rua:v2:k')).toBe('{"a":1}')
  })

  it('devolve o valor padrão para chave ausente ou conteúdo corrompido', () => {
    expect(storage.read('nada', 'padrao')).toBe('padrao')
    window.localStorage.setItem('nossa-rua:v2:ruim', '{quebrado')
    expect(storage.read('ruim', [])).toEqual([])
  })

  it('clearAll apaga só as chaves do app', () => {
    storage.write('a', 1)
    window.localStorage.setItem('de-outro-app', 'x')
    storage.clearAll()
    expect(storage.read('a')).toBeNull()
    expect(window.localStorage.getItem('de-outro-app')).toBe('x')
  })

  it('writeOrThrow lança ServiceError quando o navegador bloqueia a gravação', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => writeOrThrow('k', 1, 'Sem espaço.')).toThrow(
      expect.objectContaining({ code: 'storage_unavailable', message: 'Sem espaço.' }),
    )
    spy.mockRestore()
    expect(() => writeOrThrow('k', 1)).not.toThrow()
    expect(storage.read('k')).toBe(1)
  })
})
