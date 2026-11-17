import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/Toast.jsx'
import { useAccountGate } from '../../context/useAccountGate.js'
import { toggleSupport } from '../../services/postService.js'

/**
 * Ação de apoiar um relato, com as regras de quem pode:
 *  - visitante: vai para "Entrar" e volta depois;
 *  - conta sem permissão (administração): recebe um aviso;
 *  - morador: apoia ou retira o apoio.
 */
export function useSupport() {
  const gate = useAccountGate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: toggleSupport,
    // apoiar muda o número em várias telas (feed, detalhe, semelhantes): atualiza tudo
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.show(error.message, { tone: 'danger' }),
  })

  return {
    pendingId: mutation.isPending ? mutation.variables.postId : null,
    toggle(post) {
      const account = gate('support', {
        guest: 'Entre para apoiar relatos.',
        denied: 'Só contas de morador apoiam relatos.',
      })
      if (account) mutation.mutate({ postId: post.id, accountId: account.id })
    },
  }
}
