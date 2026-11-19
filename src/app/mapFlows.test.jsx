import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessibilityProvider } from '../context/AccessibilityContext.jsx'
import { ClockProvider } from '../context/ClockContext.jsx'
import { SessionProvider } from '../context/SessionContext.jsx'
import { clock } from '../services/clock.js'
import { saveFiwareServer } from '../services/fiwareService.js'
import { goToLocalHour } from '../test/clockHelpers.js'
import { installFakeFiware } from '../test/fakeFiware.js'
import { AppRoutes } from './App.jsx'
import { createQueryClient } from './queryClient.js'

function renderAt(path) {
  return render(
    <QueryClientProvider client={createQueryClient({ retry: false, staleTime: 0 })}>
      <AccessibilityProvider>
        <ClockProvider>
          <SessionProvider>
            <MemoryRouter initialEntries={[path]}>
              <AppRoutes />
            </MemoryRouter>
          </SessionProvider>
        </ClockProvider>
      </AccessibilityProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => clock.reset())

const segmentCards = () => screen.findAllByRole('article')

describe('Mapa: trânsito', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('explica de onde vêm os dados de cada camada', async () => {
    renderAt('/mapa')
    expect(
      await screen.findByText(/vias reais, coloridas pelos sensores IoT/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Estações de metrô e trem são reais/)).toBeInTheDocument()
  })

  it('abre em São Paulo com as vias monitoradas; sem FIWARE, todas sem dados', async () => {
    renderAt('/mapa')
    const cards = await segmentCards()
    expect(cards.length).toBe(14)
    expect(screen.getByRole('button', { name: 'São Paulo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Trânsito' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(cards[0]).getByRole('heading')).toHaveTextContent('Marginal Tietê')
    for (const card of cards) {
      expect(within(card).getByText('Sem dados')).toBeInTheDocument()
    }
    expect(screen.getByText('14 vias sem dados.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum servidor FIWARE configurado')).toBeInTheDocument()
  })

  it('com o sensor do smart-traffic, a Marginal Tietê ganha cor pela média de 30 s', async () => {
    const fake = installFakeFiware()
    saveFiwareServer('10.0.0.5')
    fake.entities.set('urn:ngsi-ld:Traffic:003', {
      id: 'urn:ngsi-ld:Traffic:003',
      type: 'Traffic',
      speed_kmh: 18,
      vehicle_count: 4,
      TimeInstant: new Date().toISOString(),
    })
    renderAt('/mapa')
    const marginal = await screen.findByRole('article', { name: 'Marginal Tietê' })
    expect(
      await within(marginal).findByText('Congestionamento intenso'),
    ).toBeInTheDocument()
    expect(
      within(marginal).getByText(/Média de 18,0 km\/h numa via de 60 km\/h/),
    ).toBeInTheDocument()
    expect(within(marginal).getByText('Sensor IoT 003')).toBeInTheDocument()
    expect(await screen.findByText(/1 via com sensor IoT \(FIWARE\)/)).toBeInTheDocument()
    // as outras vias continuam cinza: nada é inventado
    expect(
      within(screen.getByRole('article', { name: 'Av. Paulista' })).getByText(
        'Sem dados',
      ),
    ).toBeInTheDocument()
  })

  it('explica a classificação com os limites de 75% e 40% da velocidade máxima', async () => {
    renderAt('/mapa')
    await segmentCards()
    const legend = screen.getByRole('region', { name: 'Como classificamos' })
    expect(within(legend).getByText(/velocidade máxima da via/)).toBeInTheDocument()
    expect(within(legend).getByText(/a partir de 75%/)).toBeInTheDocument()
    expect(within(legend).getByText(/abaixo de 40%/)).toBeInTheDocument()
  })

  it('município sem vias monitoradas diz isso em vez de desenhar linhas', async () => {
    const user = userEvent.setup()
    renderAt('/mapa')
    await segmentCards()
    await user.click(screen.getByRole('button', { name: 'Santos' }))
    expect(
      await screen.findByText(/Ainda não há vias monitoradas em Santos/),
    ).toBeInTheDocument()
  })
})

describe('Mapa: ônibus', () => {
  async function openBuses() {
    const user = userEvent.setup()
    renderAt('/mapa')
    await segmentCards()
    await user.click(screen.getByRole('button', { name: 'Ônibus' }))
    return user
  }

  it('lista as linhas com os ônibus em operação', async () => {
    goToLocalHour(12)
    await openBuses()
    expect(await screen.findByText('Circular Zona Leste')).toBeInTheDocument()
    expect(screen.getByText('6 ônibus em operação')).toBeInTheDocument()
  })

  it('ao abrir uma linha mostra a previsão de chegada em cada ponto', async () => {
    goToLocalHour(12)
    const user = await openBuses()
    const button = await screen.findByRole('button', {
      name: /Circular Centro e Zona Oeste/,
    })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById(button.getAttribute('aria-controls'))
    for (const stop of [
      'Terminal Central',
      'Ponto Lapa',
      'Ponto Butantã',
      'Ponto Pinheiros',
    ]) {
      expect(within(panel).getByText(stop)).toBeInTheDocument()
    }
    expect(within(panel).getAllByText(/chegando|em \d+ (min|h)/).length).toBeGreaterThan(
      3,
    )
    expect(within(panel).getByText(/Linha circular/)).toBeInTheDocument()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('só uma linha fica aberta por vez', async () => {
    goToLocalHour(12)
    const user = await openBuses()
    const a = await screen.findByRole('button', { name: /Circular Centro e Zona Oeste/ })
    const b = screen.getByRole('button', { name: /Circular Zona Sul/ })
    await user.click(a)
    await user.click(b)
    expect(a).toHaveAttribute('aria-expanded', 'false')
    expect(b).toHaveAttribute('aria-expanded', 'true')
  })

  it('de madrugada diz que está fora do horário e não inventa previsões', async () => {
    goToLocalHour(3)
    const user = await openBuses()
    const button = await screen.findByRole('button', { name: /Circular Zona Sul/ })
    expect(
      within(button).getByText(/Fora do horário \(opera das 5h às 23h30\)/),
    ).toBeInTheDocument()
    await user.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls'))
    expect(within(panel).getAllByText('Sem previsão agora.')).toHaveLength(5)
  })
})
