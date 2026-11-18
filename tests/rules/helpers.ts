import { expect } from 'vitest'
import { applyCommand } from '../../src/game/rules/engine'
import type { Influence } from '../../src/game/types/card'
import type { Command, GameEvent, GameState, InfluenceCard } from '../../src/game/types/engine'

const ALL: Influence[] = ['duque', 'assassino', 'capitao', 'embaixador', 'condessa']

interface PlayerSetup {
  id: string
  cards: Influence[]
  coins?: number
  revealed?: Influence[]
}

/**
 * Monta um estado sob medida para um cenário de teste.
 * A Corte recebe o restante do baralho, para que o total seja sempre 25 cartas.
 */
export function setup(players: PlayerSetup[], opts: { current?: number; courtTop?: Influence[] } = {}): GameState {
  let n = 0
  const card = (influence: Influence, revealed = false): InfluenceCard => ({ id: `t${++n}`, influence, revealed })
  const used: Record<Influence, number> = { duque: 0, assassino: 0, capitao: 0, embaixador: 0, condessa: 0 }
  const states = players.map((p) => {
    const cards = [...p.cards.map((i) => card(i)), ...(p.revealed ?? []).map((i) => card(i, true))]
    cards.forEach((c) => used[c.influence]++)
    return { id: p.id, name: p.id, coins: p.coins ?? 2, cards, eliminated: p.cards.length === 0 }
  })
  const top = opts.courtTop ?? []
  top.forEach((i) => used[i]++)
  const rest: InfluenceCard[] = []
  for (const i of ALL) for (let k = used[i]; k < 5; k++) rest.push(card(i))
  for (const i of ALL) if (used[i] > 5) throw new Error(`Cenário inválido: mais de 5 ${i}`)
  return {
    players: states,
    court: [...top.map((i) => card(i)), ...rest],
    currentPlayerIndex: opts.current ?? 0,
    phase: { kind: 'awaiting_action' },
    turn: 1,
    rng: 42,
  }
}

/** Aplica uma sequência de comandos que DEVEM ser aceitos e devolve o estado final e todos os eventos. */
export function run(state: GameState, ...steps: [string, Command][]): { state: GameState; events: GameEvent[] } {
  let s = state
  const events: GameEvent[] = []
  for (const [player, cmd] of steps) {
    const r = applyCommand(s, player, cmd)
    if (!r.ok) throw new Error(`Comando de ${player} (${cmd.type}) recusado: ${r.error}`)
    s = r.state
    events.push(...r.events)
  }
  return { state: s, events }
}

export function rejects(state: GameState, player: string, cmd: Command): string {
  const r = applyCommand(state, player, cmd)
  expect(r.ok).toBe(false)
  return r.ok ? '' : r.error
}

export function player(s: GameState, id: string) {
  return s.players.find((p) => p.id === id)!
}

export function hiddenOf(s: GameState, id: string): Influence[] {
  return player(s, id)
    .cards.filter((c) => !c.revealed)
    .map((c) => c.influence)
}

export function totalCards(s: GameState): number {
  return s.court.length + s.players.reduce((n, p) => n + p.cards.length, 0)
}

export const PASS: Command = { type: 'pass' }
export const CHALLENGE: Command = { type: 'challenge' }
