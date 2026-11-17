import { Lightbulb } from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { SupportButton } from '../../components/ui/SupportButton.jsx'
import { formatRelative } from '../../domain/relativeTime.js'

/**
 * "Já existem relatos parecidos": aparece enquanto a pessoa escreve. A ideia é
 * evitar duplicatas: se for o mesmo problema, apoiar o relato existente soma
 * força a ele em vez de abrir outro.
 */
export function SimilarReports({ reports, now, accountId, pendingId, onSupport }) {
  if (reports.length === 0) return null
  return (
    <section
      aria-labelledby="similar-title"
      className="hairline flex flex-col gap-3 rounded-card border-(--badge-border) bg-warn-soft p-4 text-warn-ink"
    >
      <h2
        id="similar-title"
        className="flex items-center gap-2 font-display text-lg font-bold"
      >
        <Lightbulb aria-hidden="true" className="size-(--icon-md) shrink-0" />
        Já existem relatos parecidos
      </h2>
      <p className="text-sm">
        Se for o mesmo problema, apoie um relato existente em vez de publicar outro. Se
        for diferente, continue e publique normalmente.
      </p>
      <ul className="flex flex-col gap-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-control bg-surface p-3 text-ink">
            <p className="font-bold">{report.title}</p>
            <p className="line-clamp-2 text-sm text-ink-muted">{report.description}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <StatusBadge status={report.status} />
                {formatRelative(report.createdAt, now)}
              </span>
              {report.authorId === accountId ? (
                <span className="text-sm font-bold text-ink">Seu relato</span>
              ) : (
                <SupportButton
                  supported={report.supported}
                  supports={report.supports}
                  pending={pendingId === report.id}
                  onClick={() => onSupport(report)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
