import { decideBotCommand } from '../../../src/game/bots/simpleBot'
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../src/game/rules/actions'
import { applyCommand, createGame, waitingOn } from '../../../src/game/rules/engine'
import { eventsFor, getPlayerView } from '../../../src/game/rules/view'
import type { Command, GameEvent, GameState, PlayerView } from '../../../src/game/types/engine'
import {
  MAX_NAME_LENGTH,
  TIMEOUTS,
  type ClientMessage,
  type DeadlineInfo,
  type LobbyPlayer,
  type RoomInfo,
  type RoomStatus,
  type ServerMessage,
} from '../../../src/game/types/protocol'

/* =====================================================================
 * Lógica de UMA sala, sem nenhuma dependência da Cloudflare.
 * O Durable Object (GameRoom.ts) só faz a ponte: recebe mensagens dos
 * WebSockets, chama estes métodos, entrega as mensagens de volta,
 * salva `data` e agenda o alarme em `nextAlarm()`.
 * Assim tudo aqui pode ser testado com Vitest.
 * ===================================================================== */

export interface RoomPlayer {
  id: string
  name: string
  token: string
  isBot: boolean
  connected: boolean
}

export interface RoomTimer {
  playerId: string
  at: number
  total: number
  /** Etapa da partida em que o timer foi criado; muda de etapa = timer descartado. */
  key: string
}

export interface RoomData {
  code: string
  status: RoomStatus
  hostId: string | null
  players: RoomPlayer[]
  game: GameState | null
  timers: RoomTimer[]
  lastActivity: number
}

/** Mensagem destinada a um jogador (todas as conexões dele recebem). */
export interface Outgoing {
  playerId: string
  msg: ServerMessage
}

const BOT_NAMES = [
  { id: 'bot_marina', name: 'Marina' },
  { id: 'bot_lucas', name: 'Lucas' },
  { id: 'bot_rafael', name: 'Rafael' },
  { id: 'bot_helena', name: 'Helena' },
  { id: 'bot_otavio', name: 'Otávio' },
]

/** Sala sem ninguém conectado é apagada depois deste tempo. */
export const IDLE_CLEANUP_MS = 2 * 60 * 60 * 1000

export function newRoomData(code: string, now: number): RoomData {
  return { code, status: 'lobby', hostId: null, players: [], game: null, timers: [], lastActivity: now }
}

export class RoomLogic {
  data: RoomData
  private readonly random: () => number
  private readonly makeId: () => string

  constructor(data: RoomData, opts: { random?: () => number; makeId?: () => string } = {}) {
    this.data = data
    this.random = opts.random ?? Math.random
    this.makeId = opts.makeId ?? (() => crypto.randomUUID())
  }

  /* ----------------------------- Entrada ----------------------------- */

  join(rawName: string, token: string | undefined, now: number): { ok: true; player: RoomPlayer; out: Outgoing[] } | { ok: false; error: string } {
    const d = this.data
    d.lastActivity = now

    // reconexão: o token prova que é o mesmo jogador
    const existing = token ? d.players.find((p) => !p.isBot && p.token === token) : undefined
    if (existing) {
      existing.connected = true
      if (!d.hostId) d.hostId = existing.id
      this.dropTimersOf(existing.id) // volta aos prazos normais
      return { ok: true, player: existing, out: this.afterChange(now, []) }
    }

    if (d.status !== 'lobby') return { ok: false, error: 'Esta sala já está em partida. Peça para o anfitrião começar uma nova.' }
    if (d.players.length >= MAX_PLAYERS) return { ok: false, error: 'A sala está cheia (máximo de 6 jogadores).' }
    const name = sanitizeName(rawName)
    if (!name) return { ok: false, error: 'Escolha um nome para entrar.' }

    const player: RoomPlayer = { id: `p_${this.makeId().slice(0, 8)}`, name: this.uniqueName(name), token: this.makeId(), isBot: false, connected: true }
    d.players.push(player)
    if (!d.hostId) d.hostId = player.id
    return { ok: true, player, out: this.afterChange(now, []) }
  }

