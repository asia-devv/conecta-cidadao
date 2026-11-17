import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccessibilityProvider } from '../context/AccessibilityContext.jsx'
import { ClockProvider } from '../context/ClockContext.jsx'
import { SessionProvider } from '../context/SessionContext.jsx'
import * as accounts from '../services/accountService.js'
import { clock } from '../services/clock.js'
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

const heading = (name, level = 1) => screen.findByRole('heading', { level, name })
const REPORT = '/publicacao/seed-sao-paulo-pinheiros-r1'

describe('Início como visitante', () => {
  it('avisa que o conteúdo é fictício e pede para escolher um município', async () => {
    renderAt('/inicio')
    expect(await heading('Início')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo de demonstração')).toBeInTheDocument()
    expect(screen.getByText('Escolha um município')).toBeInTheDocument()
  })

  it('mostra só alertas e notícias da cidade: nada de relatos de moradores', async () => {
    const user = userEvent.setup()
    renderAt('/inicio')
    await user.selectOptions(await screen.findByLabelText(/Município/), 'São Paulo')

    const alerts = await screen.findByRole('list', { name: 'Alertas' })
    const news = screen.getByRole('list', { name: 'Notícias' })
    expect(within(alerts).getAllByRole('article').length).toBeGreaterThanOrEqual(3)
    expect(within(news).getAllByRole('article').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Relato de morador')).not.toBeInTheDocument()
    // o mais grave vem primeiro
    expect(within(alerts).getAllByRole('article')[0]).toHaveTextContent('Urgente')
    // tudo marcado como demonstração
    for (const article of screen.getAllByRole('article')) {
      expect(within(article).getByText('Simulado')).toBeInTheDocument()
    }
    // nenhum conteúdo de outro município
    expect(screen.queryByText(/Barão Geraldo/)).not.toBeInTheDocument()
  })

  it('tocar num alerta abre o mapa', async () => {
    const user = userEvent.setup()
    renderAt('/inicio')
    await user.selectOptions(await screen.findByLabelText(/Município/), 'São Paulo')
    const alerts = await screen.findByRole('list', { name: 'Alertas' })
    const storm = within(alerts)
      .getAllByRole('article')
      .find((a) => a.textContent.includes('Tempestade com raios e ventania em Pinheiros'))
    await user.click(within(storm).getByRole('button', { name: 'Ver no mapa' }))
    expect(await heading('Mapa')).toBeInTheDocument()
  })

  it('notícia abre o texto completo e volta ao Início', async () => {
    const user = userEvent.setup()
    renderAt('/inicio')
    await user.selectOptions(await screen.findByLabelText(/Município/), 'Campinas')
    const news = await screen.findByRole('list', { name: 'Notícias' })
    await user.click(within(news).getAllByRole('button', { name: 'Ler notícia' })[0])
    expect(
      await heading('Parque do Taquaral terá iluminação nova na pista de caminhada'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Voltar ao início/ }))
    expect(await heading('Início')).toBeInTheDocument()
  })
})

describe('Início como morador', () => {
  it('mostra a cidade do bairro acompanhado sem pedir escolha', async () => {
    await accounts.signInDemo('resident')
    renderAt('/inicio')
    expect(
      await screen.findByText('Alertas e notícias de São Paulo.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/Município/)).not.toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Alertas' })).toBeInTheDocument()
  })

  it('com bairros em 2 municípios, aparecem chips para filtrar', async () => {
    const resident = await accounts.signInDemo('resident')
    await accounts.updateAccount(resident.id, {
      followedPlaces: [
        { neighborhoodId: 'sao-paulo/pinheiros', label: 'Casa' },
        { neighborhoodId: 'santos/boqueirao', label: 'Outro' },
      ],
    })
    const user = userEvent.setup()
    renderAt('/inicio')
    const group = await screen.findByRole('group', { name: 'Município' })
    expect(await screen.findByText(/Ressaca e ventos fortes/)).toBeInTheDocument()
    await user.click(within(group).getByRole('button', { name: 'São Paulo' }))
    expect(await screen.findByText(/Tempestade com raios/)).toBeInTheDocument()
    expect(screen.queryByText(/Ressaca e ventos fortes/)).not.toBeInTheDocument()
  })

  it('sem bairros acompanhados, explica o que fazer', async () => {
    const resident = await accounts.signInDemo('resident')
    await accounts.updateAccount(resident.id, { followedPlaces: [] })
    renderAt('/inicio')
    expect(
      await screen.findByText('Você ainda não acompanha bairros'),
    ).toBeInTheDocument()
  })
})

describe('detalhe da publicação', () => {
  it('mostra o ciclo completo do relato e quem publicou', async () => {
    await accounts.signInDemo('resident')
    renderAt(REPORT)

    expect(await heading('Acompanhamento do relato', 2)).toBeInTheDocument()
    const steps = screen.getAllByRole('listitem')
    expect(steps.length).toBeGreaterThanOrEqual(5)
    expect(screen.getByText('Morador(a) de Pinheiros')).toBeInTheDocument()
    const responsible = screen.getByRole('region', { name: 'Quem é responsável' })
    expect(responsible).toHaveTextContent('Prefeitura Fictícia de São Paulo')
    expect(responsible).toHaveTextContent(/Vereador(a)? fictíci[oa]/)
    expect(
      screen.getByText(/não indicam ação de nenhum órgão público/),
    ).toBeInTheDocument()
  })

  it('id inexistente mostra erro claro', async () => {
    renderAt('/publicacao/nao-existe')
    expect(await screen.findByText('Publicação não encontrada')).toBeInTheDocument()
    expect(screen.getByText('Não encontramos essa publicação.')).toBeInTheDocument()
  })
})

describe('relógio de demonstração', () => {
  it('adianta o tempo, mostra quanto e volta ao real', async () => {
    await accounts.signInDemo('resident')
    const user = userEvent.setup()
    renderAt('/perfil/configuracoes')
    expect(await screen.findByText('Horário real')).toBeInTheDocument()
    const reset = screen.getByRole('button', { name: 'Voltar ao horário real' })
    expect(reset).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '+1 dia' }))
    await user.click(screen.getByRole('button', { name: '+3 dias' }))
    expect(await screen.findByText('Adiantado em 4 dias')).toBeInTheDocument()
    expect(clock.getOffset()).toBe(4 * 86_400_000)

    await user.click(reset)
    expect(await screen.findByText('Horário real')).toBeInTheDocument()
    expect(clock.getOffset()).toBe(0)
  })

  it('adiantar muito o tempo faz relatos ganharem etapas simuladas no detalhe', async () => {
    await accounts.signInDemo('resident')
    const first = renderAt(REPORT)
    const countSimulated = async () => {
      await heading('Acompanhamento do relato', 2)
      return screen.queryAllByText('Atualização simulada').length
    }
    const before = await countSimulated()
    first.unmount()

    clock.advance(400 * 86_400_000) // mais de um ano: qualquer percurso já terminou
    renderAt(REPORT)
    expect(await countSimulated()).toBeGreaterThanOrEqual(before)
  })
})
