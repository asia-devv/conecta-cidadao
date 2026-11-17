import { cityIdOf, getNeighborhood } from '../domain/places.js'
import { createRng } from '../domain/random.js'
import { NEIGHBORHOOD_CENTERS } from './seedMobility.js'

/**
 * Pontos de apoio FICTÍCIOS: lugares para onde ir durante um alerta (tempestade,
 * alagamento, falta de energia). Cada bairro com mapa ganha três, perto do
 * centro dele. Os nomes trazem "Fictício(a)" para ninguém procurar o lugar de
 * verdade; a posição é sorteada (com semente) a algumas quadras do centro.
 */

export const SAFE_PLACE_KINDS = {
  school: { label: 'Escola (abrigo temporário)' },
  health: { label: 'Unidade de saúde' },
  sports: { label: 'Centro esportivo coberto' },
}

const NAMES = {
  school: (bairro) => `Escola Municipal Fictícia ${bairro}`,
  health: (bairro) => `UBS Fictícia ${bairro}`,
  sports: (bairro) => `Centro Esportivo Fictício ${bairro}`,
}

// Em Santos o mar fica ao sul: os pontos vão só para o norte (terra firme).
const NORTH_ONLY = new Set(['santos'])

function placesFor(neighborhoodId, [lat, lng]) {
  const rng = createRng(`safe:${neighborhoodId}`)
  const name = getNeighborhood(neighborhoodId)?.name ?? neighborhoodId
  const northOnly = NORTH_ONLY.has(cityIdOf(neighborhoodId))
  // Três direções bem separadas (120° entre si), a 450–800 m do centro, para os
  // marcadores não se sobreporem no mapa.
  const start = northOnly ? Math.PI * 0.2 : rng() * Math.PI * 2
  const step = northOnly ? Math.PI * 0.3 : (Math.PI * 2) / 3
  return Object.keys(NAMES).map((kind, index) => {
    const angle = start + index * step
    const radius = 0.004 + rng() * 0.003
    const dLat = Math.sin(angle) * radius
    const dLng = Math.cos(angle) * radius
    return {
      id: `safe-${neighborhoodId.replace('/', '-')}-${kind}`,
      kind,
      name: NAMES[kind](name),
      neighborhoodId,
      position: [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
      services:
        kind === 'health'
          ? ['Primeiros socorros', 'Água']
          : ['Abrigo', 'Água', 'Energia'],
    }
  })
}

export const SAFE_PLACES = Object.entries(NEIGHBORHOOD_CENTERS).flatMap(([id, center]) =>
  placesFor(id, center),
)
