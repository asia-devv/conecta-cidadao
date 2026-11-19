/**
 * Proxy HTTP para o FIWARE, rodando dentro do servidor do Vite (`npm run dev` e
 * `npm run preview`). Mesmo desenho do /api/fiware do projeto Vinheria-Full:
 *
 *   navegador → POST /api/fiware { servidor, caminho, metodo, body } → FIWARE
 *
 * Por quê: o navegador não pode chamar o Orion/IoT Agent direto (outra origem,
 * sem CORS) e não fala MQTT por TCP. O proxy só aceita IPv4 nas portas do FIWARE
 * (1026 Orion, 4041 IoT Agent, 8666 STH-Comet), caminho começando com "/" sem
 * "..", e métodos HTTP comuns; espera no máximo 10 s.
 *
 * Os dispositivos (ESP32, Wokwi ou o simulador deste projeto) publicam por MQTT
 * direto no Mosquitto (porta 1883); isso não passa por aqui.
 */

export const ALLOWED_PORTS = ['1026', '4041', '8666']
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
const IP_WITH_PORT = /^(\d{1,3}\.){3}\d{1,3}:\d{2,5}$/
export const FIWARE_SERVICE = 'smart'
export const FIWARE_SERVICEPATH = '/'
const MAX_BODY_BYTES = 100_000

/** Valida o pedido; devolve { error } ou { url, method, body }. */
export function validateProxyRequest(payload) {
  const { servidor, caminho, metodo = 'GET', body } = payload ?? {}
  if (!servidor) return { error: 'Servidor não informado' }
  const port = String(servidor).split(':')[1]
  if (!IP_WITH_PORT.test(servidor) || !ALLOWED_PORTS.includes(port)) {
    return {
      error: `Servidor inválido. Use IP:porta (portas: ${ALLOWED_PORTS.join(', ')})`,
    }
  }
  if (
    servidor
      .split(':')[0]
      .split('.')
      .some((part) => Number(part) > 255)
  ) {
    return { error: 'Endereço IP inválido' }
  }
  if (typeof caminho !== 'string' || !caminho.startsWith('/') || caminho.includes('..')) {
    return { error: 'Caminho inválido' }
  }
  const method = String(metodo).toUpperCase()
  if (!ALLOWED_METHODS.includes(method)) return { error: 'Método não permitido' }
  return { url: `http://${servidor}${caminho}`, method, body }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Corpo grande demais'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('Corpo da requisição inválido'))
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, payload, type = 'application/json') {
  res.statusCode = status
  if (payload === null) return res.end()
  res.setHeader('Content-Type', type)
  res.end(type === 'application/json' ? JSON.stringify(payload) : payload)
}

export async function handleFiwareProxy(req, res) {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST' })
  let payload
  try {
    payload = await readJson(req)
  } catch (error) {
    return send(res, 400, { erro: error.message })
  }
  const checked = validateProxyRequest(payload)
  if (checked.error) return send(res, 400, { erro: checked.error })

  const hasBody =
    checked.method !== 'GET' && checked.method !== 'DELETE' && checked.body !== undefined
  const headers = {
    'fiware-service': FIWARE_SERVICE,
    'fiware-servicepath': FIWARE_SERVICEPATH,
    accept: 'application/json',
  }
  if (hasBody) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(checked.url, {
      method: checked.method,
      headers,
      body: hasBody ? JSON.stringify(checked.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    })
    const text = await response.text()
    if (response.status === 204 || text.length === 0)
      return send(res, response.status, null)
    try {
      return send(res, response.status, JSON.parse(text))
    } catch {
      return send(res, response.status, text, 'text/plain; charset=utf-8')
    }
  } catch (error) {
    return send(res, 502, {
      erro: 'Não foi possível conectar ao servidor FIWARE',
      detalhe: error.message,
      causa: error.cause?.code || error.cause?.message,
    })
  }
}

/** Plugin do Vite: registra /api/fiware no servidor de desenvolvimento e no preview. */
export function fiwareProxyPlugin() {
  // Não devolver nada: uma função devolvida aqui seria tratada pelo Vite como "pós-hook".
  const mount = (server) => {
    server.middlewares.use('/api/fiware', (req, res) => {
      handleFiwareProxy(req, res)
    })
  }
  return {
    name: 'conecta-cidadao-fiware-proxy',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
