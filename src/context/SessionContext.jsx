import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as accounts from '../services/accountService.js'

/**
 * Sessão do usuário: quem está logado e as ações de conta.
 *
 * `status` é 'loading' enquanto a sessão salva é lida (a leitura é assíncrona,
 * como será com um backend) e 'ready' depois. As rotas protegidas esperam
 * 'ready' antes de decidir se redirecionam.
 *
 * As ações repassam o erro do serviço (ServiceError); quem chama decide como
 * mostrá-lo, normalmente no próprio formulário.
 */
const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', account: null })

  useEffect(() => {
    let cancelled = false
    accounts.getSession().then((account) => {
      if (!cancelled) setState({ status: 'ready', account })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setAccount = useCallback((account) => setState({ status: 'ready', account }), [])

  const value = useMemo(() => {
    /** Chama o serviço e passa a usar a conta que ele devolveu. */
    const withAccount =
      (action) =>
      async (...args) => {
        const account = await action(...args)
        setAccount(account)
        return account
      }
    return {
      status: state.status,
      account: state.account,
      signUp: withAccount(accounts.signUp),
      signIn: withAccount(accounts.signIn),
      signInDemo: withAccount(accounts.signInDemo),
      signInAdmin: withAccount(accounts.signInAdmin),
      updateAccount: withAccount((patch) =>
        accounts.updateAccount(state.account.id, patch),
      ),
      async signOut() {
        await accounts.signOut()
        setAccount(null)
      },
      async deleteAccount() {
        await accounts.deleteAccount(state.account.id)
        setAccount(null)
      },
      exportAccountData: () => accounts.exportAccountData(state.account.id),
    }
  }, [state, setAccount])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider')
  return ctx
}
