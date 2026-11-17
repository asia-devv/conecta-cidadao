import { useQuery } from '@tanstack/react-query'
import { getImage } from '../../services/imageStore.js'
import { useObjectUrl } from '../../utils/useObjectUrl.js'

/** Carrega a foto do IndexedDB e a expõe como URL temporária (liberada ao sair da tela). */
export function useImageUrl(imageId) {
  const query = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => getImage(imageId),
    enabled: Boolean(imageId),
    staleTime: Infinity,
    retry: false,
  })
  const url = useObjectUrl(query.data)

  return {
    url,
    loading: Boolean(imageId) && query.isPending,
    missing: Boolean(imageId) && (query.isError || (query.isSuccess && !query.data)),
  }
}
