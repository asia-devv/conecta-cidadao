import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Page } from '../../components/layout/Page.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { EmptyState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { RAIL_LINES, RAIL_STATIONS } from '../../data/railNetwork.js'

const lineName = (id) => RAIL_LINES.find((l) => l.id === id)?.name ?? id

/** Estações de metrô e trem favoritas (são marcadas no Mapa, na camada "Metrô e trem"). */
export function FavoriteStationsPage() {
  const { account, updateAccount } = useSession()
  const toast = useToast()
  const [error, setError] = useState(null)
  const favorites = (account.favoriteStations ?? []).filter((id) => RAIL_STATIONS[id])

  async function remove(id) {
    setError(null)
    try {
      await updateAccount({ favoriteStations: favorites.filter((s) => s !== id) })
      toast.show('Estação removida das favoritas', { tone: 'success' })
    } catch (e) {
      setError(e.message)
    }
  }

  const mapLink = (
    <Link
      to="/mapa?camada=metro"
      className="inline-flex min-h-(--tap-min) items-center font-bold text-primary underline"
    >
      Escolher estações no mapa
    </Link>
  )

  return (
    <Page
      title="Estações favoritas"
      description="Linhas de metrô e trem que você usa: os alertas delas ganham destaque."
      backTo="/perfil"
      backLabel="Voltar ao perfil"
    >
      {favorites.length === 0 ? (
        <EmptyState
          title="Nenhuma estação favorita"
          description="No Mapa, abra “Metrô e trem”, escolha uma linha e toque em “Favoritar”."
          action={mapLink}
        />
      ) : (
        <>
          <ul aria-label="Suas estações favoritas" className="flex flex-col gap-3">
            {favorites.map((id) => {
              const station = RAIL_STATIONS[id]
              return (
                <li
                  key={id}
                  className="hairline flex items-center justify-between gap-3 rounded-card border-line bg-surface p-3"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold break-words text-ink">{station.name}</span>
                    <span className="text-sm text-ink-muted">
                      {station.lines.map(lineName).join(' · ')}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    icon={Trash2}
                    aria-label={`Remover ${station.name} das favoritas`}
                    onClick={() => remove(id)}
                  >
                    Remover
                  </Button>
                </li>
              )
            })}
          </ul>
          {mapLink}
        </>
      )}
      {error && (
        <Notice tone="danger" title="Não foi possível salvar">
          <p>{error}</p>
        </Notice>
      )}
    </Page>
  )
}
