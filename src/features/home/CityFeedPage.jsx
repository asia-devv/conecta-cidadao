import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Map as MapIcon } from 'lucide-react'
import { EmptyIllustration } from '../../components/illustrations/Illustrations.jsx'
import { Page } from '../../components/layout/Page.jsx'
import { StateItem } from '../../components/state/StateItem.jsx'
import { Chip } from '../../components/ui/Chip.jsx'
import { SelectField } from '../../components/ui/FormFields.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx'
import { useClock } from '../../context/ClockContext.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { buildCityFeed, mapLinkFor, noticeToAlert } from '../../domain/cityFeed.js'
import { CITIES, cityIdOf, getCity } from '../../domain/places.js'
import { cityIdsOf } from '../../domain/stateFeed.js'
import { listPosts } from '../../services/postService.js'
import { listStateItems } from '../../services/stateService.js'

function FeedSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Carregando alertas e notícias…</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  )
}

/**
 * Busca o seed (alertas e notícias) e os avisos: dos bairros acompanhados, para
 * quem entrou; de todos os bairros do município escolhido, para visitantes.
 */
async function loadCityFeed(cityIds, neighborhoodIds, now) {
  const [items, posts] = await Promise.all([
    listStateItems(),
    listPosts({ neighborhoodIds }),
  ])
  const notices = posts.filter((p) => p.type === 'notice').map(noticeToAlert)
  return buildCityFeed(items, notices, { cityIds, now })
}

/**
 * Início: alertas e notícias da cidade. Tocar num alerta abre o mapa no lugar
 * dele (pontos de apoio perto do bairro ou rotas alternativas, no caso de
 * metrô/trem parado). Notícias abrem o texto completo.
 */
export function CityFeedPage() {
  const { account } = useSession()
  const { now, offsetMs } = useClock()
  const navigate = useNavigate()
  const [visitorCity, setVisitorCity] = useState('')
  const [only, setOnly] = useState('all')

  const followedCities = account ? cityIdsOf(account.followedPlaces ?? []) : []
  const baseCities = account ? followedCities : visitorCity ? [visitorCity] : []
  const cityIds = only !== 'all' && baseCities.includes(only) ? [only] : baseCities

  const neighborhoodIds = account
    ? (account.followedPlaces ?? [])
        .map((f) => f.neighborhoodId)
        .filter((id) => cityIds.includes(cityIdOf(id)))
    : cityIds.flatMap((id) => getCity(id)?.neighborhoods.map((n) => n.id) ?? [])

  const query = useQuery({
    queryKey: ['city-feed', { cityIds, neighborhoodIds, offsetMs }],
    queryFn: () => loadCityFeed(cityIds, neighborhoodIds, now),
    enabled: cityIds.length > 0,
  })

  const names = baseCities.map((id) => getCity(id)?.name).filter(Boolean)
  const description = names.length
    ? `Alertas e notícias de ${names.join(', ')}.`
    : 'Alertas e notícias da sua cidade.'

  return (
    <Page title="Início" description={description}>
      <Notice tone="info" title="Conteúdo de demonstração">
        <p>
          Alertas e notícias são fictícios e não vêm de órgãos reais. Não use para decidir
          o que fazer numa emergência.
        </p>
      </Notice>

      {!account && (
        <SelectField
          label="Município"
          value={visitorCity}
          onChange={(e) => setVisitorCity(e.target.value)}
        >
          <option value="">Escolha o município</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      )}

      {account && followedCities.length > 1 && (
        <div role="group" aria-label="Município" className="flex flex-wrap gap-2">
          <Chip selected={only === 'all'} onClick={() => setOnly('all')}>
            Todos
          </Chip>
          {followedCities.map((id) => (
            <Chip key={id} selected={only === id} onClick={() => setOnly(id)}>
              {getCity(id)?.name}
            </Chip>
          ))}
        </div>
      )}

      {cityIds.length === 0 && (
        <EmptyState
          illustration={<EmptyIllustration />}
          title={account ? 'Você ainda não acompanha bairros' : 'Escolha um município'}
          description={
            account
              ? 'Acompanhe um bairro no seu perfil para receber os alertas e as notícias da cidade.'
              : 'Escolha acima para ver os alertas e as notícias da cidade.'
          }
        />
      )}

      {cityIds.length > 0 && query.isPending && <FeedSkeleton />}
      {query.isError && (
        <ErrorState
          title="Não foi possível carregar"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && (
        <>
          <section aria-labelledby="alerts-title" className="flex flex-col gap-3">
            <h2 id="alerts-title" className="font-display text-lg font-bold">
              Alertas
            </h2>
            {query.data.alerts.length === 0 ? (
              <p className="text-ink-muted">Nenhum alerta ativo agora.</p>
            ) : (
              <ul aria-label="Alertas" className="flex flex-col gap-4">
                {query.data.alerts.map((item) => (
                  <li key={item.id}>
                    <StateItem
                      item={item}
                      now={now}
                      openLabel="Ver no mapa"
                      openIcon={MapIcon}
                      onOpen={() => navigate(mapLinkFor(item))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="news-title" className="flex flex-col gap-3">
            <h2 id="news-title" className="font-display text-lg font-bold">
              Notícias
            </h2>
            {query.data.news.length === 0 ? (
              <p className="text-ink-muted">Sem notícias recentes da cidade.</p>
            ) : (
              <ul aria-label="Notícias" className="flex flex-col gap-4">
                {query.data.news.map((item) => (
                  <li key={item.id}>
                    <StateItem
                      item={item}
                      now={now}
                      openLabel="Ler notícia"
                      onOpen={() => navigate(`/inicio/${item.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Page>
  )
}
