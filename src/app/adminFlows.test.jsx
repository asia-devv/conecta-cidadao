import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeFiware } from '../test/fakeFiware.js'
import { DEMO_ACCOUNTS, DEMO_ADMIN_PASSWORD } from '../config/demoAccounts.js'
import { AccessibilityProvider } from '../context/AccessibilityContext.jsx'
import { ClockProvider } from '../context/ClockContext.jsx'
import { SessionProvider } from '../context/SessionContext.jsx'
import { clock } from '../services/clock.js'
import { listAdminReports } from '../services/adminService.js'
import { filterAdminReports } from '../domain/adminQueue.js'
import { CITIES } from '../domain/places.js'
import { getPost, listPosts } from '../services/postService.js'
import { getTrafficThresholds } from '../services/settingsService.js'
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
const admin = DEMO_ACCOUNTS.admin

beforeEach(() => clock.reset())

/** Entra no painel pela tela de login e abre a seção pedida. */
async function openPanel(user, section) {
  const view = renderAt('/admin/login')
  await user.type(await screen.findByLabelText('E-mail'), admin.email)
  await user.type(screen.getByLabelText('Senha'), DEMO_ADMIN_PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  await heading('Painel administrativo')
  if (section) {
    const nav = screen.getByRole('navigation', { name: 'Seções da administração' })
    await user.click(within(nav).getByRole('link', { name: section }))
  }
  return view
}

describe('painel: visão geral e navegação', () => {
  it('mostra os números da fila e as primeiras ocorrências', async () => {
    const user = userEvent.setup()
    await openPanel(user)
    const summary = await screen
      .findByRole('list', { name: 'Resumo da fila' })
      .catch(() => screen.findByLabelText('Resumo da fila'))
    expect(within(summary).getByText('Ocorrências abertas')).toBeInTheDocument()
    expect(within(summary).getByText('Com prazo excedido')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Primeiras da fila' }),
    ).toBeInTheDocument()
    expect((await screen.findAllByRole('article')).length).toBeLessThanOrEqual(5)
  })

  it('a navegação marca a seção atual', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await heading('Ocorrências')
    const nav = screen.getByRole('navigation', { name: 'Seções da administração' })
    expect(within(nav).getByRole('link', { name: 'Ocorrências' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})

describe('painel: fila de ocorrências', () => {
  it('lista só as abertas, da maior para a menor pontuação', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await heading('Ocorrências')
    const rows = await screen.findAllByRole('article')
    expect(rows.length).toBe(25) // primeira página
    const scores = rows.map((row) =>
      Number(within(row).getByTitle('Pontuação de prioridade').firstChild.textContent),
    )
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    expect(screen.getByRole('button', { name: /Mostrar mais/ })).toBeInTheDocument()
  })

  it('"Mostrar mais" amplia a lista', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await screen.findAllByRole('article')
    await user.click(screen.getByRole('button', { name: /Mostrar mais/ }))
    expect((await screen.findAllByRole('article')).length).toBeGreaterThan(25)
  })

  it('filtra por urgência e informa a contagem', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await screen.findAllByRole('article')
    await user.selectOptions(screen.getByLabelText('Urgência'), 'high')
    const rows = await screen.findAllByRole('article')
    for (const row of rows) {
      expect(within(row).getByText('Urgência alta')).toBeInTheDocument()
    }
    expect(screen.getByText(/Mostrando \d+ de \d+/)).toBeInTheDocument()
  })

  it('"Encerradas" mostra só relatos resolvidos ou não procedentes', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await screen.findAllByRole('article')
    await user.click(screen.getByRole('button', { name: 'Encerradas' }))
    const rows = await screen.findAllByRole('article')
    for (const row of rows) {
      expect(within(row).getByText(/Resolvida|Não procedente/)).toBeInTheDocument()
    }
  })

  it('filtro sem resultado mostra estado vazio', async () => {
    const user = userEvent.setup()
    const all = await listAdminReports(admin)
    // procura um município + urgência sem nenhuma ocorrência aberta
    let empty = null
    for (const city of CITIES) {
      for (const level of ['high', 'medium', 'low']) {
        const hits = filterAdminReports(all, {
          state: 'open',
          level,
          cityId: city.id,
          category: 'all',
        })
        if (!empty && hits.length === 0) empty = { cityId: city.id, level }
      }
    }
    expect(empty, 'o seed precisa ter alguma combinação vazia').not.toBeNull()

    await openPanel(user, 'Ocorrências')
    await screen.findAllByRole('article')
    await user.selectOptions(screen.getByLabelText(/^Município/), empty.cityId)
    await user.selectOptions(screen.getByLabelText(/^Urgência/), empty.level)
    expect(
      await screen.findByText('Nenhuma ocorrência com estes filtros'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})

describe('painel: atualizar o status de uma ocorrência', () => {
  /** Abre a primeira ocorrência "Recebida" da fila e devolve o id dela. */
  async function openFirstReceived(user) {
    await openPanel(user, 'Ocorrências')
    const rows = await screen.findAllByRole('article')
    const row = rows.find((r) => within(r).queryByText('Recebida'))
    expect(row).toBeDefined()
    const link = within(row).getByRole('link')
    const id = link.getAttribute('href').split('/').at(-1)
    await user.click(link)
    await screen.findByRole('heading', { level: 2, name: 'Atualizar status' })
    return { id }
  }

  it('registra a atualização, mostra o aviso e o morador vê no histórico', async () => {
    const user = userEvent.setup()
    const target = await openFirstReceived(user)

    await user.selectOptions(screen.getByLabelText(/Nova etapa/), 'in_review')
    await user.click(screen.getByRole('button', { name: 'Registrar atualização' }))

    expect(await screen.findByText('Atualização registrada')).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Histórico do relato' })
    expect(
      within(history).getByText(/Atualização da administração de demonstração/),
    ).toBeInTheDocument()

    const seenByResident = await getPost(target.id, null)
    expect(seenByResident.status).toBe('in_review')
    expect(seenByResident.events.at(-1)).toMatchObject({ by: 'admin', simulated: false })
  })

  it('encaminhar exige uma nota; sem ela nada é registrado', async () => {
    const user = userEvent.setup()
    const target = await openFirstReceived(user)

    await user.selectOptions(screen.getByLabelText(/Nova etapa/), 'forwarded')
    await user.click(screen.getByRole('button', { name: 'Registrar atualização' }))

    expect(await screen.findByLabelText(/Nota para o morador/)).toBeInvalid()
    expect((await getPost(target.id, null)).status).toBe('received')
  })

  it('relato resolvido não oferece nova atualização', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Ocorrências')
    await screen.findAllByRole('article')
    await user.click(screen.getByRole('button', { name: 'Encerradas' }))
    const [first] = await screen.findAllByRole('article')
    await user.click(within(first).getByRole('link'))
    expect(await screen.findByText('Relato encerrado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Registrar atualização' }),
    ).not.toBeInTheDocument()
  })
})

describe('painel: avisos', () => {
  it('publica um aviso para o município e o morador o vê no feed', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Avisos')
    await heading('Avisos oficiais')

    await user.selectOptions(screen.getByLabelText(/^Nível/), 'attention')
    await user.type(screen.getByLabelText(/Título/), 'Coleta alterada no feriado')
    await user.type(
      screen.getByLabelText(/Descrição/),
      'A coleta de lixo será feita na quinta-feira, em vez de quarta.',
    )
    await user.selectOptions(screen.getByLabelText(/^Município/), 'campinas')
    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))

    expect(await screen.findByText(/publicado\./)).toBeInTheDocument()
    const list = await screen.findByRole('region', { name: 'Publicados por você' })
    expect(within(list).getByText('Coleta alterada no feriado')).toBeInTheDocument()
    expect(within(list).getByText(/Campinas \(município inteiro\)/)).toBeInTheDocument()

    const campinas = CITIES.find((c) => c.id === 'campinas')
    const feed = await listPosts({ neighborhoodIds: [campinas.neighborhoods[0].id] })
    const published = feed.find((p) => p.title === 'Coleta alterada no feriado')
    expect(published).toMatchObject({
      type: 'notice',
      level: 'attention',
      simulated: false,
    })
  })

  it('valida os campos antes de publicar', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Avisos')
    await heading('Avisos oficiais')
    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))
    expect(await screen.findByText(/título com pelo menos 5/i)).toBeInTheDocument()
    expect(screen.getByText(/pelo menos 20 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText('Escolha o município.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum aviso publicado')).toBeInTheDocument()
  })

  it('retira um aviso publicado', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Avisos')
    await heading('Avisos oficiais')
    await user.type(screen.getByLabelText(/Título/), 'Obra na avenida central')
    await user.type(
      screen.getByLabelText(/Descrição/),
      'Haverá interdição parcial da avenida durante a noite.',
    )
    await user.selectOptions(screen.getByLabelText(/^Município/), 'santos')
    await user.click(screen.getByRole('button', { name: 'Publicar aviso' }))
    await user.click(
      await screen.findByRole('button', {
        name: 'Retirar o aviso Obra na avenida central',
      }),
    )
    expect(await screen.findByText('Nenhum aviso publicado')).toBeInTheDocument()
  })
})

