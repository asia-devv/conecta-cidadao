import { railLine } from './railHelpers.js'

/** Texto preto ou branco, o que tiver mais contraste com a cor da linha (WCAG). */
function textOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // contraste com branco: 1.05/(L+0.05); com preto: (L+0.05)/0.05
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#fff' : '#111'
}

/** "Linha 9-Esmeralda" → número em destaque com a cor da linha (o nome também vai escrito). */
export function LineBadge({ lineId }) {
  const line = railLine(lineId)
  if (!line) return null
  return (
    <span
      className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white ring-2 ring-surface"
      style={{
        backgroundColor: line.color,
        color: textOn(line.color),
      }}
      aria-hidden="true"
    >
      {line.number}
    </span>
  )
}
