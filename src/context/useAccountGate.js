import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/Toast.jsx'
import { can } from '../domain/account.js'
import { useSession } from './SessionContext.jsx'

/**
 * Porta de entrada das ações que exigem conta (apoiar, salvar, favoritar):
 *  - visitante: recebe o aviso `guest` e vai para "Entrar", voltando depois;
 *  - conta sem a permissão: recebe o aviso `denied` (se houver);
 *  - quem pode: recebe a conta, para seguir com a ação.
 *
 * Devolve uma função `(permission, { guest, denied }) => account | null`.
 */
export function useAccountGate() {
  const { account } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  return (permission, { guest, denied } = {}) => {
    if (!account) {
      toast.show(guest, { tone: 'info' })
      navigate('/entrar', { state: { from: location } })
      return null
    }
    if (!can(account, permission)) {
      if (denied) toast.show(denied, { tone: 'info' })
      return null
    }
    return account
  }
}
