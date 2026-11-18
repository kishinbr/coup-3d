import { DurableObject } from 'cloudflare:workers'
import type { ServerMessage } from '../../../src/game/types/protocol'
import type { Env } from '../index'
import { RoomLogic, newRoomData, parseClientMessage, type Outgoing, type RoomData } from './RoomLogic'

/* =====================================================================
 * Durable Object: uma instância por sala (GDD §10.3).
 *
 * - WebSockets com hibernação: a sala "dorme" entre mensagens e não gasta
 *   tempo de CPU parada. Por isso o estado é salvo no storage a cada mudança
 *   e os prazos usam ALARMES (setTimeout não sobrevive à hibernação).
 * - Cada WebSocket guarda o id do jogador no "attachment".
 * - Toda a regra está em RoomLogic; aqui é só infraestrutura.
 * ===================================================================== */

interface Attachment {
  playerId: string | null
}

const STORAGE_KEY = 'room'

export class GameRoom extends DurableObject<Env> {
  private logic: RoomLogic | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      const data = await ctx.storage.get<RoomData>(STORAGE_KEY)
      if (data) this.logic = new RoomLogic(data)
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // criação da sala (chamada pelo Worker)
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.logic) return Response.json({ ok: false }, { status: 409 })
      const { code } = await request.json<{ code: string }>()
      this.logic = new RoomLogic(newRoomData(code, Date.now()))
      await this.persist()
      return Response.json({ ok: true })
    }

    if (url.pathname === '/exists') {
      return Response.json({ exists: !!this.logic, status: this.logic?.data.status ?? null })
    }

    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Esperado WebSocket', { status: 426 })
    if (!this.logic) return new Response('Sala não encontrada', { status: 404 })

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ playerId: null } satisfies Attachment)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const logic = this.logic
    if (!logic) return this.sendTo(ws, { t: 'error', message: 'Sala não encontrada.', fatal: true })
    const msg = parseClientMessage(typeof raw === 'string' ? raw : new TextDecoder().decode(raw))
    if (!msg) return this.sendTo(ws, { t: 'error', message: 'Mensagem inválida.' })
    const now = Date.now()
    const att = (ws.deserializeAttachment() as Attachment | null) ?? { playerId: null }

    if (msg.t === 'join') {
      if (att.playerId) return this.sendTo(ws, { t: 'error', message: 'Você já está na sala.' })
      const res = logic.join(msg.name, msg.token, now)
      if (!res.ok) return this.sendTo(ws, { t: 'error', message: res.error, fatal: true })
      ws.serializeAttachment({ playerId: res.player.id } satisfies Attachment)
      this.sendTo(ws, { t: 'welcome', playerId: res.player.id, token: res.player.token, room: logic.roomInfo() })
      this.deliver(res.out) // inclui o estado completo para quem acabou de entrar
      return this.commit()
    }

    if (!att.playerId) return this.sendTo(ws, { t: 'error', message: 'Entre na sala primeiro.' })
    const { reply, out } = logic.message(att.playerId, msg, now)
    if (reply) this.sendTo(ws, reply)
    this.deliver(out)
    if (msg.t === 'leave') ws.close(1000, 'Saiu da sala')
    if (msg.t !== 'ping') await this.commit()
  }

  async webSocketClose(ws: WebSocket) {
    await this.handleGone(ws)
  }

  async webSocketError(ws: WebSocket) {
    await this.handleGone(ws)
  }

  async alarm() {
    const logic = this.logic
    if (!logic) return
    const now = Date.now()
    if (logic.isAbandoned(now)) {
      // sala vazia há muito tempo: apaga tudo
      this.logic = null
      await this.ctx.storage.deleteAll()
      return
    }
    this.deliver(logic.alarm(now))
    await this.commit()
  }

  /* ------------------------------------------------------------------ */

  private async handleGone(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null
    if (!att?.playerId || !this.logic) return
    // o jogador só "caiu" se não sobrou nenhuma outra conexão dele (outra aba, por exemplo)
    const stillHere = this.ctx.getWebSockets().some((s) => s !== ws && (s.deserializeAttachment() as Attachment | null)?.playerId === att.playerId)
    if (stillHere) return
    this.deliver(this.logic.disconnect(att.playerId, Date.now()))
    await this.commit()
  }

  private deliver(out: Outgoing[]) {
    if (!out.length) return
    const sockets = this.ctx.getWebSockets()
    for (const o of out) {
      const payload = JSON.stringify(o.msg)
      for (const s of sockets) {
        if ((s.deserializeAttachment() as Attachment | null)?.playerId === o.playerId) this.safeSend(s, payload)
      }
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage) {
    this.safeSend(ws, JSON.stringify(msg))
  }

  private safeSend(ws: WebSocket, payload: string) {
    try {
      ws.send(payload)
    } catch {
      /* conexão já fechada */
    }
  }

  private async persist() {
    if (this.logic) await this.ctx.storage.put(STORAGE_KEY, this.logic.data)
  }

  /** Salva o estado e agenda o próximo alarme (prazos, bots ou limpeza). */
  private async commit() {
    if (!this.logic) return
    await this.persist()
    const next = this.logic.nextAlarm()
    if (next === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(Math.max(next, Date.now() + 10))
  }
}
