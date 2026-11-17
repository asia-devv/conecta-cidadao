import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { goToLocalHour } from '../../test/clockHelpers.js'
import { getMobilitySnapshot } from '../../services/mobilityService.js'
import { RAIL_LINES, RAIL_STATIONS } from '../../data/railNetwork.js'
import MapView from './MapView.jsx'

// Teste de fumaça do desenho: o jsdom não tem layout nem tiles, mas monta o SVG e os marcadores.
async function renderMap(props = {}) {
  goToLocalHour(12)
  const snapshot = await getMobilitySnapshot('sao-paulo')
  const view = render(
    <MapView snapshot={snapshot} mode="traffic" onSelectSegment={() => {}} {...props} />,
  )
  return { ...view, snapshot }
}

describe('MapView', () => {
  it('é uma região nomeada que aponta para as listas', async () => {
    const { getByRole } = await renderMap()
    expect(getByRole('region', { name: /Mapa esquemático/ })).toBeInTheDocument()
  })

  it('no modo trânsito desenha um traço por trecho, com a classe do nível', async () => {
    const { container, snapshot } = await renderMap()
    const paths = container.querySelectorAll('path.leaflet-interactive')
    expect(paths).toHaveLength(snapshot.segments.length)
    for (const path of paths) {
      expect(path.getAttribute('class')).toMatch(/nr-line-(free|moderate|heavy|unknown)/)
    }
  })

  it('o trecho destacado ganha um contorno extra', async () => {
    const { container, snapshot } = await renderMap({ selectedSegmentId: 'sao-paulo-s1' })
    expect(container.querySelectorAll('path.nr-halo')).toHaveLength(1)
    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(
      snapshot.segments.length,
    )
  })

  it('clicar em um trecho avisa qual foi', async () => {
    const onSelectSegment = vi.fn()
    const { container } = await renderMap({ onSelectSegment })
    container
      .querySelector('path.leaflet-interactive')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onSelectSegment).toHaveBeenCalledWith(
      expect.stringMatching(/^sao-paulo-s\d+$/),
    )
  })

  it('no modo ônibus desenha as linhas e os ônibus numerados, sem foco de teclado', async () => {
    const { container, snapshot } = await renderMap({ mode: 'bus' })
    expect(container.querySelectorAll('path.nr-route')).toHaveLength(
      snapshot.lines.length,
    )
    const buses = container.querySelectorAll('.nr-bus')
    expect(buses).toHaveLength(snapshot.lines.reduce((n, l) => n + l.buses.length, 0))
    expect(container.querySelectorAll('.leaflet-marker-icon[tabindex]')).toHaveLength(0)
  })

  it('com uma linha aberta mostra só os ônibus e as paradas dela', async () => {
    const { container, snapshot } = await renderMap({
      mode: 'bus',
      selectedLineId: 'sao-paulo-l100',
    })
    const line = snapshot.lines.find((l) => l.id === 'sao-paulo-l100')
    expect(container.querySelectorAll('.nr-bus')).toHaveLength(line.buses.length)
    expect(container.querySelectorAll('path.nr-stop')).toHaveLength(line.stops.length)
    expect(container.querySelectorAll('path.nr-route-selected')).toHaveLength(1)
  })

  it('no modo metrô e trem desenha as linhas e marca as favoritas com estrela', async () => {
    const rail = {
      lines: RAIL_LINES,
      stations: RAIL_STATIONS,
      selectedLineId: null,
      favorites: ['pinheiros', 'luz'],
    }
    const { container } = await renderMap({ mode: 'rail', rail })
    expect(container.querySelectorAll('path.nr-rail-casing')).toHaveLength(
      RAIL_LINES.length,
    )
    expect(container.querySelectorAll('.nr-star')).toHaveLength(2)
    expect(container.querySelectorAll('path.nr-station')).toHaveLength(
      Object.keys(RAIL_STATIONS).length - 2,
    )
    expect(container.querySelectorAll('.leaflet-marker-icon[tabindex]')).toHaveLength(0)
  })

  it('alerta de bairro: área tracejada e pontos de apoio numerados', async () => {
    const overlay = {
      id: 'a',
      center: [-23.567, -46.692],
      radius: 900,
      places: [
        { id: 'p1', name: 'Um', position: [-23.566, -46.69] },
        { id: 'p2', name: 'Dois', position: [-23.569, -46.695] },
      ],
      selectedPlaceId: 'p2',
    }
    const { container } = await renderMap({ overlay })
    expect(container.querySelectorAll('path.nr-alert-area')).toHaveLength(1)
    const safe = container.querySelectorAll('.nr-safe')
    expect([...safe].map((s) => s.textContent)).toEqual(['1', '2'])
    expect(container.querySelectorAll('.nr-safe-selected')).toHaveLength(1)
  })

  it('linha parada: trecho pontilhado e a rota escolhida por cima', async () => {
    const overlay = {
      id: 'b',
      center: [-23.53, -46.79],
      stretch: [
        [-23.53, -46.79],
        [-23.566, -46.702],
      ],
      routes: [
        {
          legs: [
            {
              type: 'rail',
              color: '#97A098',
              path: [
                [-23.53, -46.79],
                [-23.52, -46.66],
              ],
            },
          ],
        },
        {
          legs: [
            {
              type: 'bus',
              color: null,
              path: [
                [-23.53, -46.79],
                [-23.566, -46.702],
              ],
            },
          ],
        },
      ],
      selectedRouteIndex: 1,
    }
    const { container } = await renderMap({ overlay })
    expect(container.querySelectorAll('path.nr-blocked')).toHaveLength(1)
    expect(container.querySelectorAll('path.nr-route-selected')).toHaveLength(1)
  })
})
