import { getAuthorLabel } from '../domain/account.js'
import { cityIdOf } from '../domain/places.js'
import { reportSchema } from '../domain/postSchemas.js'
import { responsibleFor } from '../domain/responsibility.js'
import { getCategory } from '../domain/reportCategories.js'
import { findSimilarReports } from '../domain/similarity.js'
import { buildTimeline } from '../domain/reportTimeline.js'
import { generateSeedPosts } from '../data/seedPosts.js'
import { createId } from '../utils/id.js'
import { toggleItem } from '../utils/list.js'
import { clock } from './clock.js'
import { deleteImages, saveImage } from './imageStore.js'
import { wait } from './latency.js'
import { cachedBySeedEpoch } from './seedEpoch.js'
import { ServiceError, parseOrThrow } from './ServiceError.js'
import { storage, writeOrThrow } from './storage.js'

/**
 * Publicações (relatos e avisos) e apoios.
 *
 * Por enquanto todas vêm do seed. As telas só conhecem as funções exportadas;
 * a Etapa 3B acrescenta as publicações criadas pela pessoa no mesmo lugar.
 */

const SUPPORTS_KEY = 'supports' // { [postId]: [accountId, ...] }
const POSTS_KEY = 'posts' // publicações criadas pelas pessoas (as do seed ficam no código)
const ADMIN_EVENTS_KEY = 'admin-events' // { [postId]: [ação da administração, ...] }

const seedPosts = cachedBySeedEpoch(generateSeedPosts)

const readSupports = () => storage.read(SUPPORTS_KEY, {})
const readUserPosts = () => storage.read(POSTS_KEY, [])
const readAdminEvents = () => storage.read(ADMIN_EVENTS_KEY, {})
const allPosts = () => [...seedPosts(), ...readUserPosts()]

const saveUserPosts = (posts) => writeOrThrow(POSTS_KEY, posts)

/** Lê de uma vez o que `present` precisa de todos os relatos (apoios e ações da administração). */
function presentationContext(now) {
  return { supports: readSupports(), adminEvents: readAdminEvents(), now }
}

/** Monta o que a tela precisa: estado "de agora" do relato, apoios e quem apoiou. */
function present(post, accountId, { supports, adminEvents, now }) {
  const supporters = supports[post.id] ?? []
  const base = {
    ...post,
    // Só o conteúdo do seed é fictício; o que a pessoa publica é dela.
    simulated: !post.authorId,
  }
  if (post.type !== 'report') return base

  const events = buildTimeline(post, adminEvents[post.id] ?? [], now)
  return {
    ...base,
    categoryLabel: getCategory(post.category).label,
    responsible: responsibleFor(post),
    authorLabel:
      post.authorLabel ??
      getAuthorLabel({ type: 'resident', neighborhoodId: post.neighborhoodId }),
    events,
    status: events.at(-1).status,
    supports: (post.baseSupports ?? 0) + supporters.length,
    supported: Boolean(accountId) && supporters.includes(accountId),
  }
}

