import { distanceMeters } from './geo.js'

/** Caminhada a 4,5 km/h, com 30% a mais porque as ruas não são linha reta. */
const WALK_METERS_PER_MIN = 4500 / 60
const DETOUR = 1.3

export function walkingMinutes(meters) {
  return Math.max(1, Math.round((meters * DETOUR) / WALK_METERS_PER_MIN))
}

/** Os pontos de apoio mais perto de `center`, com distância e tempo a pé. */
export function nearestSafePlaces(places, center, { limit = 4 } = {}) {
  return places
    .map((place) => {
      const meters = distanceMeters(center, place.position)
      return { ...place, meters: Math.round(meters), walkMinutes: walkingMinutes(meters) }
    })
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
}

/** "350 m" ou "1,2 km". */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}
