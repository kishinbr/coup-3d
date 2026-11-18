import type { Command } from '../game/types/engine'
import type { ClientMessage, ServerMessage } from '../game/types/protocol'

/**
 * Conexão do navegador com uma sala online.
 * Reconecta sozinha (com espera crescente) e usa o token salvo para
 * voltar ao mesmo lugar na mesa (GDD §14, Fase 4: reconexão).
 */

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

/** Endereço do servidor. Vazio = mesmo endereço do site (Cloudflare servindo os dois). */
const SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') ?? ''

function httpBase(): string {
  return SERVER || window.location.origin
}

function wsUrl(code: string): string {
  const base = new URL(httpBase())
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = `/api/rooms/${code}/ws`
  return base.toString()
}

export async function createRoom(): Promise<string> {
  const res = await fetch(`${httpBase()}/api/rooms`, { method: 'POST' })
  if (!res.ok) throw new Error('Não foi possível criar a sala. O servidor está no ar?')
  const { code } = (await res.json()) as { code: string }
  return code
}

export async function roomExists(code: string): Promise<boolean> {
  const res = await fetch(`${httpBase()}/api/rooms/${code}`)
  if (!res.ok) return false
  const body = (await res.json()) as { exists: boolean }
  return body.exists
}

/* ----------------------- sessão salva (reconexão) ----------------------- */

export interface SavedSession {
  code: string
  token: string
  name: string
}

// sessionStorage: sobrevive a recarregar a página, mas cada aba é um jogador
// (dá para testar com duas abas no mesmo navegador)
const SESSION_KEY = 'coup3d:session'

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SavedSession) : null
  } catch {
    return null
  }
}

export function saveSession(s: SavedSession | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* armazenamento indisponível: só não reconecta após recarregar */
  }
}

/* ------------------------------- conexão -------------------------------- */

interface Handlers {
  onMessage: (msg: ServerMessage) => void
  onStatus: (status: ConnectionStatus) => void
  /** Erro que impede continuar (sala não existe, partida em andamento...). */
  onFatal: (message: string) => void
}

export class OnlineRoom {
  readonly code: string
  private name: string
  private token: string | null
  private ws: WebSocket | null = null
  private attempts = 0
  private closedByUser = false
  private joined = false
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private pingTimer: ReturnType<typeof setInterval> | undefined
  private readonly handlers: Handlers

  constructor(code: string, name: string, token: string | null, handlers: Handlers) {
    this.code = code
    this.name = name
    this.token = token
    this.handlers = handlers
    this.connect()
  }

  command(cmd: Command) {
    this.send({ t: 'command', cmd })
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  /** Sai de vez da sala (não tenta reconectar). */
  leave() {
    this.send({ t: 'leave' })
    this.dispose()
  }

  dispose() {
    this.closedByUser = true
    clearTimeout(this.retryTimer)
    clearInterval(this.pingTimer)
    this.ws?.close()
    this.ws = null
    this.handlers.onStatus('closed')
  }

  private connect() {
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const ws = new WebSocket(wsUrl(this.code))
    this.ws = ws
    this.joined = false

    ws.onopen = () => {
      ws.send(JSON.stringify({ t: 'join', name: this.name, token: this.token ?? undefined } satisfies ClientMessage))
      clearInterval(this.pingTimer)
      // mantém a conexão viva em redes que derrubam sockets parados
      this.pingTimer = setInterval(() => this.send({ t: 'ping' }), 25_000)
    }

    ws.onmessage = (e) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(e.data as string) as ServerMessage
      } catch {
        return
      }
      if (msg.t === 'welcome') {
        this.joined = true
        this.attempts = 0
        this.token = msg.token
        saveSession({ code: this.code, token: msg.token, name: this.name })
        this.handlers.onStatus('open')
      }
      if (msg.t === 'error' && msg.fatal) {
        this.closedByUser = true
        saveSession(null)
        this.handlers.onFatal(msg.message)
        ws.close()
        return
      }
      if (msg.t !== 'pong') this.handlers.onMessage(msg)
    }

    ws.onclose = () => {
      clearInterval(this.pingTimer)
      if (this.closedByUser) return
      // nunca entrou e a conexão caiu de primeira: a sala provavelmente não existe
      if (!this.joined && this.attempts >= 3) {
        this.handlers.onFatal('Não foi possível conectar à sala. Verifique o código e se o servidor está no ar.')
        return
      }
      this.attempts++
      const delay = Math.min(10_000, 500 * 2 ** Math.min(this.attempts, 5))
      this.handlers.onStatus('reconnecting')
      this.retryTimer = setTimeout(() => this.connect(), delay)
    }
  }
}
