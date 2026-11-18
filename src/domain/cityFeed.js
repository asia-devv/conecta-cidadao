import { getNeighborhood } from './places.js'
import { alertState } from './stateFeed.js'

/**
 * Regras do Início: só alertas e notícias dos municípios da pessoa.
 * (A aba Explorar fica com o conteúdo estadual e a agenda de eventos.)
 * Funções puras; `now` vem de fora.
 */

const LEVEL_RANK = { urgent: 0, attention: 1, info: 2 }
const time = (iso) => new Date(iso).getTime()
const newest = (a, b) => time(b.publishedAt) - time(a.publishedAt)

/** Um aviso da moderação/administração vale no Início por 7 dias. */
export const NOTICE_LIFETIME_HOURS = 7 * 24

/** Itens da aba Explorar: o que vale para o estado todo e a agenda de eventos. */
export function isStateTabItem(item) {
  return item.cityId === null || item.kind === 'event'
}

/**
 * Aviso (publicação do tipo "notice") no formato de alerta do Início.
 * Avisos de bairro levam ao mapa com pontos de apoio perto do bairro.
 */
export function noticeToAlert(post) {
  const cityId = post.cityId ?? getNeighborhood(post.neighborhoodId)?.cityId ?? null
  return {
    kind: 'alert',
    id: post.id,
    origin: 'notice',
    source: {
      id: post.simulated ? 'moderation' : 'admin',
      name: post.simulated
        ? 'Moderação da plataforma (simulado)'
        : 'Administração do app (demonstração)',
    },
    cityId,
    neighborhoodId: post.neighborhoodId ?? null,
    alertType: 'notice',
    target: post.neighborhoodId
      ? { type: 'area', neighborhoodId: post.neighborhoodId }
      : null,
    level: post.level ?? 'info',
    publishedAt: post.createdAt,
    expiresAt: new Date(
      time(post.createdAt) + NOTICE_LIFETIME_HOURS * 3_600_000,
    ).toISOString(),
    title: post.title,
    summary: post.description,
    simulated: post.simulated,
  }
}

/**
 * Monta o Início: alertas ativos (mais graves e mais novos primeiro) e notícias
 * (mais novas primeiro) dos municípios pedidos. Itens "do futuro" (o relógio de
 * demonstração voltou) não aparecem.
 *
 * @param {object[]} items   itens do seed (estaduais e municipais)
 * @param {object[]} notices avisos já convertidos com noticeToAlert
 * @param {string[]} cityIds municípios acompanhados
 */
export function buildCityFeed(items, notices, { cityIds, now }) {
  const wanted = new Set(cityIds)
  const published = (i) => time(i.publishedAt) <= now.getTime()
  const local = items.filter((i) => i.cityId && wanted.has(i.cityId) && published(i))

  const alerts = [
    ...local.filter((i) => i.kind === 'alert'),
    ...notices.filter(published),
  ]
    .filter((a) => wanted.has(a.cityId) && alertState(a, now) === 'active')
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || newest(a, b))

  const news = local.filter((i) => i.kind === 'news').sort(newest)
  return { alerts, news }
}

/** Para onde o alerta leva no mapa (parâmetros de busca da rota /mapa). */
export function mapLinkFor(alert) {
  return `/mapa?alerta=${encodeURIComponent(alert.id)}`
}
