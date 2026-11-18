import { decideBotCommand } from '../game/bots/simpleBot'
import { applyCommand, createGame, waitingOn } from '../game/rules/engine'
import { eventsFor, getPlayerView } from '../game/rules/view'
import type { Command, GameEvent, GameState, PlayerView } from '../game/types/engine'

/**
 * Partida LOCAL contra bots (Fase 3).
 *
 * Faz o papel que o servidor terá na Fase 4: guarda o estado completo,
 * valida cada comando no motor de regras, decide quem pode responder,
 * controla o tempo das janelas de resposta e entrega a cada participante
 * apenas a sua PlayerView. A interface nunca toca no GameState.
 */

export const HUMAN_ID = 'voce'

/** Adversários disponíveis, cada um ligado a um assento da mesa. */
export const BOT_ROSTER: Record<number, { id: string; name: string }> = {
  1: { id: 'helena', name: 'Helena' },
  2: { id: 'rafael', name: 'Rafael' },
  3: { id: 'marina', name: 'Marina' },
  4: { id: 'lucas', name: 'Lucas' },
  5: { id: 'otavio', name: 'Otávio' },
}

/** Assentos usados conforme a quantidade de adversários (o seu é sempre o 0). */
const SEAT_LAYOUT: Record<number, number[]> = {
  1: [3],
  2: [2, 4],
  3: [2, 3, 4],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
}

/** Tempo para o jogador humano responder a uma contestação ou bloqueio. */
export const RESPONSE_TIME_MS = 15_000

export interface LocalSnapshot {
  view: PlayerView
  /** Eventos novos desde o último snapshot, já filtrados para o jogador humano. */
  events: GameEvent[]
  /** Momento (Date.now) em que a janela de resposta do humano expira. */
  responseDeadline: number | null
  seats: Record<string, number>
}

export interface LocalGameConfig {
  playerName: string
  botCount: number
  seed?: number
}

interface Timer {
  key: string
  handle: ReturnType<typeof setTimeout>
}

export class LocalGame {
  private state: GameState
  private timers = new Map<string, Timer>()
  private deadline: { key: string; at: number; handle: ReturnType<typeof setTimeout> } | null = null
  private disposed = false
  readonly seats: Record<string, number>
  private readonly listener: (snap: LocalSnapshot) => void

  constructor(config: LocalGameConfig, listener: (snap: LocalSnapshot) => void) {
    this.listener = listener
    const botCount = Math.max(1, Math.min(5, Math.round(config.botCount)))
    const seats = SEAT_LAYOUT[botCount]
    const players = [
      { id: HUMAN_ID, name: config.playerName.trim() || 'Você' },
      ...seats.map((seat) => BOT_ROSTER[seat]),
    ]
    this.seats = Object.fromEntries([[HUMAN_ID, 0], ...seats.map((seat) => [BOT_ROSTER[seat].id, seat])])
    const { state, events } = createGame(players, config.seed ?? (Date.now() & 0x7fffffff))
    this.state = state
    this.update(events)
  }

  /** Comando do jogador humano. Devolve a mensagem de erro, se recusado. */
  send(command: Command): string | null {
    return this.apply(HUMAN_ID, command)
  }

  dispose() {
    this.disposed = true
    this.timers.forEach((t) => clearTimeout(t.handle))
    this.timers.clear()
    if (this.deadline) clearTimeout(this.deadline.handle)
    this.deadline = null
  }

  private apply(playerId: string, command: Command): string | null {
    if (this.disposed) return 'A partida foi encerrada'
    const result = applyCommand(this.state, playerId, command)
    if (!result.ok) return result.error
    this.state = result.state
    this.update(result.events)
    return null
  }

  private update(events: GameEvent[]) {
    this.schedule()
    this.listener({
      view: getPlayerView(this.state, HUMAN_ID),
      events: eventsFor(events, HUMAN_ID),
      responseDeadline: this.deadline?.at ?? null,
      seats: this.seats,
    })
  }

  /** Identifica a etapa atual; timers de uma etapa que já passou são descartados. */
  private stepKey(): string {
    const ph = this.state.phase
    const action = 'action' in ph && ph.action ? `${ph.action.type}>${ph.action.targetId ?? ''}` : ''
    const extra = ph.kind === 'block_challenge_window' ? ph.block.blockerId : ph.kind === 'choosing_influence_loss' ? ph.playerId : ''
    return `${this.state.turn}:${ph.kind}:${action}:${extra}`
  }

  private schedule() {
    if (this.disposed) return
    const ph = this.state.phase
    const key = this.stepKey()
    const waiting = ph.kind === 'game_over' ? [] : waitingOn(this.state)

    // bots: mantém o timer de quem ainda está decidindo nesta mesma etapa
    for (const [id, t] of this.timers) {
      if (t.key !== key || !waiting.includes(id)) {
        clearTimeout(t.handle)
        this.timers.delete(id)
      }
    }
    for (const id of waiting) {
      if (id === HUMAN_ID || this.timers.has(id)) continue
      const delay = botDelay(ph.kind)
      const handle = setTimeout(() => {
        this.timers.delete(id)
        const view = getPlayerView(this.state, id)
        if (!view.prompt) return
        const error = this.apply(id, decideBotCommand(view))
        if (error) {
          console.error(`[bot ${id}] comando recusado: ${error}`)
          if (view.prompt.kind !== 'choose_action') this.apply(id, { type: 'pass' })
        }
      }, delay)
      this.timers.set(id, { key, handle })
    }

    // humano: janelas de resposta têm tempo limite; ao expirar, é como clicar em "Permitir"
    const isWindow = ph.kind === 'action_challenge_window' || ph.kind === 'block_window' || ph.kind === 'block_challenge_window'
    const humanWaiting = isWindow && waiting.includes(HUMAN_ID)
    if (this.deadline && (!humanWaiting || this.deadline.key !== key)) {
      clearTimeout(this.deadline.handle)
      this.deadline = null
    }
    if (humanWaiting && !this.deadline) {
      const at = Date.now() + RESPONSE_TIME_MS
      const handle = setTimeout(() => {
        this.deadline = null
        this.apply(HUMAN_ID, { type: 'pass' })
      }, RESPONSE_TIME_MS)
      this.deadline = { key, at, handle }
    }
  }
}

/** Multiplicador das pausas dos bots (útil em testes: VITE_BOT_DELAY_SCALE=0.05). */
const DELAY_SCALE = Number(import.meta.env.VITE_BOT_DELAY_SCALE ?? 1) || 1

/** Pausas dos bots, para que a partida possa ser acompanhada. */
function botDelay(kind: GameState['phase']['kind']): number {
  const r = Math.random()
  let ms: number
  switch (kind) {
    case 'awaiting_action':
      ms = 1500 + r * 1100
      break
    case 'choosing_influence_loss':
    case 'choosing_exchange':
      ms = 1000 + r * 600
      break
    default:
      ms = 900 + r * 1400
  }
  return ms * DELAY_SCALE
}
