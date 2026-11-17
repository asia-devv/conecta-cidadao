import { getNeighborhood } from './places.js'

/**
 * Tipos de conta: morador(a) e administração. Não há mais divisão entre pessoa
 * física e empresa, e nenhum documento (CPF/CNPJ) é pedido ou guardado.
 */
export const ACCOUNT_TYPES = {
  resident: {
    label: 'Morador(a)',
    description: 'Conta de quem mora ou circula pela cidade.',
  },
  admin: { label: 'Administração', description: 'Equipe que modera o app.' },
}

const PERMISSIONS = {
  report: ['resident'],
  support: ['resident'],
  save_event: ['resident'],
  favorite_station: ['resident'],
  access_admin: ['admin'],
}

/** O que cada tipo de conta pode fazer. Novas ações entram aqui quando uma etapa precisar. */
export function can(account, action) {
  return Boolean(account && PERMISSIONS[action]?.includes(account.type))
}

export const isResident = (account) => account?.type === 'resident'

export const AUTHOR_DISPLAY = {
  neighborhood: {
    label: 'Só o bairro',
    example: 'Morador(a) de Pinheiros',
  },
  first_name: {
    label: 'Primeiro nome e bairro',
    example: 'Ana · Pinheiros',
  },
}

export const DEFAULT_PRIVACY = { authorDisplay: 'neighborhood' }

/**
 * Preferências de notificação. Tudo ligado por padrão, menos notícias (que
 * são muitas); "Horário silencioso" segura as não urgentes à noite.
 */
export const NOTIFICATION_TOPICS = [
  {
    id: 'cityAlerts',
    label: 'Alertas da cidade',
    description:
      'Chuva forte, alagamento, falta de energia e outros riscos nos seus bairros.',
  },
  {
    id: 'stationAlerts',
    label: 'Metrô e trem',
    description: 'Problemas nas linhas das suas estações favoritas.',
  },
  {
    id: 'reportUpdates',
    label: 'Andamento dos meus relatos',
    description: 'Quando um relato seu muda de etapa.',
  },
  {
    id: 'cityNews',
    label: 'Notícias da cidade',
    description: 'Novidades dos municípios que você acompanha.',
  },
  {
    id: 'stateNews',
    label: 'Notícias e eventos do estado',
    description: 'Conteúdo da aba Estado.',
  },
]

export const DEFAULT_NOTIFICATIONS = {
  enabled: true,
  cityAlerts: true,
  stationAlerts: true,
  reportUpdates: true,
  cityNews: false,
  stateNews: false,
  urgentOnly: false,
  quietHours: true,
}

/**
 * Como a pessoa aparece nos relatos (D18). O padrão é anônimo por bairro.
 * As permissões são simuladas no protótipo.
 */
export function getAuthorLabel(account) {
  if (!account) return 'Morador(a)'

  const place = getNeighborhood(account.neighborhoodId)
  const neighborhood = place?.name ?? 'sua região'
  if (account.privacy?.authorDisplay === 'first_name') {
    const first = account.name?.trim().split(/\s+/)[0]
    if (first) return `${first} · ${neighborhood}`
  }
  return `Morador(a) de ${neighborhood}`
}

/** Iniciais para o avatar (máx. 2 letras). */
export function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