  /** Última conexão do jogador caiu. */
  disconnect(playerId: string, now: number): Outgoing[] {
    const d = this.data
    const p = d.players.find((x) => x.id === playerId)
    if (!p || !p.connected) return []
    d.lastActivity = now
    if (d.status === 'lobby') {
      // na sala de espera, quem cai sai da lista (pode entrar de novo)
      this.removePlayer(playerId)
    } else {
      p.connected = false
      this.dropTimersOf(playerId) // passa a valer o prazo curto de desconectado
    }
    return this.afterChange(now, [])
  }

  /* ----------------------------- Mensagens ---------------------------- */

  message(playerId: string, msg: ClientMessage, now: number): { reply?: ServerMessage; out: Outgoing[] } {
    const d = this.data
    const player = d.players.find((p) => p.id === playerId)
    if (!player) return { reply: { t: 'error', message: 'Você não está nesta sala.', fatal: true }, out: [] }
    d.lastActivity = now
    const isHost = d.hostId === playerId
    const err = (message: string) => ({ reply: { t: 'error', message } as ServerMessage, out: [] })

    switch (msg.t) {
      case 'ping':
        return { reply: { t: 'pong' }, out: [] }

      case 'add_bot': {
        if (!isHost) return err('Só o anfitrião pode adicionar bots.')
        if (d.status !== 'lobby') return err('A partida já começou.')
        if (d.players.length >= MAX_PLAYERS) return err('A sala está cheia.')
        const bot = BOT_NAMES.find((b) => !d.players.some((p) => p.id === b.id))
        if (!bot) return err('Não há mais bots disponíveis.')
        d.players.push({ id: bot.id, name: this.uniqueName(bot.name), token: '', isBot: true, connected: true })
        return { out: this.afterChange(now, []) }
      }

      case 'remove_player': {
        if (!isHost) return err('Só o anfitrião pode remover jogadores.')
        if (d.status !== 'lobby') return err('A partida já começou.')
        const target = d.players.find((p) => p.id === msg.playerId)
        if (!target || !target.isBot) return err('Só é possível remover bots.')
        this.removePlayer(target.id)
        return { out: this.afterChange(now, []) }
      }

      case 'start':
      case 'restart': {
        if (!isHost) return err('Só o anfitrião pode iniciar a partida.')
        if (msg.t === 'start' && d.status !== 'lobby') return err('A partida já começou.')
        if (msg.t === 'restart' && d.status !== 'finished') return err('A partida ainda não terminou.')
        if (msg.t === 'restart') {
          // quem saiu durante a partida não volta para a próxima
          d.players = d.players.filter((p) => p.isBot || p.connected)
        }
        if (d.players.length < MIN_PLAYERS) return err('São necessários pelo menos 2 jogadores (adicione um bot).')
        const { state, events } = createGame(
          d.players.map((p) => ({ id: p.id, name: p.name })),
          Math.floor(this.random() * 0x7fffffff),
        )
        d.game = state
        d.status = 'playing'
        d.timers = []
        return { out: this.afterChange(now, events) }
      }

      case 'command': {
        if (d.status !== 'playing' || !d.game) return err('Não há partida em andamento.')
        const r = applyCommand(d.game, playerId, msg.cmd)
        if (!r.ok) return err(r.error)
        d.game = r.state
        return { out: this.afterChange(now, r.events) }
      }

      case 'leave': {
        if (d.status === 'lobby') this.removePlayer(playerId)
        else {
          player.connected = false
          this.dropTimersOf(playerId)
        }
        return { out: this.afterChange(now, []) }
      }

      case 'join':
        return err('Você já está na sala.')

      default:
        return err('Mensagem desconhecida.')
    }
  }

  /* ------------------------------ Alarme ------------------------------ */

