/**
 * Acesso ao localStorage, num só lugar.
 *
 * - Todas as chaves levam o prefixo "conecta-cidadao:v2:", então dá para apagar só o
 *   que é do app e trocar de versão sem colidir com dados antigos.
 * - localStorage pode lançar erro (navegação privativa, cota cheia, bloqueio) ou
 *   conter lixo. Por isso toda leitura e escrita é protegida: nesses casos o app
 *   continua funcionando, apenas sem lembrar do que foi gravado.
 */
import { ServiceError } from './ServiceError.js'

const PREFIX = 'conecta-cidadao:v2:'
// Formato anterior (com contas de comércio e anúncios): é apagado ao abrir o app.
const LEGACY_PREFIXES = ['nossa-rua:v1:']
// Mesmo formato, com o nome antigo do app ("Nossa Rua"): é copiado para o prefixo novo.
const RENAMED_PREFIX = 'nossa-rua:v2:'

export const storage = {
  read(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  },

  /** Devolve true se gravou. */
  write(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key)
    } catch {
      // sem acesso ao armazenamento: não há o que remover
    }
  },

  /** O navegador deixa gravar? (Falso em navegação privativa restrita ou com o armazenamento bloqueado.) */
  isAvailable() {
    try {
      const probe = PREFIX + 'probe'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  },

  /** Remove dados de versões antigas do app, que esta versão não lê mais. */
  removeLegacy() {
    try {
      const keys = Object.keys(window.localStorage)
      keys
        .filter((k) => LEGACY_PREFIXES.some((prefix) => k.startsWith(prefix)))
        .forEach((k) => window.localStorage.removeItem(k))
      // o app trocou de nome: leva os dados para o prefixo novo sem perder nada
      for (const key of keys.filter((k) => k.startsWith(RENAMED_PREFIX))) {
        const target = PREFIX + key.slice(RENAMED_PREFIX.length)
        if (window.localStorage.getItem(target) === null) {
          window.localStorage.setItem(target, window.localStorage.getItem(key))
        }
        window.localStorage.removeItem(key)
      }
    } catch {
      // sem armazenamento, não há o que limpar
    }
  },

  /** Apaga somente as chaves do app. */
  clearAll() {
    try {
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX))
      keys.forEach((k) => window.localStorage.removeItem(k))
    } catch {
      // idem
    }
  },
}

/** Grava e, se o navegador não deixar, lança ServiceError('storage_unavailable'). */
export function writeOrThrow(
  key,
  value,
  message = 'Não foi possível salvar neste aparelho. Verifique se o navegador permite armazenamento.',
) {
  if (!storage.write(key, value)) throw new ServiceError('storage_unavailable', message)
}