/** Relatos criados pela própria conta, as mais novas primeiro. */
export async function listPostsByAuthor(accountId) {
  await wait()
  const ctx = presentationContext(clock.now())
  return readUserPosts()
    .filter((p) => p.authorId === accountId)
    .map((p) => present(p, accountId, ctx))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/** Publicações dos bairros pedidos (sem ordenar: a ordem é regra do domínio/tela). */
export async function listPosts({ neighborhoodIds, accountId = null }) {
  await wait()
  const wanted = new Set(neighborhoodIds)
  // Aviso do município inteiro (sem bairro) vale para quem acompanha qualquer bairro dele.
  const wantedCities = new Set(neighborhoodIds.map(cityIdOf))
  const ctx = presentationContext(clock.now())
  return allPosts()
    .filter((p) =>
      p.neighborhoodId ? wanted.has(p.neighborhoodId) : wantedCities.has(p.cityId),
    )
    .filter((p) => new Date(p.createdAt) <= ctx.now) // relógio voltou: o futuro não aparece
    .map((p) => present(p, accountId, ctx))
}

export async function getPost(id, accountId = null) {
  await wait()
  const post = allPosts().find((p) => p.id === id)
  if (!post) throw new ServiceError('not_found', 'Não encontramos essa publicação.')
  return present(post, accountId, presentationContext(clock.now()))
}

/** Apoia ou retira o apoio. Devolve o novo estado do relato. */
export async function toggleSupport({ postId, accountId }) {
  await wait()
  const post = allPosts().find((p) => p.id === postId)
  if (!post || post.type !== 'report') {
    throw new ServiceError('not_found', 'Só relatos podem receber apoio.')
  }
  if (post.authorId === accountId) {
    throw new ServiceError('own_post', 'Você não pode apoiar o seu próprio relato.')
  }
  const map = readSupports()
  const current = map[postId] ?? []
  const next = toggleItem(current, accountId)
  writeOrThrow(
    SUPPORTS_KEY,
    { ...map, [postId]: next },
    'Não foi possível salvar o apoio neste aparelho.',
  )
  return present(post, accountId, {
    ...presentationContext(clock.now()),
    supports: { ...map, [postId]: next },
  })
}

/**
 * Publica um relato. `photo` é o Blob já tratado (ver utils/image.js) ou null.
 * Valida de novo aqui: o serviço não confia na tela, como faria um backend.
 */
export async function createReport({
  account,
  category,
  neighborhoodId,
  title,
  description,
  photo,
}) {
  await wait()
  parseOrThrow(reportSchema, { category, neighborhoodId, title, description, photo })
  const imageId = photo ? await saveImage(photo) : null
  const post = {
    id: createId('post'),
    type: 'report',
    authorId: account.id,
    authorLabel: getAuthorLabel(account), // "foto" do rótulo no momento da publicação
    neighborhoodId,
    createdAt: clock.now().toISOString(),
    title: title.trim(),
    description: description.trim(),
    category,
    imageId,
    baseSupports: 0,
  }
  saveUserPosts([...readUserPosts(), post])
  return present(post, account.id, presentationContext(clock.now()))
}

/** Relatos parecidos com o rascunho, para evitar duplicatas. */
export async function findSimilar({
  neighborhoodId,
  category,
  title,
  description,
  accountId = null,
}) {
  await wait(100)
  const ctx = presentationContext(clock.now())
  const now = ctx.now
  const candidates = allPosts()
    .filter((p) => p.type === 'report' && p.neighborhoodId === neighborhoodId)
    .filter((p) => new Date(p.createdAt) <= now)
    .map((p) => present(p, accountId, ctx))
  return findSimilarReports(
    { neighborhoodId, category, title, description },
    candidates,
    now,
  )
}

/** Apaga o que a conta publicou (relatos e fotos) e os apoios dela. */
export async function deleteAccountContent(accountId) {
  const mine = readUserPosts().filter((p) => p.authorId === accountId)
  await deleteImages(mine.map((p) => p.imageId).filter(Boolean)).catch(() => {})
  saveUserPosts(readUserPosts().filter((p) => p.authorId !== accountId))
  const supports = readSupports()
  const cleaned = Object.fromEntries(
    Object.entries(supports).map(([postId, ids]) => [
      postId,
      ids.filter((id) => id !== accountId),
    ]),
  )
  storage.write(SUPPORTS_KEY, cleaned)
  // Ações da administração sobre os relatos apagados não têm mais a quem se referir.
  const events = readAdminEvents()
  const mineIds = new Set(mine.map((p) => p.id))
  storage.write(
    ADMIN_EVENTS_KEY,
    Object.fromEntries(Object.entries(events).filter(([postId]) => !mineIds.has(postId))),
  )
}

/**
 * O que a conta publicou e a que deu apoio, para o download dos dados.
 * Fotos não entram no arquivo (ficam no aparelho); só se havia foto.
 */
export function exportAccountContent(accountId) {
  const publications = readUserPosts()
    .filter((p) => p.authorId === accountId)
    .map(({ imageId, ...post }) => ({ ...post, hasPhoto: Boolean(imageId) }))
  const supportsGiven = Object.entries(readSupports())
    .filter(([, ids]) => ids.includes(accountId))
    .map(([postId]) => postId)
  return { publications, supportsGiven }
}

// ---------------------------------------------------------------------------
// Para a administração (adminService cuida de quem pode e de validar)
// ---------------------------------------------------------------------------

/** Todos os relatos já publicados, de todos os bairros. */
export function listAllReports() {
  const ctx = presentationContext(clock.now())
  return allPosts()
    .filter((p) => p.type === 'report' && new Date(p.createdAt) <= ctx.now)
    .map((p) => present(p, null, ctx))
}

/** Grava uma ação da administração no histórico do relato. */
export function recordAdminStatus(postId, event) {
  const map = readAdminEvents()
  writeOrThrow(
    ADMIN_EVENTS_KEY,
    { ...map, [postId]: [...(map[postId] ?? []), event] },
    'Não foi possível salvar a atualização neste aparelho.',
  )
}

/** Avisos criados pela administração (os do seed não entram: são conteúdo fixo). */
export function listCreatedNotices() {
  const ctx = presentationContext(clock.now())
  return readUserPosts()
    .filter((p) => p.type === 'notice')
    .map((p) => present(p, null, ctx))
}

export function addNotice(notice) {
  saveUserPosts([...readUserPosts(), notice])
  return present(notice, null, presentationContext(clock.now()))
}

/** Retira um aviso criado pela administração. Devolve false se não existir. */
export function removeNotice(noticeId) {
  const posts = readUserPosts()
  if (!posts.some((p) => p.id === noticeId && p.type === 'notice')) return false
  saveUserPosts(posts.filter((p) => p.id !== noticeId))
  return true
}
