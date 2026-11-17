import { useDocumentTitle } from '../../utils/useDocumentTitle.js'
import { BackLink } from './BackLink.jsx'

/**
 * Esqueleto de uma tela: título (h1), descrição e, se houver, link "Voltar".
 * Também atualiza o título da aba/janela, que leitores de tela anunciam ao
 * navegar entre telas.
 */
export function Page({ title, description, backTo, backLabel = 'Voltar', children }) {
  useDocumentTitle(title)

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-8">
      {backTo && <BackLink to={backTo}>{backLabel}</BackLink>}
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="text-ink-muted">{description}</p>}
      </header>
      {children}
    </div>
  )
}