  /** Executa os prazos vencidos: jogadas dos bots e ações automáticas de quem não respondeu. */
  alarm(now: number): Outgoing[] {
    const out: Outgoing[] = []
    for (let guard = 0; guard < 50; guard++) {
      const d = this.data
      if (!d.game || d.status !== 'playing') break
      const due = d.timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      d.timers = d.timers.filter((t) => t !== due)
      if (due.key !== stepKey(d.game) || !waitingOn(d.game).includes(due.playerId)) continue
      const player = d.players.find((p) => p.id === due.playerId)
      const view = getPlayerView(d.game, due.playerId)
      if (!player || !view.prompt) continue
      const cmd = player.isBot ? decideBotCommand(view, this.random) : defaultCommand(view)
      let r = applyCommand(d.game, due.playerId, cmd)
      if (!r.ok) r = applyCommand(d.game, due.playerId, defaultCommand(view)) // nunca deixa a partida travada
      if (!r.ok) continue
      d.game = r.state
      out.push(...this.afterChange(now, r.events))
    }
    return out
  }

  /** Quando o Durable Object deve acordar de novo (null = nunca). */
  nextAlarm(): number | null {
    const d = this.data
    if (d.timers.length) return Math.min(...d.timers.map((t) => t.at))
    return d.lastActivity + IDLE_CLEANUP_MS
  }

  /** A sala pode ser apagada: ninguém conectado há muito tempo. */
  isAbandoned(now: number): boolean {
    const anyone = this.data.players.some((p) => !p.isBot && p.connected)
    return !anyone && now - this.data.lastActivity >= IDLE_CLEANUP_MS
  }

  /* ---------------------------- Mensagens ----------------------------- */

