import { createRng } from './random.js'
import { getNeighborhood } from './places.js'

/**
 * Quem responde por cada relato: o órgão da prefeitura que cuida do problema e
 * um(a) vereador(a) de referência para o bairro.
 *
 * TUDO FICTÍCIO. Os órgãos levam "Fictícia" no nome e os nomes de vereadores são
 * inventados; servem para mostrar como o app indicaria a quem cobrar. A divisão
 * por subprefeitura em São Paulo segue a organização real só para fazer sentido.
 */

// Bairro do catálogo → subprefeitura (São Paulo).
const SP_SUBPREFEITURAS = {
  pinheiros: 'Pinheiros',
  'vila-mariana': 'Vila Mariana',
  mooca: 'Mooca',
  tatuape: 'Mooca',
  santana: 'Santana/Tucuruvi',
  itaquera: 'Itaquera',
  butanta: 'Butantã',
  lapa: 'Lapa',
  'santo-amaro': 'Santo Amaro',
  penha: 'Penha',
  ipiranga: 'Ipiranga',
  jabaquara: 'Jabaquara',
}

// Categoria → área da prefeitura que cuida dela.
const AREA = {
  road: 'obras',
  sidewalk: 'obras',
  tree: 'zeladoria',
  cleaning: 'limpeza',
  lighting: 'iluminacao',
  flooding: 'defesa-civil',
  signal: 'transito',
}

const SECRETARIAS = {
  obras: 'Secretaria Fictícia de Obras',
  zeladoria: 'Secretaria Fictícia de Zeladoria',
  limpeza: 'Secretaria Fictícia de Limpeza Urbana',
  iluminacao: 'Departamento Fictício de Iluminação Pública',
  'defesa-civil': 'Defesa Civil Fictícia',
  transito: 'Departamento Fictício de Trânsito',
}

// Em São Paulo, buraco, calçada, poda e limpeza são da subprefeitura do bairro.
const BY_SUBPREFEITURA = new Set(['obras', 'zeladoria', 'limpeza'])

const FIRST = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fábio',
  'Gisele',
  'Hugo',
  'Íris',
  'Júlio',
]
const LAST = [
  'Prado',
  'Teles',
  'Moraes',
  'Queiroz',
  'Barbosa',
  'Nogueira',
  'Pacheco',
  'Siqueira',
]
const FEMALE = new Set(['Ana', 'Carla', 'Elisa', 'Gisele', 'Íris'])

/** Vereador(a) fictício(a) de referência para o bairro (sempre o mesmo por bairro). */
function councilorFor(neighborhoodId) {
  const rng = createRng(`vereador:${neighborhoodId}`)
  const first = FIRST[Math.floor(rng() * FIRST.length)]
  const last = LAST[Math.floor(rng() * LAST.length)]
  const title = FEMALE.has(first) ? 'Vereadora fictícia' : 'Vereador fictício'
  return { kind: 'councilor', title, name: `${first} ${last}` }
}

/**
 * Responsáveis por um relato: { cityHall, body, councilor }.
 * `body` é o órgão que deve agir; `cityHall`, a prefeitura do município.
 */
export function responsibleFor({ category, neighborhoodId }) {
  const place = getNeighborhood(neighborhoodId)
  if (!place) return null
  const area = AREA[category] ?? 'obras'
  const cityHall = { kind: 'city_hall', name: `Prefeitura Fictícia de ${place.cityName}` }
  const sub =
    place.cityId === 'sao-paulo' && SP_SUBPREFEITURAS[neighborhoodId.split('/')[1]]

  const body =
    sub && BY_SUBPREFEITURA.has(area)
      ? { kind: 'subprefeitura', name: `Subprefeitura Fictícia ${sub}` }
      : { kind: 'department', name: `${SECRETARIAS[area]} de ${place.cityName}` }

  return { cityHall, body, councilor: councilorFor(neighborhoodId) }
}
