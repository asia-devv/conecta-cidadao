import { HOURS } from '../domain/relativeTime.js'

/**
 * Alertas e notícias MUNICIPAIS fictícios (aba Início).
 *
 * As fontes não existem e os fatos são inventados. Bairros, linhas e estações
 * são reais só para o mapa conseguir mostrar onde cada alerta vale: nenhum alerta
 * daqui deve ser seguido de verdade.
 *
 * Cada alerta tem um `target`, que diz o que o mapa mostra ao tocar nele:
 *  - { type: 'area', neighborhoodId } → pontos de apoio perto do bairro;
 *  - { type: 'rail', lineId, from, to } → trecho parado e rotas alternativas.
 *
 * Datas relativas a `epochMs`, em horas (negativo = passado), como no seed estadual.
 */

const source = (id, name) => ({ id, name })
const CIVIL = {
  'sao-paulo': source('defesa-civil-sp', 'Defesa Civil Fictícia de São Paulo'),
  campinas: source('defesa-civil-campinas', 'Defesa Civil Fictícia de Campinas'),
  santos: source('defesa-civil-santos', 'Defesa Civil Fictícia de Santos'),
}
const RAIL = source('mobilidade-metropolitana', 'Central Fictícia de Mobilidade')
const CITY_NEWS = {
  'sao-paulo': source('noticias-sp', 'Agência Fictícia da Cidade de São Paulo'),
  campinas: source('noticias-campinas', 'Agência Fictícia de Campinas'),
  santos: source('noticias-santos', 'Agência Fictícia de Santos'),
}

const area = (neighborhoodId) => ({ type: 'area', neighborhoodId })
const rail = (lineId, from, to) => ({ type: 'rail', lineId, from, to })

// [id, cidade, tipo, nível, publicado(h), expira(h), alvo, título, resumo, fonte?]
const ALERTS = [
  [
    'sp-a1',
    'sao-paulo',
    'storm',
    'urgent',
    -1,
    5,
    area('sao-paulo/pinheiros'),
    'Tempestade com raios e ventania em Pinheiros',
    'Chuva forte com rajadas de vento nas próximas horas. Fique longe de árvores e postes e, se estiver na rua, procure um dos pontos de apoio indicados no mapa.',
  ],
  [
    'sp-a2',
    'sao-paulo',
    'flood',
    'attention',
    -2,
    8,
    area('sao-paulo/mooca'),
    'Pontos de alagamento na Mooca',
    'Ruas mais baixas do bairro acumulam água. Não atravesse trechos alagados, a pé ou de carro.',
  ],
  [
    'sp-a3',
    'sao-paulo',
    'rail',
    'urgent',
    -0.5,
    4,
    rail('trem-9', 'osasco', 'pinheiros'),
    'Linha 9-Esmeralda travada entre Osasco e Pinheiros',
    'Os trens estão parados neste trecho. O mapa mostra caminhos por outras linhas e o ônibus de apoio.',
    RAIL,
  ],
  [
    'sp-a4',
    'sao-paulo',
    'rail',
    'attention',
    -1.5,
    3,
    rail('metro-3', 'se', 'bras'),
    'Linha 3-Vermelha com velocidade reduzida entre Sé e Brás',
    'As viagens estão mais demoradas neste trecho. Há caminhos alternativos por outras linhas.',
    RAIL,
  ],
  [
    'sp-a5',
    'sao-paulo',
    'power',
    'info',
    -4,
    20,
    area('sao-paulo/santana'),
    'Falta de energia programada em Santana',
    'Manutenção na rede elétrica deixa parte do bairro sem luz entre 9h e 13h. Os pontos de apoio têm energia e água.',
  ],
  [
    'cps-a1',
    'campinas',
    'storm',
    'urgent',
    -1,
    6,
    area('campinas/barao-geraldo'),
    'Temporal com granizo em Barão Geraldo',
    'Granizo e rajadas de vento previstos para o fim da tarde. Proteja-se em locais cobertos e longe de janelas.',
  ],
  [
    'stos-a1',
    'santos',
    'storm',
    'attention',
    -3,
    10,
    area('santos/boqueirao'),
    'Ressaca e ventos fortes na orla do Boqueirão',
    'Ondas altas e vento forte na faixa de areia. Evite a praia e a mureta até o fim do alerta.',
  ],
]

// [id, cidade, publicado(h), título, resumo, parágrafos]
const NEWS = [
  [
    'sp-n1',
    'sao-paulo',
    -6,
    'Mutirão de recapeamento chega a ruas da zona leste',
    'As obras acontecem à noite para reduzir o impacto no trânsito.',
    [
      'O cronograma prevê duas semanas de trabalho, sempre das 22h às 5h.',
      'Moradores serão avisados com antecedência sobre interdições na própria rua.',
    ],
  ],
  [
    'sp-n2',
    'sao-paulo',
    -30,
    'Novos bebedouros em praças da região central',
    'Os equipamentos funcionam com água filtrada e acessível para cadeirantes.',
    [
      'Ao todo, doze praças recebem os bebedouros nesta primeira fase.',
      'A manutenção é semanal; problemas podem ser relatados pelo próprio app.',
    ],
  ],
  [
    'cps-n1',
    'campinas',
    -12,
    'Parque do Taquaral terá iluminação nova na pista de caminhada',
    'A troca das lâmpadas deve terminar antes do horário de verão das atividades noturnas.',
    [
      'A pista ficará aberta durante a obra, com trechos sinalizados.',
      'Os postes antigos serão reaproveitados em outras áreas verdes.',
    ],
  ],
  [
    'stos-n1',
    'santos',
    -20,
    'Ciclovia da orla ganha sinalização para pedestres',
    'Faixas e placas novas indicam onde atravessar com segurança.',
    [
      'A mudança foi pedida por moradores e frequentadores da praia.',
      'Agentes vão orientar ciclistas e pedestres nas primeiras semanas.',
    ],
  ],
]

/** Alvos (no mapa) dos alertas municipais que já existiam no seed estadual. */
export const STATE_ALERT_TARGETS = {
  'seed-state-a2': { alertType: 'flood', target: area('campinas/taquaral') },
  'seed-state-a3': { alertType: 'tide', target: area('santos/ponta-da-praia') },
  'seed-state-a4': { alertType: 'weather', target: null },
  'seed-state-a5': { alertType: 'fire', target: null },
}

const at = (epochMs, hours) => new Date(epochMs + hours * HOURS).toISOString()

export function generateSeedCity(epochMs) {
  const alerts = ALERTS.map(
    ([id, cityId, alertType, level, pub, exp, target, title, summary, src]) => ({
      kind: 'alert',
      id: `seed-city-${id}`,
      source: src ?? CIVIL[cityId],
      cityId,
      alertType,
      target,
      level,
      publishedAt: at(epochMs, pub),
      expiresAt: at(epochMs, exp),
      title,
      summary,
    }),
  )
  const news = NEWS.map(([id, cityId, pub, title, summary, body]) => ({
    kind: 'news',
    id: `seed-city-${id}`,
    source: CITY_NEWS[cityId],
    cityId,
    publishedAt: at(epochMs, pub),
    title,
    summary,
    body,
  }))
  return [...alerts, ...news]
}