describe('painel: parâmetros do trânsito', () => {
  it('salva novos limites e os usa; restaurar volta ao padrão', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Parâmetros')
    await heading('Parâmetros')

    const free = await screen.findByLabelText(/Trânsito livre a partir de/)
    const heavy = screen.getByLabelText(/Congestionamento intenso abaixo de/)
    await user.clear(free)
    await user.type(free, '80')
    await user.clear(heavy)
    await user.type(heavy, '30')
    await user.click(screen.getByRole('button', { name: 'Salvar limites' }))

    expect(await screen.findByText(/Limites salvos/)).toBeInTheDocument()
    expect(getTrafficThresholds()).toEqual({ freeFrom: 80, heavyBelow: 30 })

    await user.click(screen.getByRole('button', { name: /Restaurar padrão/ }))
    expect(await screen.findByText(/Limites padrão restaurados/)).toBeInTheDocument()
    expect(getTrafficThresholds()).toEqual({ freeFrom: 75, heavyBelow: 40 })
  })

  it('recusa limites incoerentes', async () => {
    const user = userEvent.setup()
    await openPanel(user, 'Parâmetros')
    await heading('Parâmetros')
    const free = await screen.findByLabelText(/Trânsito livre a partir de/)
    await user.clear(free)
    await user.type(free, '30')
    await user.click(screen.getByRole('button', { name: 'Salvar limites' }))
    expect(
      await screen.findByText(/deve ser menor que o de trânsito livre/),
    ).toBeInTheDocument()
    expect(getTrafficThresholds()).toEqual({ freeFrom: 75, heavyBelow: 40 })
  })
})

