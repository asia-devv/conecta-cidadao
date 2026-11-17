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
const heading = (name) => screen.findByRole('heading', { level: 1, name })

beforeEach(async () => {
  clock.reset()
  await accounts.signInDemo('resident')
})

describe('Perfil: notificações', () => {
  it('o perfil leva às notificações, que começam com o padrão', async () => {
    const user = userEvent.setup()
    renderAt('/perfil')
    await user.click(await screen.findByRole('link', { name: /Notificações/ }))
    expect(await heading('Notificações')).toBeInTheDocument()
    expect(screen.getByLabelText('Receber notificações')).toBeChecked()
    expect(screen.getByLabelText('Alertas da cidade')).toBeChecked()
    expect(screen.getByLabelText('Notícias da cidade')).not.toBeChecked()
    expect(screen.getByText(/ainda não envia avisos para o celular/)).toBeInTheDocument()
  })

  it('cada mudança é salva na conta; desligar tudo desativa os assuntos', async () => {
    const user = userEvent.setup()
    renderAt('/perfil/notificacoes')
    await user.click(await screen.findByLabelText('Notícias da cidade'))
    expect(await screen.findByText('Preferência salva')).toBeInTheDocument()
    expect((await accounts.getSession()).notifications.cityNews).toBe(true)

    await user.click(screen.getByLabelText('Receber notificações'))
    expect(screen.getByLabelText('Alertas da cidade')).toBeDisabled()
    expect((await accounts.getSession()).notifications.enabled).toBe(false)
  })
})

describe('Perfil: estações favoritas', () => {
  it('sem favoritas, explica e leva ao mapa já em "Metrô e trem"', async () => {
    const user = userEvent.setup()
    renderAt('/perfil/estacoes')
    expect(await screen.findByText('Nenhuma estação favorita')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Escolher estações no mapa' }))
    expect(await heading('Mapa')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Metrô e trem', pressed: true }),
    ).toBeInTheDocument()
  })

  it('lista as favoritas com as linhas e deixa remover', async () => {
    const resident = await accounts.getSession()
    await accounts.updateAccount(resident.id, { favoriteStations: ['luz', 'pinheiros'] })
    const user = userEvent.setup()
    renderAt('/perfil/estacoes')
    const list = await screen.findByRole('list', { name: 'Suas estações favoritas' })
    expect(within(list).getByText('Luz')).toBeInTheDocument()
    expect(within(list).getByText(/Linha 1-Azul · Linha 4-Amarela/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover Luz das favoritas' }))
    expect(await screen.findByText('Estação removida das favoritas')).toBeInTheDocument()
    expect((await accounts.getSession()).favoriteStations).toEqual(['pinheiros'])
  })
})
