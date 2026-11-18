import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../app/queryClient.js'
import { AccessibilityProvider } from '../../context/AccessibilityContext.jsx'
import { ClockProvider } from '../../context/ClockContext.jsx'
import { SessionProvider } from '../../context/SessionContext.jsx'
import { getSession, signInDemo } from '../../services/accountService.js'
import { clock } from '../../services/clock.js'
import { goToLocalHour } from '../../test/clockHelpers.js'
import { ToastProvider } from '../../components/ui/Toast.jsx'
import { MapPage } from './MapPage.jsx'

// O desenho do mapa tem teste próprio (MapView.test.jsx). Aqui o mapa é um
// dublê, para testar o que a PÁGINA entrega a ele e como reage aos avisos dele.
const lastProps = { current: null }
vi.mock('./MapView.jsx', () => ({
  default: (props) => {
    lastProps.current = props
    return (
      <div data-testid="mapa">
        <button type="button" onClick={props.onTilesFailed}>
          simular falha dos tiles
        </button>
        <button type="button" onClick={() => props.onSelectSegment('sp-av-paulista')}>
          simular toque em trecho
        </button>
      </div>
    )
  },
}))

function renderPage(path = '/mapa') {
  return render(
    <QueryClientProvider client={createQueryClient({ retry: false, staleTime: 0 })}>
      <AccessibilityProvider>
        <ClockProvider>
          <SessionProvider>
            <MemoryRouter initialEntries={[path]}>
              <ToastProvider>
                <MapPage />
              </ToastProvider>
            </MemoryRouter>
          </SessionProvider>
        </ClockProvider>
      </AccessibilityProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  clock.reset()
  lastProps.current = null
})

