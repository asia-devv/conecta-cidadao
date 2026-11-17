/**
 * Acesso ao localStorage, num só lugar.
 *
 * - Todas as chaves levam o prefixo "nossa-rua:v2:", então dá para apagar só o
 *   que é do app e trocar de versão sem colidir com dados antigos.
 * - localStorage pode lançar erro (navegação privativa, cota cheia, bloqueio) ou
 *   conter lixo. Por isso toda leitura e escrita é protegida: nesses casos o app
 *   continua funcionando, apenas sem lembrar do que foi gravado.
 */
const PREFIX = 'nossa-rua:v2:'
// Formato anterior (com contas de comércio e anúncios): é apagado ao abrir o app.
const LEGACY_PREFIXES = ['nossa-rua:v1:']

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
      Object.keys(window.localStorage)
        .filter((k) => LEGACY_PREFIXES.some((prefix) => k.startsWith(prefix)))
        .forEach((k) => window.localStorage.removeItem(k))
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
