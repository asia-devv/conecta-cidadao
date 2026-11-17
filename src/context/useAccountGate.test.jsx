import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../components/ui/Toast.jsx'
import { signInAdmin, signInDemo } from '../services/accountService.js'
import { DEMO_ACCOUNTS, DEMO_ADMIN_PASSWORD } from '../config/demoAccounts.js'
import { SessionProvider, useSession } from './SessionContext.jsx'
import { useAccountGate } from './useAccountGate.js'

let result
function Action() {
  const { status } = useSession()
  const gate = useAccountGate()
  return (
    <button
      disabled={status === 'loading'}
      onClick={() => {
        result = gate('support', { guest: 'Entre para apoiar.', denied: 'Só moradores.' })
      }}
    >
      Apoiar
    </button>
  )
}

function renderGate() {
  result = undefined
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/relato']}>
        <ToastProvider>
          <Routes>
            <Route path="relato" element={<Action />} />
            <Route path="entrar" element={<p>Tela Entrar</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </SessionProvider>,
  )
}

async function clickApoiar() {
  const button = screen.getByRole('button', { name: 'Apoiar' })
  await waitFor(() => expect(button).toBeEnabled())
  await userEvent.click(button)
}

describe('useAccountGate', () => {
  it('manda o visitante para "Entrar" com o aviso', async () => {
    renderGate()
    await clickApoiar()
    expect(result).toBeNull()
    expect(screen.getByText('Tela Entrar')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Entre para apoiar.')
  })

  it('avisa a conta sem permissão e não segue com a ação', async () => {
    await signInAdmin({ email: DEMO_ACCOUNTS.admin.email, password: DEMO_ADMIN_PASSWORD })
    renderGate()
    await clickApoiar()
    expect(result).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Só moradores.')
  })

  it('devolve a conta de quem pode fazer a ação', async () => {
    const account = await signInDemo('resident')
    renderGate()
    await clickApoiar()
    expect(result).toMatchObject({ id: account.id, type: 'resident' })
  })
})
