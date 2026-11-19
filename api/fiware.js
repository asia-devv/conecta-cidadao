import { handleFiwareProxy } from '../server/fiwareProxy.js'

/**
 * Função da Vercel: o mesmo proxy /api/fiware do `npm run dev`, para o app
 * publicado conseguir falar com o Orion e o IoT Agent (o navegador não pode
 * chamá-los direto: outra origem, sem CORS e, em site https, sem http).
 */
export default function handler(req, res) {
  return handleFiwareProxy(req, res)
}

export const config = { maxDuration: 15 }
