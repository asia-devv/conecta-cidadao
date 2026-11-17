import { RAIL_LINES, RAIL_STATIONS } from '../../data/railNetwork.js'

export const railLine = (id) => RAIL_LINES.find((l) => l.id === id) ?? null
export const station = (id) => RAIL_STATIONS[id] ?? null
export const stationPosition = (id) => {
  const s = RAIL_STATIONS[id]
  return s ? [s.lat, s.lng] : null
}