  roomInfo(): RoomInfo {
    const d = this.data
    return {
      code: d.code,
      status: d.status,
      hostId: d.hostId,
      maxPlayers: MAX_PLAYERS,
      players: d.players.map<LobbyPlayer>((p) => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.connected, isHost: p.id === d.hostId })),
    }
  }

  /** Mensagem completa para um jogador (usada também ao reconectar). */
  snapshotFor(playerId: string, events: GameEvent[] = [], now = Date.now()): ServerMessage {
    const d = this.data
    if (!d.game || d.status === 'lobby') return { t: 'room', room: this.roomInfo() }
    // PRIVACIDADE: a visão é calculada por jogador; cartas alheias nunca entram aqui
    const view: PlayerView = getPlayerView(d.game, playerId)
    const timer = d.timers.find((t) => t.playerId === playerId)
    const deadline: DeadlineInfo | null = timer ? { msLeft: Math.max(0, timer.at - now), total: timer.total } : null
    return { t: 'state', room: this.roomInfo(), view, events: eventsFor(events, playerId), deadline }
  }

  /* ---------------------------- Internos ------------------------------ */

  private afterChange(now: number, events: GameEvent[]): Outgoing[] {
    const d = this.data
    if (d.game && d.game.phase.kind === 'game_over') {
      d.status = 'finished'
      d.timers = []
    }
    this.schedule(now)
    return d.players.filter((p) => !p.isBot).map((p) => ({ playerId: p.id, msg: this.snapshotFor(p.id, events, now) }))
  }

  /** Cria prazos para quem a partida está esperando; mantém os que continuam valendo. */
  private schedule(now: number) {
    const d = this.data
    if (!d.game || d.status !== 'playing') {
      d.timers = []
      return
    }
    const key = stepKey(d.game)
    const waiting = waitingOn(d.game)
    d.timers = d.timers.filter((t) => t.key === key && waiting.includes(t.playerId))
    for (const id of waiting) {
      if (d.timers.some((t) => t.playerId === id)) continue
      const p = d.players.find((x) => x.id === id)
      if (!p) continue
      const total = p.isBot ? botDelay(d.game.phase.kind, this.random) : humanTimeout(d.game.phase.kind, p.connected)
      d.timers.push({ playerId: id, at: now + total, total, key })
    }
  }

  private dropTimersOf(playerId: string) {
    this.data.timers = this.data.timers.filter((t) => t.playerId !== playerId)
  }

  private removePlayer(playerId: string) {
    const d = this.data
    d.players = d.players.filter((p) => p.id !== playerId)
    if (d.hostId === playerId) d.hostId = d.players.find((p) => !p.isBot && p.connected)?.id ?? null
    // sem humanos, os bots não ficam sozinhos na sala
    if (!d.players.some((p) => !p.isBot)) d.players = []
  }

  private uniqueName(name: string): string {
    const taken = new Set(this.data.players.map((p) => p.name.toLowerCase()))
    if (!taken.has(name.toLowerCase())) return name
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, MAX_NAME_LENGTH - 2)} ${i}`
      if (!taken.has(candidate.toLowerCase())) return candidate
    }
  }
}

/* ------------------------------ Utilidades ------------------------------ */

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    // eslint-disable-next-line no-control-regex -- remove caracteres de controle de propósito
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

export function stepKey(s: GameState): string {
  const ph = s.phase
  const action = 'action' in ph && ph.action ? `${ph.action.type}>${ph.action.targetId ?? ''}` : ''
  const extra = ph.kind === 'block_challenge_window' ? ph.block.blockerId : ph.kind === 'choosing_influence_loss' ? ph.playerId : ''
  return `${s.turn}:${ph.kind}:${action}:${extra}`
}

function humanTimeout(kind: GameState['phase']['kind'], connected: boolean): number {
  if (!connected) return TIMEOUTS.disconnected
  if (kind === 'awaiting_action') return TIMEOUTS.action
  if (kind === 'choosing_influence_loss' || kind === 'choosing_exchange') return TIMEOUTS.choice
  return TIMEOUTS.response
}

function botDelay(kind: GameState['phase']['kind'], random: () => number): number {
  const r = random()
  if (kind === 'awaiting_action') return 1500 + r * 1100
  if (kind === 'choosing_influence_loss' || kind === 'choosing_exchange') return 1000 + r * 600
  return 900 + r * 1400
}

/** O que acontece quando um humano não decide a tempo: a opção mais neutra. */
export function defaultCommand(view: PlayerView): Command {
  const p = view.prompt
  if (!p) return { type: 'pass' }
  switch (p.kind) {
    case 'choose_action':
      return p.mustCoup ? { type: 'declare_action', action: 'coup', targetId: p.targets[0] } : { type: 'declare_action', action: 'income' }
    case 'respond_action':
    case 'respond_block_window':
    case 'respond_block':
      return { type: 'pass' }
    case 'lose_influence':
      return { type: 'choose_influence', cardId: p.cards[0].id }
    case 'exchange':
      // mantém as cartas que já tinha (elas vêm primeiro na lista)
      return { type: 'exchange_keep', cardIds: p.cards.slice(0, p.keep).map((c) => c.id) }
  }
}

/** Valida o formato de uma mensagem recebida (o conteúdo é validado pelo motor). */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string' || raw.length > 4000) return null
  let m: unknown
  try {
    m = JSON.parse(raw)
  } catch {
    return null
  }
  if (!m || typeof m !== 'object' || typeof (m as { t?: unknown }).t !== 'string') return null
  const msg = m as Record<string, unknown>
  switch (msg.t) {
    case 'join':
      return { t: 'join', name: String(msg.name ?? ''), token: typeof msg.token === 'string' ? msg.token : undefined }
    case 'remove_player':
      return typeof msg.playerId === 'string' ? { t: 'remove_player', playerId: msg.playerId } : null
    case 'command':
      return msg.cmd && typeof msg.cmd === 'object' && typeof (msg.cmd as { type?: unknown }).type === 'string'
        ? { t: 'command', cmd: msg.cmd as Command }
        : null
    case 'start':
    case 'add_bot':
    case 'restart':
    case 'leave':
    case 'ping':
      return { t: msg.t }
    default:
      return null
  }
}
