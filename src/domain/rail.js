import { distanceMeters } from './geo.js'

/**
 * Rede de metrô e trem como grafo, para achar rotas alternativas quando um
 * trecho de linha para. Funções puras: recebem a rede (linhas, estações e
 * baldeações a pé) e não sabem de onde ela veio.
 *
 * Tempos são estimativas simples (distância ÷ velocidade média + parada), não
 * horários reais.
 */

const SPEED_KMH = { Metrô: 33, Trem: 40 }
const DWELL_MIN = 0.6 // tempo parado em cada estação
export const TRANSFER_MIN = 5 // trocar de linha na mesma estação
const WALK_TRANSFER_MIN = 6 // passagem a pé entre estações vizinhas
const BUS_KMH = 18 // ônibus de apoio, no trânsito
const BUS_WAIT_MIN = 10

const edgeKey = (lineId, a, b) => `${lineId}:${a}>${b}`

/** Arestas bloqueadas (nos dois sentidos) entre `from` e `to` na linha. */
export function blockedStretch(network, { lineId, from, to }) {
  const line = network.lines.find((l) => l.id === lineId)
  if (!line) return { stations: [], keys: new Set() }
  const i = line.stations.indexOf(from)
  const j = line.stations.indexOf(to)
  if (i === -1 || j === -1 || i === j) return { stations: [], keys: new Set() }
  const stations = line.stations.slice(Math.min(i, j), Math.max(i, j) + 1)
  const keys = new Set()
  for (let k = 0; k < stations.length - 1; k += 1) {
    keys.add(edgeKey(lineId, stations[k], stations[k + 1]))
    keys.add(edgeKey(lineId, stations[k + 1], stations[k]))
  }
  return { stations: i < j ? stations : [...stations].reverse(), keys }
}

/** Lista de adjacência: estação → [{ to, lineId | null (a pé), minutes }]. */
export function buildGraph(network) {
  const position = (id) => {
    const s = network.stations[id]
    return [s.lat, s.lng]
  }
  const graph = new Map()
  const add = (from, edge) => {
    if (!graph.has(from)) graph.set(from, [])
    graph.get(from).push(edge)
  }
  for (const line of network.lines) {
    const speed = SPEED_KMH[line.kind] ?? 33
    for (let k = 0; k < line.stations.length - 1; k += 1) {
      const a = line.stations[k]
      const b = line.stations[k + 1]
      const km = distanceMeters(position(a), position(b)) / 1000
      const minutes = (km / speed) * 60 + DWELL_MIN
      add(a, { to: b, lineId: line.id, minutes })
      add(b, { to: a, lineId: line.id, minutes })
    }
  }
  for (const [a, b] of network.transfers ?? []) {
    add(a, { to: b, lineId: null, minutes: WALK_TRANSFER_MIN })
    add(b, { to: a, lineId: null, minutes: WALK_TRANSFER_MIN })
  }
  return graph
}

/**
 * Menor caminho de `from` a `to` (Dijkstra sobre estação + linha atual, para
 * cobrar a baldeação). `blocked`: arestas proibidas; `bannedLines`: linhas que
 * não podem ser usadas. Devolve `null` se não houver caminho.
 */
export function shortestRoute(
  graph,
  from,
  to,
  { blocked = new Set(), bannedLines = new Set() } = {},
) {
  const key = (station, line) => `${station}|${line ?? ''}`
  const dist = new Map([[key(from, null), 0]])
  const prev = new Map()
  const queue = [{ station: from, line: null, cost: 0 }]

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()
    const currentKey = key(current.station, current.line)
    if (current.cost > (dist.get(currentKey) ?? Infinity)) continue
    if (current.station === to) {
      return unwind(prev, currentKey, current.cost)
    }
    for (const edge of graph.get(current.station) ?? []) {
      if (edge.lineId && bannedLines.has(edge.lineId)) continue
      if (edge.lineId && blocked.has(edgeKey(edge.lineId, current.station, edge.to)))
        continue
      const changing =
        current.line !== null && edge.lineId !== null && edge.lineId !== current.line
      const cost = current.cost + edge.minutes + (changing ? TRANSFER_MIN : 0)
      const nextKey = key(edge.to, edge.lineId)
      if (cost < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, cost)
        prev.set(nextKey, {
          from: currentKey,
          station: current.station,
          lineId: edge.lineId,
        })
        queue.push({ station: edge.to, line: edge.lineId, cost })
      }
    }
  }
  return null
}

/** Reconstrói a rota como trechos ("legs") por linha. */
function unwind(prev, endKey, cost) {
  const hops = []
  let k = endKey
  while (prev.has(k)) {
    const step = prev.get(k)
    hops.unshift({ from: step.station, to: k.split('|')[0], lineId: step.lineId })
    k = step.from
  }
  const legs = []
  for (const hop of hops) {
    const last = legs.at(-1)
    if (last && last.lineId === hop.lineId) {
      last.stations.push(hop.to)
    } else {
      legs.push({
        type: hop.lineId ? 'rail' : 'walk',
        lineId: hop.lineId,
        stations: [hop.from, hop.to],
      })
    }
  }
  return { legs, minutes: Math.round(cost) }
}

const signature = (route) =>
  route.legs.map((l) => `${l.lineId}:${l.stations.join(',')}`).join('|')

/**
 * Rotas alternativas para um trecho parado: até `max` caminhos por outras linhas
 * (o segundo evita uma linha usada pelo primeiro, para ser de fato diferente) e,
 * sempre, o ônibus de apoio ligando as pontas do trecho.
 */
export function alternativeRoutes(network, target, { max = 2 } = {}) {
  const graph = buildGraph(network)
  const { stations, keys } = blockedStretch(network, target)
  if (stations.length < 2) return { stretch: [], usualMinutes: 0, routes: [] }
  const [from, to] = [stations[0], stations.at(-1)]

  const usual = shortestRoute(graph, from, to, { bannedLines: new Set() })
  const routes = []
  const best = shortestRoute(graph, from, to, { blocked: keys })
  if (best) routes.push({ ...best, type: 'rail' })

  if (best && routes.length < max) {
    const candidates = best.legs
      .filter((l) => l.type === 'rail' && l.lineId !== target.lineId)
      .map((l) =>
        shortestRoute(graph, from, to, {
          blocked: keys,
          bannedLines: new Set([l.lineId]),
        }),
      )
      .filter(Boolean)
      .filter((r) => signature(r) !== signature(best))
      .sort((a, b) => a.minutes - b.minutes)
    if (candidates[0]) routes.push({ ...candidates[0], type: 'rail' })
  }

  const km = stations.slice(1).reduce((sum, id, i) => {
    const a = network.stations[stations[i]]
    const b = network.stations[id]
    return sum + distanceMeters([a.lat, a.lng], [b.lat, b.lng]) / 1000
  }, 0)
  routes.push({
    type: 'bus',
    legs: [{ type: 'bus', lineId: null, stations: [from, to] }],
    minutes: Math.round(BUS_WAIT_MIN + (km / BUS_KMH) * 60),
  })

  return { stretch: stations, usualMinutes: usual?.minutes ?? 0, routes }
}
