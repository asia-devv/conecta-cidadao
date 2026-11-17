import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { ErrorState, Skeleton } from '../../components/ui/States.jsx'
import { StatusTimeline } from '../../components/ui/StatusTimeline.jsx'
import { APP_NAME } from '../../config/appConfig.js'
import { useClock } from '../../context/ClockContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { getPost } from '../../services/postService.js'
import { PostListItem } from '../../components/post/PostListItem.jsx'
import { useSupport } from './useSupport.js'

/** Quem responde pelo relato: órgão, prefeitura e vereador(a) de referência (fictícios). */
function Responsible({ responsible }) {
  const rows = [
    ['Órgão responsável', responsible.body.name],
    ['Prefeitura', responsible.cityHall.name],
    [responsible.councilor.title, responsible.councilor.name],
  ]
  return (
    <section
      aria-labelledby="responsible-title"
      className="hairline flex flex-col gap-2 rounded-card border-line bg-surface p-4"
    >
      <h2 id="responsible-title" className="font-display text-lg font-bold">
        Quem é responsável
      </h2>
      <dl className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-sm font-bold text-ink-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-muted">
        Órgãos e nomes fictícios, só para mostrar a quem o app encaminharia o relato.
      </p>
    </section>
  )
}

/** Detalhe de uma publicação. Para relatos, mostra o acompanhamento completo. */
export function PostDetailPage() {
  const { id } = useParams()
  const { account } = useSession()
  const { now, offsetMs } = useClock()
  const support = useSupport()
  const accountId = account?.id ?? null

  const query = useQuery({
    queryKey: ['post', id, { accountId, offsetMs }],
    queryFn: () => getPost(id, accountId),
    retry: false,
  })
  const post = query.data
  // Relatos não aparecem mais no Início: quem é dono volta para "Meus relatos".
  const back = account
    ? { to: '/perfil/publicacoes', label: 'Voltar aos meus relatos' }
    : { to: '/inicio', label: 'Voltar ao início' }

  useEffect(() => {
    document.title = `${post?.title ?? 'Publicação'} · ${APP_NAME}`
  }, [post?.title])

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-8">
      <Link
        to={back.to}
        className="inline-flex min-h-(--tap-min) w-fit items-center gap-1.5 rounded-control pr-2 font-bold text-primary"
      >
        <Icon icon={ArrowLeft} />
        {back.label}
      </Link>

      {query.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando publicação…</span>
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {query.isError && (
        <ErrorState title="Publicação não encontrada" message={query.error.message} />
      )}

      {post && (
        <>
          <PostListItem
            post={post}
            now={now}
            detail
            accountId={accountId}
            supportPending={support.pendingId === post.id}
            onToggleSupport={() => support.toggle(post)}
          />

          {post.type === 'report' && (
            <>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-2">
                  <dt className="font-bold text-ink">Categoria:</dt>
                  <dd className="text-ink-muted">{post.categoryLabel}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold text-ink">Publicado por:</dt>
                  <dd className="text-ink-muted">{post.authorLabel}</dd>
                </div>
              </dl>
              {post.responsible && <Responsible responsible={post.responsible} />}
              <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
                <h2 id="timeline-title" className="font-display text-lg font-bold">
                  Acompanhamento do relato
                </h2>
                <StatusTimeline events={post.events} />
              </section>
            </>
          )}
          {post.type === 'notice' && (
            <Notice tone="info">
              <p>
                {post.simulated
                  ? 'Aviso da moderação da plataforma (simulado). Só administradores publicam avisos.'
                  : 'Aviso publicado pela administração de demonstração deste app. Não é um comunicado de órgão público.'}
              </p>
            </Notice>
          )}
        </>
      )}
    </div>
  )
}
