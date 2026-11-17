import { useCallback, useState } from 'react'

/**
 * Estado de uma ação assíncrona disparada por um botão ou formulário: `busy` enquanto
 * ela roda e `error` com a mensagem, se falhar. `run` devolve true se deu certo.
 * `setError` serve para erros de validação da própria tela, antes de chamar `run`.
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, error, setError, run }
}
