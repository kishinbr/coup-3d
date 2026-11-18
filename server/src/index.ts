import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, normalizeRoomCode } from '../../src/game/types/protocol'

export { GameRoom } from './rooms/GameRoom'

export interface Env {
  ROOMS: DurableObjectNamespace<import('./rooms/GameRoom').GameRoom>
  ASSETS?: Fetcher
}

/* =====================================================================
 * Worker de entrada.
 *   POST /api/rooms              cria uma sala e devolve o código
 *   GET  /api/rooms/:code        diz se a sala existe
 *   GET  /api/rooms/:code/ws     WebSocket da sala (encaminhado ao Durable Object)
 * O resto (o site) é servido como arquivos estáticos pela própria Cloudflare.
 * ===================================================================== */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 })
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      // tenta alguns códigos até achar um livre
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = randomCode()
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
        const res = await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code }) })
        if (res.ok) return json({ code }, 201)
      }
      return json({ error: 'Não foi possível criar a sala. Tente de novo.' }, 503)
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)(\/ws)?$/)
    if (match) {
      const code = normalizeRoomCode(match[1])
      if (code.length !== ROOM_CODE_LENGTH) return json({ error: 'Código de sala inválido.' }, 400)
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
      if (match[2]) return stub.fetch(request) // WebSocket
      const res = await stub.fetch('https://room/exists')
      return json(await res.json())
    }

    return json({ error: 'Rota desconhecida.' }, 404)
  },
} satisfies ExportedHandler<Env>

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('')
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS })
}
