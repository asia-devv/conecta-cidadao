/** Devolve uma nova lista sem `item`, se ele estava nela, ou com `item` no fim. */
export function toggleItem(list, item) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
