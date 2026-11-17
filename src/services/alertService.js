import { noticeToAlert } from '../domain/cityFeed.js'
import { getPost } from './postService.js'
import { ServiceError } from './ServiceError.js'
import { listStateItems } from './stateService.js'

/**
 * Busca um alerta pelo id, para o mapa: pode ser do seed (estadual ou municipal)
 * ou um aviso da moderação/administração.
 */
export async function getAlert(id) {
  const items = await listStateItems()
  const found = items.find((item) => item.id === id && item.kind === 'alert')
  if (found) return found
  try {
    const post = await getPost(id)
    if (post.type === 'notice') return noticeToAlert(post)
  } catch {
    // cai no erro abaixo
  }
  throw new ServiceError(
    'not_found',
    'Não encontramos esse alerta. Ele pode ter sido retirado.',
  )
}
