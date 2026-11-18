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

const notification = () =>
  screen.findByRole('link', { name: /Alerta de tempestade na sua região/ })

describe('Tela de bloqueio (simulação)', () => {
  it('mostra hora, data e a notificação do app, sem o menu do app', async () => {
    renderAt('/tela-de-bloqueio')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Tela de bloqueio (simulação)',
      }),
    ).toBeInTheDocument()
    const link = await notification()
    expect(link).toHaveTextContent('Conecta Cidadão')
    expect(link).toHaveTextContent('Tempestade com raios e ventania em Pinheiros')
    expect(link).toHaveTextContent(/abrigos mais próximos/)
    expect(screen.getByText(/Simulação: o app ainda não envia/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('tocar na notificação abre a aba Mapa com os abrigos mais próximos', async () => {
    const user = userEvent.setup()
    renderAt('/tela-de-bloqueio')
    await user.click(await notification())

    expect(
      await screen.findByRole('heading', {
        name: 'Abrigos e pontos de apoio mais próximos de Pinheiros',
      }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: 'Mapa' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getAllByText(/Escola Municipal Fictícia Pinheiros/).length).toBe(1)
  })

  it('para quem mora em Campinas, o alerta é o da cidade da pessoa', async () => {
    const resident = await accounts.signInDemo('resident')
    await accounts.updateAccount(resident.id, {
      neighborhoodId: 'campinas/barao-geraldo',
    })
    const user = userEvent.setup()
    renderAt('/tela-de-bloqueio')
    const link = await notification()
    expect(link).toHaveTextContent('Temporal com granizo em Barão Geraldo')

    await user.click(link)
    expect(
      await screen.findByRole('heading', {
        name: 'Abrigos e pontos de apoio mais próximos de Barão Geraldo',
      }),
    ).toBeInTheDocument()
  })

  it('a tela de notificações do perfil leva à simulação', async () => {
    await accounts.signInDemo('resident')
    renderAt('/perfil/notificacoes')
    expect(
      await screen.findByRole('link', { name: 'Ver como chega uma notificação' }),
    ).toHaveAttribute('href', '/tela-de-bloqueio')
  })
})
