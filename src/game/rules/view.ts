import type { ActionOption, GameEvent, GameState, PhaseView, PlayerView, Prompt } from '../types/engine'
import { ACTIONS, ACTION_ORDER, MUST_COUP_AT } from './actions'
import { current, hidden, waitingOn } from './engine'

/**
 * Projeta o estado completo na visão de UM jogador (GDD §11.3).
 * Cartas ocultas de adversários nunca entram aqui: não basta escondê-las na tela,
 * elas não podem estar nos dados que o navegador recebe.
 */
export function getPlayerView(s: GameState, viewerId: string): PlayerView {
  const viewer = s.players.find((p) => p.id === viewerId)
  if (!viewer) throw new Error('Jogador não está nesta partida')
  const ph = s.phase

  const phase: PhaseView = { kind: ph.kind, waitingOn: waitingOn(s) }
  if ('action' in ph && ph.action) phase.action = ph.action
  if (ph.kind === 'block_challenge_window') phase.block = ph.block
  if (ph.kind === 'choosing_influence_loss') phase.lossPlayerId = ph.playerId
  if (ph.kind === 'game_over') phase.winnerId = ph.winnerId

  return {
    viewerId,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      hiddenInfluenceCount: hidden(p).length,
      revealed: p.cards.filter((c) => c.revealed).map((c) => c.influence),
      eliminated: p.eliminated,
    })),
    currentPlayerId: current(s).id,
    courtCount: s.court.length,
    turn: s.turn,
    myCards: viewer.cards.map((c) => ({ ...c })),
    phase,
    prompt: buildPrompt(s, viewerId, phase.waitingOn),
  }
}

function buildPrompt(s: GameState, viewerId: string, waiting: string[]): Prompt | null {
  const viewer = s.players.find((p) => p.id === viewerId)!
  if (viewer.eliminated || !waiting.includes(viewerId)) return null
  const ph = s.phase

  switch (ph.kind) {
    case 'awaiting_action': {
      const mustCoup = viewer.coins >= MUST_COUP_AT
      const targets = s.players.filter((p) => !p.eliminated && p.id !== viewerId).map((p) => p.id)
      const actions: ActionOption[] = ACTION_ORDER.map((type) => {
        const def = ACTIONS[type]
        let reason: string | undefined
        if (mustCoup && type !== 'coup') reason = 'Golpe de Estado obrigatório com 10+ moedas'
        else if (viewer.coins < def.cost) reason = `Requer ${def.cost} moedas`
        return { type, enabled: !reason, reason, needsTarget: def.needsTarget }
      })
      return { kind: 'choose_action', actions, targets, mustCoup }
    }
    case 'action_challenge_window':
      return { kind: 'respond_action', action: ph.action, claim: ACTIONS[ph.action.type].claim!, canChallenge: true }
    case 'block_window':
      return { kind: 'respond_block_window', action: ph.action, blockClaims: ACTIONS[ph.action.type].blockedBy }
    case 'block_challenge_window':
      return { kind: 'respond_block', action: ph.action, block: ph.block }
    case 'choosing_influence_loss':
      return { kind: 'lose_influence', reason: ph.reason, cards: hidden(viewer).map((c) => ({ ...c })) }
    case 'choosing_exchange': {
      const hand = hidden(viewer)
      return { kind: 'exchange', cards: [...hand, ...ph.drawn].map((c) => ({ ...c })), keep: hand.length }
    }
    default:
      return null
  }
}

/** Remove eventos privados de outros jogadores. */
export function eventsFor(events: GameEvent[], viewerId: string): GameEvent[] {
  return events.filter((e) => !('to' in e) || e.to === viewerId)
}