describe('MapPage com o mapa', () => {
  it('entrega ao mapa o município, o modo e a legenda do traço', async () => {
    goToLocalHour(12)
    renderPage()
    expect(await screen.findByTestId('mapa')).toBeInTheDocument()
    expect(lastProps.current.snapshot.cityId).toBe('sao-paulo')
    expect(lastProps.current.mode).toBe('traffic')
    expect(screen.getByRole('list', { name: 'Legenda do mapa' })).toBeInTheDocument()
  })

  it('trocar de município e de modo chega ao mapa', async () => {
    goToLocalHour(12)
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('mapa')
    await user.click(screen.getByRole('button', { name: 'Campinas' }))
    await vi.waitFor(() => expect(lastProps.current.snapshot.cityId).toBe('campinas'))
    await user.click(screen.getByRole('button', { name: 'Ônibus' }))
    await vi.waitFor(() => expect(lastProps.current.mode).toBe('bus'))
    expect(
      screen.queryByRole('list', { name: 'Legenda do mapa' }),
    ).not.toBeInTheDocument()
  })

  it('abrir uma linha na lista a destaca no mapa', async () => {
    goToLocalHour(12)
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('mapa')
    await user.click(screen.getByRole('button', { name: 'Ônibus' }))
    await user.click(await screen.findByRole('button', { name: /Circular Zona Sul/ }))
    expect(lastProps.current.selectedLineId).toBe('sao-paulo-l300')
  })

  it('tocar em um trecho do mapa o destaca na lista', async () => {
    goToLocalHour(12)
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('mapa')
    await user.click(screen.getByRole('button', { name: 'simular toque em trecho' }))
    expect(
      await screen.findByRole('button', { name: 'Tirar destaque do mapa' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('se o mapa-base falhar, avisa e mantém as listas', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('mapa')
    expect(screen.queryByText('O mapa-base não carregou')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'simular falha dos tiles' }))
    expect(screen.getByText('O mapa-base não carregou')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Av. Paulista' })).toBeInTheDocument()
  })
})

describe('MapPage com alerta', () => {
  it('tempestade num bairro: mostra os pontos de apoio mais próximos e a área no mapa', async () => {
    renderPage('/mapa?alerta=seed-city-sp-a1')
    expect(
      await screen.findByRole('heading', {
        name: 'Tempestade com raios e ventania em Pinheiros',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Pontos de apoio mais próximos de Pinheiros' }),
    ).toBeInTheDocument()
    const places = screen.getAllByRole('button', { name: /Fictíci/ })
    expect(places).toHaveLength(4)
    expect(places[0]).toHaveTextContent(/Pinheiros/)
    expect(places[0]).toHaveTextContent(/min a pé/)

    await waitFor(() => expect(lastProps.current.overlay?.places).toHaveLength(4))
    expect(lastProps.current.overlay.radius).toBeGreaterThan(0)
    expect(lastProps.current.mode).toBe('traffic')

    const user = userEvent.setup()
    await user.click(places[1])
    expect(lastProps.current.overlay.selectedPlaceId).toBe(
      lastProps.current.overlay.places[1].id,
    )
  })

  it('linha parada: abre "Metrô e trem" com o trecho e rotas alternativas', async () => {
    renderPage('/mapa?alerta=seed-city-sp-a3')
    expect(
      await screen.findByRole('heading', { name: 'Rotas alternativas' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Trecho afetado:/)).toHaveTextContent('Linha 9-Esmeralda')
    const routes = screen.getAllByRole('button', { name: /cerca de \d+ min/ })
    expect(routes.length).toBeGreaterThanOrEqual(2)
    expect(routes[0]).toHaveTextContent('Linha 8-Diamante')
    expect(routes.at(-1)).toHaveTextContent('Ônibus de apoio')

    await waitFor(() => expect(lastProps.current.mode).toBe('rail'))
    expect(lastProps.current.overlay.stretch.length).toBeGreaterThanOrEqual(2)

    const user = userEvent.setup()
    await user.click(routes.at(-1))
    expect(lastProps.current.overlay.selectedRouteIndex).toBe(routes.length - 1)
  })

  it('fechar o alerta volta ao mapa normal', async () => {
    const user = userEvent.setup()
    renderPage('/mapa?alerta=seed-city-sp-a1')
    await user.click(
      await screen.findByRole('button', { name: 'Fechar o alerta no mapa' }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Tempestade com raios/ }),
      ).not.toBeInTheDocument(),
    )
    expect(lastProps.current.overlay).toBeNull()
  })

  it('alerta que não existe avisa sem quebrar a tela', async () => {
    renderPage('/mapa?alerta=nao-existe')
    expect(await screen.findByText('Alerta não encontrado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Mapa' })).toBeInTheDocument()
  })
})

describe('MapPage: metrô e trem', () => {
  it('só aparece em São Paulo e lista linhas e estações', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Metrô e trem' }))
    expect(lastProps.current.mode).toBe('rail')
    await user.click(screen.getByRole('button', { name: /Linha 9-Esmeralda/ }))
    const list = screen.getByRole('list', { name: 'Estações da Linha 9-Esmeralda' })
    expect(within(list).getByText('Pinheiros')).toBeInTheDocument()
    expect(lastProps.current.rail.selectedLineId).toBe('trem-9')

    await user.click(screen.getByRole('button', { name: 'Campinas' }))
    expect(screen.queryByRole('button', { name: 'Metrô e trem' })).not.toBeInTheDocument()
  })

  it('morador favorita uma estação e ela aparece no topo e no mapa', async () => {
    await signInDemo('resident')
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Metrô e trem' }))
    await user.click(screen.getByRole('button', { name: /Linha 4-Amarela/ }))
    await user.click(
      screen.getByRole('button', { name: 'Favoritar a estação Pinheiros' }),
    )
    const favorites = await screen.findByRole('heading', {
      name: 'Suas estações favoritas',
    })
    expect(favorites.parentElement).toHaveTextContent('Pinheiros')
    await waitFor(() => expect(lastProps.current.rail.favorites).toEqual(['pinheiros']))
    expect((await getSession()).favoriteStations).toEqual(['pinheiros'])
  })
})
