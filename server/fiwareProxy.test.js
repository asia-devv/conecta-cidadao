import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleFiwareProxy, validateProxyRequest } from './fiwareProxy.js'

describe('validateProxyRequest', () => {
  it('aceita IPv4 nas portas do FIWARE', () => {
    expect(
      validateProxyRequest({ servidor: '10.0.0.5:1026', caminho: '/version' }),
    ).toEqual({ url: 'http://10.0.0.5:1026/version', method: 'GET', body: undefined })
  })

  it('recusa porta, IP, caminho e método fora do permitido', () => {
    const base = { servidor: '10.0.0.5:1026', caminho: '/v2/entities' }
    expect(validateProxyRequest({ ...base, servidor: '10.0.0.5:22' }).error).toMatch(
      /portas/,
    )
    expect(
      validateProxyRequest({ ...base, servidor: 'exemplo.com:1026' }).error,
    ).toBeTruthy()
    expect(validateProxyRequest({ ...base, servidor: '999.0.0.1:1026' }).error).toMatch(
      /IP/,
    )
    expect(validateProxyRequest({ ...base, caminho: '/../etc' }).error).toMatch(/Caminho/)
    expect(validateProxyRequest({ ...base, caminho: 'v2' }).error).toMatch(/Caminho/)
    expect(validateProxyRequest({ ...base, metodo: 'TRACE' }).error).toMatch(/Método/)
    expect(validateProxyRequest({}).error).toMatch(/Servidor/)
  })
})

function fakeRequest(body, method = 'POST') {
  const req = new EventEmitter()
  req.method = method
  req.destroy = () => {}
  queueMicrotask(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}
afterEach(() => vi.unstubAllGlobals())

describe('handleFiwareProxy', () => {
  it('encaminha com o fiware-service e devolve o JSON', async () => {
    const fetchMock = vi.fn(async () => new Response('[{"id":"x"}]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    let done
    const result = new Promise((r) => (done = r))
    const res = {
      statusCode: 200,
      setHeader() {},
      end: (payload) => done({ status: res.statusCode, payload }),
    }
    await handleFiwareProxy(
      fakeRequest({
        servidor: '10.0.0.5:1026',
        caminho: '/v2/entities?type=TrafficSensor',
      }),
      res,
    )
    const { status, payload } = await result
    expect(status).toBe(200)
    expect(JSON.parse(payload)).toEqual([{ id: 'x' }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://10.0.0.5:1026/v2/entities?type=TrafficSensor')
    expect(init.headers['fiware-service']).toBe('smart')
    expect(init.headers['fiware-servicepath']).toBe('/')
  })

  it('servidor fora do ar vira 502 com explicação', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new Error('fetch failed'), {
          cause: { code: 'ECONNREFUSED' },
        })
      }),
    )
    let done
    const result = new Promise((r) => (done = r))
    const res = {
      statusCode: 200,
      setHeader() {},
      end: (payload) => done({ status: res.statusCode, payload }),
    }
    await handleFiwareProxy(
      fakeRequest({ servidor: '10.0.0.5:4041', caminho: '/iot/devices' }),
      res,
    )
    const { status, payload } = await result
    expect(status).toBe(502)
    expect(JSON.parse(payload)).toMatchObject({ causa: 'ECONNREFUSED' })
  })
})
