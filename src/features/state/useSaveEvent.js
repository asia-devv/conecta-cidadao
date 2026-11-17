import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAccountGate } from '../../context/useAccountGate.js'
import { toggleSavedEvent } from '../../services/stateService.js'

/**
 * Salvar um evento, com as regras de quem pode:
 *  - visitante: vai para "Entrar" e volta depois;
 *  - morador(a): salva ou remove.
 */
export function useSaveEvent() {
  const gate = useAccountGate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: toggleSavedEvent,
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['state'] })
      toast.show(event.saved ? 'Evento salvo.' : 'Evento removido dos salvos.', {
        tone: 'info',
      })
    },
    onError: (error) => toast.show(error.message, { tone: 'danger' }),
  })

  return {
    pendingId: mutation.isPending ? mutation.variables.eventId : null,
    toggle(event) {
      const account = gate('save_event', {
        guest: 'Entre para salvar eventos.',
        denied: 'Esta conta não pode salvar eventos.',
      })
      if (account) mutation.mutate({ eventId: event.id, accountId: account.id })
    },
  }
}
