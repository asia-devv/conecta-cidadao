import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AccessibilityProvider } from '../../context/AccessibilityContext.jsx'
import { SessionProvider } from '../../context/SessionContext.jsx'
import { AppShell } from './AppShell.jsx'
import { PhoneFrame } from './PhoneFrame.jsx'

function renderApp(path = '/inicio') {
  return render(
    <AccessibilityProvider>
      <SessionProvider>
        <MemoryRouter initialEntries={[path]}>
          <PhoneFrame>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="inicio" element={<p>Tela Início</p>} />
                <Route path="explorar" element={<p>Tela Explorar</p>} />
                <Route path="mapa" element={<p>Tela Mapa</p>} />
                <Route path="perfil" element={<p>Tela Perfil</p>} />
                <Route path="relatar" element={<p>Tela Relatar</p>} />
              </Route>
            </Routes>
          </PhoneFrame>
        </MemoryRouter>
      </SessionProvider>
    </AccessibilityProvider>,
  )
}

describe('AppShell + navegação', () => {
  it('tem landmarks, cinco itens na ordem pedida e a aba atual marcada', () => {
    renderApp('/explorar')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Início',
      'Explorar',
      'Relatar',
      'Mapa',
      'Perfil',
    ])
    expect(within(nav).getByRole('link', { name: 'Explorar' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Mapa' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('navega entre as abas', async () => {
    const user = userEvent.setup()
    renderApp('/inicio')
    expect(screen.getByText('Tela Início')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(screen.getByText('Tela Mapa')).toBeInTheDocument()
  })

  it('o "+" leva para Relatar um problema', async () => {
    const user = userEvent.setup()
    renderApp('/inicio')
    await user.click(screen.getByRole('link', { name: 'Relatar um problema' }))
    expect(screen.getByText('Tela Relatar')).toBeInTheDocument()
  })

  it('Perfil fica no menu inferior; o cabeçalho tem só a marca', async () => {
    const user = userEvent.setup()
    renderApp('/inicio')
    const banner = screen.getByRole('banner')
    expect(within(banner).getAllByRole('link')).toHaveLength(1)
    await user.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.getByText('Tela Perfil')).toBeInTheDocument()
  })

  it('oferece link para pular ao conteúdo principal', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    )
  })
})

describe('foco ao trocar de tela', () => {
  it('não rouba o foco na primeira exibição', () => {
    renderApp('/inicio')
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('leva o foco para o conteúdo e volta a rolagem ao topo ao trocar de tela', async () => {
    const user = userEvent.setup()
    renderApp('/inicio')
    const main = screen.getByRole('main')
    main.scrollTo = vi.fn()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    await user.click(within(nav).getByRole('link', { name: 'Explorar' }))
    expect(await screen.findByText('Tela Explorar')).toBeInTheDocument()
    expect(main).toHaveFocus()
    expect(main.scrollTo).toHaveBeenCalledWith({ top: 0 })
  })
})

describe('aviso de armazenamento', () => {
  it('não aparece quando o navegador deixa gravar', () => {
    renderApp('/inicio')
    expect(
      screen.queryByText('Este navegador não permite salvar dados'),
    ).not.toBeInTheDocument()
  })

  it('avisa quando o navegador bloqueia o armazenamento', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    renderApp('/inicio')
    expect(
      screen.getByText('Este navegador não permite salvar dados'),
    ).toBeInTheDocument()
    spy.mockRestore()
  })
})
