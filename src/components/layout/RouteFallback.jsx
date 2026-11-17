import { Skeleton } from '../ui/States.jsx'

/**
 * Mostrado enquanto o código de uma tela é baixado (divisão por rota) ou enquanto
 * os guardas de rota leem a sessão salva.
 */
export function RouteFallback({ label = 'Carregando a tela…' }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3 p-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