describe('painel: dispositivos IoT (FIWARE)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('conecta, cadastra um sensor numa via e mostra a leitura recebida', async () => {
    const fake = installFakeFiware()
    const user = userEvent.setup()
    await openPanel(user, 'Parâmetros')
    const section = await screen.findByRole('region', { name: 'Dispositivos IoT' })

    await user.type(
      within(section).getByLabelText(/Endereço IPv4 do servidor FIWARE/),
      '10.0.0.5',
    )
    await user.click(within(section).getByRole('button', { name: 'Conectar' }))
    expect(
      await within(section).findByText('Conectado a 10.0.0.5 (Orion 3.10.1).'),
    ).toBeInTheDocument()

    await user.type(within(section).getByLabelText(/ID do sensor/), '001')
    await user.selectOptions(
      within(section).getByLabelText(/Via monitorada/),
      'sp-av-paulista',
    )
    await user.click(
      within(section).getByRole('button', { name: 'Cadastrar no IoT Agent' }),
    )
    expect(
      await within(section).findByText(
        /Sensor 001 cadastrado\. Publique em \/TEF\/traffic001\/attrs/,
      ),
    ).toBeInTheDocument()
    expect(fake.devices.has('traffic001')).toBe(true)

    const list = await within(section).findByRole('list', { name: 'Sensores IoT' })
    expect(within(list).getByText('Sem dados')).toBeInTheDocument()

    await user.type(within(list).getByLabelText(/Leitura de teste/), '12')
    await user.click(within(list).getByRole('button', { name: 'Enviar ao Orion' }))
    expect(await within(list).findByText('Congestionamento intenso')).toBeInTheDocument()
    expect(within(list).getByText('12,0 km/h')).toBeInTheDocument()
    expect(
      within(list).getByText(/38 km\/h abaixo da máxima \(24%\)/),
    ).toBeInTheDocument()
  })

  it('IP inválido é recusado antes de chamar o servidor', async () => {
    const fake = installFakeFiware()
    const user = userEvent.setup()
    await openPanel(user, 'Parâmetros')
    const section = await screen.findByRole('region', { name: 'Dispositivos IoT' })
    await user.type(
      within(section).getByLabelText(/Endereço IPv4 do servidor FIWARE/),
      'meu-servidor',
    )
    await user.click(within(section).getByRole('button', { name: 'Conectar' }))
    expect(await within(section).findByText(/Informe um IPv4/)).toBeInTheDocument()
    expect(fake.fetchMock).not.toHaveBeenCalled()
  })
})
