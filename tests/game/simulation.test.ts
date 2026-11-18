import { describe, expect, it } from 'vitest'
import { applyCommand, createGame, waitingOn } from '../../src/game/rules/engine'
import { getPlayerView } from '../../src/game/rules/view'
import { decideBotCommand } from '../../src/game/bots/simpleBot'
import type { Command, GameState, PlayerView } from '../../src/game/types/engine'

/**
 * Teste de robustez: milhares de partidas com jogadas aleatórias (mas legais)
 * e com os bots. A cada passo, verifica as invariantes do jogo.
 */

function mulberry(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Escolhe qualquer comando permitido pelo prompt, ao acaso. */
function randomCommand(view: PlayerView, rand: () => number): Command {
  const p = view.prompt!
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  switch (p.kind) {
    case 'choose_action': {
      const a = pick(p.actions.filter((x) => x.enabled))
      return { type: 'declare_action', action: a.type, targetId: a.needsTarget ? pick(p.targets) : undefined }
    }
    case 'respond_action':
    case 'respond_block':
      return rand() < 0.3 ? { type: 'challenge' } : { type: 'pass' }
    case 'respond_block_window':
      return rand() < 0.4 ? { type: 'block', claim: pick(p.blockClaims) } : { type: 'pass' }
    case 'lose_influence':
      return { type: 'choose_influence', cardId: pick(p.cards).id }
    case 'exchange': {
      const ids = p.cards.map((c) => c.id).sort(() => rand() - 0.5)
      return { type: 'exchange_keep', cardIds: ids.slice(0, p.keep) }
    }
  }
}

function checkInvariants(s: GameState) {
  // durante a troca do Embaixador, as cartas compradas ficam "em mãos" fora da Corte
  const drawn = s.phase.kind === 'choosing_exchange' ? s.phase.drawn : []
  const total = s.court.length + drawn.length + s.players.reduce((n, p) => n + p.cards.length, 0)
  expect(total).toBe(25)
  for (const p of s.players) {
    expect(p.coins).toBeGreaterThanOrEqual(0)
    expect(p.cards.length).toBe(2)
    expect(p.eliminated).toBe(p.cards.every((c) => c.revealed))
  }
  const counts: Record<string, number> = {}
  for (const c of [...s.court, ...drawn, ...s.players.flatMap((p) => p.cards)]) counts[c.influence] = (counts[c.influence] ?? 0) + 1
  expect(Object.values(counts)).toEqual([5, 5, 5, 5, 5])
  if (s.phase.kind !== 'game_over') {
    expect(waitingOn(s).length).toBeGreaterThan(0)
    expect(s.players[s.currentPlayerIndex].eliminated && s.phase.kind === 'awaiting_action').toBe(false)
  }
}

function playGame(seed: number, playerCount: number, chooser: (v: PlayerView, rand: () => number) => Command) {
  const rand = mulberry(seed * 31 + 7)
  let { state } = createGame(
    Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
    seed,
  )
  let steps = 0
  while (state.phase.kind !== 'game_over') {
    if (++steps > 3000) throw new Error(`Partida ${seed} não terminou`)
    const waiting = waitingOn(state)
    const who = waiting[Math.floor(rand() * waiting.length)]
    const view = getPlayerView(state, who)
    expect(view.prompt).not.toBeNull()
    const cmd = chooser(view, rand)
    const r = applyCommand(state, who, cmd)
    if (!r.ok) throw new Error(`Seed ${seed}: comando recusado (${cmd.type}): ${r.error}`)
    state = r.state
    checkInvariants(state)
  }
  const alive = state.players.filter((p) => !p.eliminated)
  expect(alive).toHaveLength(1)
  return steps
}

describe('simulação de partidas', () => {
  it('1000 partidas com jogadas aleatórias terminam sem violar as regras', () => {
    for (let seed = 1; seed <= 1000; seed++) playGame(seed, 2 + (seed % 5), randomCommand)
  }, 60_000)

  it('300 partidas só de bots terminam sem comandos recusados', () => {
    for (let seed = 1; seed <= 300; seed++) playGame(seed, 2 + (seed % 5), (v, r) => decideBotCommand(v, r))
  }, 60_000)
})
