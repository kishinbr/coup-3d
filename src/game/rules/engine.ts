import { COPIES_PER_INFLUENCE } from '../constants/influences'
import type { Influence } from '../types/card'
import type {
  ActionType,
  Command,
  CommandResult,
  Continuation,
  DeclaredAction,
  GameEvent,
  GameState,
  InfluenceCard,
  LossReason,
  Phase,
  PlayerState,
} from '../types/engine'
import { ACTIONS, MAX_PLAYERS, MIN_PLAYERS, MUST_COUP_AT, STARTING_COINS } from './actions'
import { randomInt, shuffle } from './random'

/* =====================================================================
 * Motor de regras do Coup (edição base).
 *
 * Funções puras: recebem um estado e devolvem um NOVO estado mais a lista
 * de eventos. Nada aqui depende de tela, rede ou tempo, então o mesmo código
 * roda nos testes, no modo local e, na Fase 4, no servidor.
 *
 * Fluxo de uma ação (GDD §3, §4, §8.5):
 *   declarar → janela de contestação da ação (se declara influência)
 *            → janela de bloqueio (se bloqueável)
 *            → janela de contestação do bloqueio
 *            → resolução → próximo turno
 * Perdas de influência interrompem o fluxo até o jogador escolher a carta.
 * ===================================================================== */

const ALL_INFLUENCES: Influence[] = ['duque', 'assassino', 'capitao', 'embaixador', 'condessa']

interface Ctx {
  s: GameState
  events: GameEvent[]
}

/* ---------------------------- Criação ---------------------------- */

export function createGame(
  players: { id: string; name: string }[],
  seed: number,
): { state: GameState; events: GameEvent[] } {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Uma partida precisa de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores`)
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error('IDs de jogador repetidos')

  let n = 0
  const deck: InfluenceCard[] = []
  for (const influence of ALL_INFLUENCES) {
    for (let i = 0; i < COPIES_PER_INFLUENCE; i++) deck.push({ id: `c${++n}`, influence, revealed: false })
  }
  let [court, rng] = shuffle(deck, seed | 0)
  const states: PlayerState[] = players.map((p) => {
    const cards = court.slice(0, 2)
    court = court.slice(2)
    return { id: p.id, name: p.name, coins: STARTING_COINS, cards, eliminated: false }
  })
  let first: number
  ;[first, rng] = randomInt(states.length, rng)

  const state: GameState = { players: states, court, currentPlayerIndex: first, phase: { kind: 'awaiting_action' }, turn: 1, rng }
  return {
    state,
    events: [
      { type: 'GAME_STARTED', playerIds: states.map((p) => p.id) },
      { type: 'TURN_STARTED', playerId: states[first].id, turn: 1, mustCoup: false },
    ],
  }
}

/* --------------------------- Comandos ---------------------------- */

export function applyCommand(state: GameState, playerId: string, command: Command): CommandResult {
  if (state.phase.kind === 'game_over') return fail('A partida já terminou')
  const ctx: Ctx = { s: structuredClone(state), events: [] }
  const player = ctx.s.players.find((p) => p.id === playerId)
  if (!player) return fail('Jogador não está nesta partida')
  if (player.eliminated) return fail('Jogadores eliminados não podem agir')

  let error: string | undefined
  switch (command.type) {
    case 'declare_action':
      error = declareAction(ctx, player, command.action, command.targetId)
      break
    case 'challenge':
      error = challenge(ctx, player)
      break
    case 'block':
      error = block(ctx, player, command.claim)
      break
    case 'pass':
      error = pass(ctx, player)
      break
    case 'choose_influence':
      error = chooseInfluence(ctx, player, command.cardId)
      break
    case 'exchange_keep':
      error = exchangeKeep(ctx, player, command.cardIds)
      break
    default:
      error = 'Comando desconhecido'
  }
  if (error) return fail(error)
  return { ok: true, state: ctx.s, events: ctx.events }
}

function fail(error: string): CommandResult {
  return { ok: false, error }
}

function declareAction(ctx: Ctx, player: PlayerState, type: ActionType, targetId?: string): string | undefined {
  const s = ctx.s
  if (s.phase.kind !== 'awaiting_action') return 'Agora não é momento de declarar uma ação'
  if (current(s).id !== player.id) return 'Não é a sua vez'
  const def = ACTIONS[type]
  if (!def) return 'Ação desconhecida'
  if (player.coins >= MUST_COUP_AT && type !== 'coup') return 'Com 10 ou mais moedas, o Golpe de Estado é obrigatório'
  if (player.coins < def.cost) return `${def.label} requer ${def.cost} moedas`

  let target: PlayerState | undefined
  if (def.needsTarget) {
    target = s.players.find((p) => p.id === targetId)
    if (!target) return 'Escolha um alvo'
    if (target.id === player.id) return 'Você não pode escolher a si mesmo'
    if (target.eliminated) return 'Esse jogador já foi eliminado'
  }

  if (def.cost > 0) {
    player.coins -= def.cost
    ctx.events.push({ type: 'COINS_CHANGED', playerId: player.id, delta: -def.cost, reason: type })
  }
  const action: DeclaredAction = { type, actorId: player.id, ...(target ? { targetId: target.id } : {}) }
  ctx.events.push({ type: 'ACTION_DECLARED', action, claim: def.claim })

  if (type === 'income') return resolveAction(ctx, action)
  if (type === 'coup') return startLoss(ctx, target!.id, 'coup', action, 'end_turn')
  if (def.claim === null) return openBlockWindow(ctx, action) // Ajuda Externa
  s.phase = { kind: 'action_challenge_window', action, responded: [] }
  return closeWindowIfDone(ctx)
}

function challenge(ctx: Ctx, player: PlayerState): string | undefined {
  const ph = ctx.s.phase
  if (ph.kind === 'action_challenge_window') {
    if (!canRespond(ctx.s, player.id)) return 'Você não pode contestar agora'
    return resolveChallenge(ctx, ph.action, ph.action.actorId, ACTIONS[ph.action.type].claim!, player.id, 'action')
  }
  if (ph.kind === 'block_challenge_window') {
    if (!canRespond(ctx.s, player.id)) return 'Você não pode contestar agora'
    return resolveChallenge(ctx, ph.action, ph.block.blockerId, ph.block.claim, player.id, 'block')
  }
  return 'Não há nada para contestar agora'
}

function block(ctx: Ctx, player: PlayerState, claim: Influence): string | undefined {
  const ph = ctx.s.phase
  if (ph.kind !== 'block_window') return 'Não há nada para bloquear agora'
  if (!canRespond(ctx.s, player.id)) return 'Você não pode bloquear esta ação'
  if (!ACTIONS[ph.action.type].blockedBy.includes(claim)) return 'Essa influência não bloqueia esta ação'
  const blockDecl = { blockerId: player.id, claim }
  ctx.events.push({ type: 'BLOCK_DECLARED', block: blockDecl, action: ph.action })
  ctx.s.phase = { kind: 'block_challenge_window', action: ph.action, block: blockDecl, responded: [] }
  return closeWindowIfDone(ctx)
}

function pass(ctx: Ctx, player: PlayerState): string | undefined {
  const ph = ctx.s.phase
  if (ph.kind !== 'action_challenge_window' && ph.kind !== 'block_window' && ph.kind !== 'block_challenge_window') {
    return 'Não há nada a permitir agora'
  }
  if (!canRespond(ctx.s, player.id)) return 'Você já respondeu ou não participa desta etapa'
  ph.responded.push(player.id)
  ctx.events.push({ type: 'PASSED', playerId: player.id })
  return closeWindowIfDone(ctx)
}

function chooseInfluence(ctx: Ctx, player: PlayerState, cardId: string): string | undefined {
  const ph = ctx.s.phase
  if (ph.kind !== 'choosing_influence_loss' || ph.playerId !== player.id) return 'Você não precisa perder uma influência agora'
  const card = player.cards.find((c) => c.id === cardId && !c.revealed)
  if (!card) return 'Escolha uma das suas cartas ocultas'
  loseCard(ctx, player, card, ph.reason)
  return afterLoss(ctx, ph.next, ph.action)
}

function exchangeKeep(ctx: Ctx, player: PlayerState, cardIds: string[]): string | undefined {
  const s = ctx.s
  const ph = s.phase
  if (ph.kind !== 'choosing_exchange' || ph.action.actorId !== player.id) return 'Você não está trocando cartas agora'
  const hand = hidden(player)
  const pool = [...hand, ...ph.drawn]
  const keep = hand.length
  const ids = new Set(cardIds)
  if (ids.size !== cardIds.length) return 'Carta repetida na escolha'
  if (ids.size !== keep) return `Escolha exatamente ${keep} carta${keep > 1 ? 's' : ''}`
  if (!cardIds.every((id) => pool.some((c) => c.id === id))) return 'Escolha apenas entre as suas cartas e as compradas'

  const kept = pool.filter((c) => ids.has(c.id))
  const returned = pool.filter((c) => !ids.has(c.id))
  player.cards = [...player.cards.filter((c) => c.revealed), ...kept]
  ;[s.court, s.rng] = shuffle([...s.court, ...returned], s.rng)
  ctx.events.push({ type: 'EXCHANGE_COMPLETED', playerId: player.id }, { type: 'ACTION_RESOLVED', action: ph.action })
  return endTurn(ctx)
}

/* -------------------------- Contestação -------------------------- */

function resolveChallenge(
  ctx: Ctx,
  action: DeclaredAction,
  claimantId: string,
  claim: Influence,
  challengerId: string,
  target: 'action' | 'block',
): string | undefined {
  const s = ctx.s
  const claimant = byId(s, claimantId)
  ctx.events.push({ type: 'CHALLENGE_DECLARED', challengerId, claimantId, claim })
  const card = hidden(claimant).find((c) => c.influence === claim)

  if (card) {
    // A declaração era verdadeira: revela, devolve à Corte, embaralha e compra outra (GDD §4.1, caso A)
    ctx.events.push({ type: 'CHALLENGE_RESOLVED', challengerId, claimantId, claim, claimWasTrue: true })
    claimant.cards = claimant.cards.filter((c) => c.id !== card.id)
    ;[s.court, s.rng] = shuffle([...s.court, { ...card, revealed: false }], s.rng)
    const drawn = s.court.shift()!
    claimant.cards.push(drawn)
    ctx.events.push({ type: 'CARD_REPLACED', playerId: claimant.id }, { type: 'CARD_DRAWN_PRIVATE', to: claimant.id, influence: drawn.influence })
    if (target === 'block') {
      const ph = s.phase as Extract<Phase, { kind: 'block_challenge_window' }>
      ctx.events.push({ type: 'ACTION_BLOCKED', action, block: ph.block })
    }
    // quem contestou perde uma influência; a ação continua (ou o bloqueio se mantém)
    return startLoss(ctx, challengerId, 'lost_challenge', action, target === 'action' ? 'open_block_window' : 'end_turn')
  }

  // Blefe descoberto (GDD §4.1, caso B): a carta declarada não é revelada, pois não existe
  ctx.events.push({ type: 'CHALLENGE_RESOLVED', challengerId, claimantId, claim, claimWasTrue: false })
  if (target === 'action') {
    ctx.events.push({ type: 'ACTION_CANCELLED', action })
    return startLoss(ctx, claimantId, 'caught_bluffing', action, 'end_turn')
  }
  return startLoss(ctx, claimantId, 'caught_bluffing', action, 'resolve_action')
}

/* ---------------------- Janelas de resposta ---------------------- */

/** Quem pode responder na janela atual (antes de descontar quem já respondeu). */
export function windowResponders(s: GameState): string[] {
  const ph = s.phase
  const alive = s.players.filter((p) => !p.eliminated).map((p) => p.id)
  switch (ph.kind) {
    case 'action_challenge_window':
      return alive.filter((id) => id !== ph.action.actorId)
    case 'block_window': {
      const def = ACTIONS[ph.action.type]
      if (def.blockers === 'anyone') return alive.filter((id) => id !== ph.action.actorId)
      if (def.blockers === 'target' && ph.action.targetId && alive.includes(ph.action.targetId)) return [ph.action.targetId]
      return []
    }
    case 'block_challenge_window':
      return alive.filter((id) => id !== ph.block.blockerId)
    default:
      return []
  }
}

/** Quem a partida está esperando agora (GDD §4.2: o servidor decide quem pode responder). */
export function waitingOn(s: GameState): string[] {
  const ph = s.phase
  switch (ph.kind) {
    case 'awaiting_action':
      return [current(s).id]
    case 'action_challenge_window':
    case 'block_window':
    case 'block_challenge_window':
      return windowResponders(s).filter((id) => !ph.responded.includes(id))
    case 'choosing_influence_loss':
      return [ph.playerId]
    case 'choosing_exchange':
      return [ph.action.actorId]
    case 'game_over':
      return []
  }
}

function canRespond(s: GameState, playerId: string): boolean {
  const ph = s.phase
  if (ph.kind !== 'action_challenge_window' && ph.kind !== 'block_window' && ph.kind !== 'block_challenge_window') return false
  return windowResponders(s).includes(playerId) && !ph.responded.includes(playerId)
}

function closeWindowIfDone(ctx: Ctx): string | undefined {
  const s = ctx.s
  const ph = s.phase
  if (ph.kind !== 'action_challenge_window' && ph.kind !== 'block_window' && ph.kind !== 'block_challenge_window') return
  if (waitingOn(s).length > 0) return
  if (ph.kind === 'action_challenge_window') return openBlockWindow(ctx, ph.action)
  if (ph.kind === 'block_window') return resolveAction(ctx, ph.action)
  // ninguém contestou o bloqueio: ele se mantém
  ctx.events.push({ type: 'ACTION_BLOCKED', action: ph.action, block: ph.block })
  return endTurn(ctx)
}

function openBlockWindow(ctx: Ctx, action: DeclaredAction): string | undefined {
  if (ACTIONS[action.type].blockers === 'none') return resolveAction(ctx, action)
  ctx.s.phase = { kind: 'block_window', action, responded: [] }
  if (windowResponders(ctx.s).length === 0) return resolveAction(ctx, action)
  return
}

/* --------------------------- Resolução --------------------------- */

function resolveAction(ctx: Ctx, action: DeclaredAction): string | undefined {
  const s = ctx.s
  const actor = byId(s, action.actorId)
  const gain = (amount: number) => {
    actor.coins += amount
    ctx.events.push({ type: 'COINS_CHANGED', playerId: actor.id, delta: amount, reason: action.type })
  }
  switch (action.type) {
    case 'income':
      gain(1)
      break
    case 'foreign_aid':
      gain(2)
      break
    case 'tax':
      gain(3)
      break
    case 'steal': {
      const target = byId(s, action.targetId!)
      const amount = Math.min(2, target.coins)
      if (amount > 0) {
        target.coins -= amount
        actor.coins += amount
        ctx.events.push({ type: 'COINS_TRANSFERRED', fromId: target.id, toId: actor.id, amount })
      }
      break
    }
    case 'assassinate':
      ctx.events.push({ type: 'ACTION_RESOLVED', action })
      return startLoss(ctx, action.targetId!, 'assassinated', action, 'end_turn')
    case 'exchange': {
      const drawn = s.court.splice(0, Math.min(2, s.court.length))
      for (const c of drawn) ctx.events.push({ type: 'CARD_DRAWN_PRIVATE', to: actor.id, influence: c.influence })
      s.phase = { kind: 'choosing_exchange', action, drawn }
      return
    }
    case 'coup':
      break // resolvido na declaração
  }
  ctx.events.push({ type: 'ACTION_RESOLVED', action })
  return endTurn(ctx)
}

/* ---------------------- Perda de influência ---------------------- */

function startLoss(ctx: Ctx, playerId: string, reason: LossReason, action: DeclaredAction | null, next: Continuation): string | undefined {
  const player = byId(ctx.s, playerId)
  const cards = hidden(player)
  if (cards.length === 0) return runContinuation(ctx, next, action) // já eliminado
  if (cards.length === 1) {
    // com uma única influência não há escolha (GDD §4.3)
    loseCard(ctx, player, cards[0], reason)
    return afterLoss(ctx, next, action)
  }
  ctx.s.phase = { kind: 'choosing_influence_loss', playerId, reason, action, next }
  return
}

function loseCard(ctx: Ctx, player: PlayerState, card: InfluenceCard, reason: LossReason) {
  card.revealed = true
  ctx.events.push({ type: 'INFLUENCE_LOST', playerId: player.id, influence: card.influence, reason })
  if (hidden(player).length === 0) {
    player.eliminated = true
    ctx.events.push({ type: 'PLAYER_ELIMINATED', playerId: player.id })
  }
}

function afterLoss(ctx: Ctx, next: Continuation, action: DeclaredAction | null): string | undefined {
  if (checkVictory(ctx)) return
  return runContinuation(ctx, next, action)
}

function runContinuation(ctx: Ctx, next: Continuation, action: DeclaredAction | null): string | undefined {
  if (checkVictory(ctx)) return
  if (next === 'end_turn' || !action) return endTurn(ctx)
  if (next === 'open_block_window') return openBlockWindow(ctx, action)
  return resolveAction(ctx, action)
}

/* ----------------------- Turno e vitória ------------------------- */

function checkVictory(ctx: Ctx): boolean {
  const alive = ctx.s.players.filter((p) => !p.eliminated)
  if (alive.length !== 1) return false
  if (ctx.s.phase.kind !== 'game_over') {
    ctx.s.phase = { kind: 'game_over', winnerId: alive[0].id }
    ctx.events.push({ type: 'GAME_FINISHED', winnerId: alive[0].id })
  }
  return true
}

function endTurn(ctx: Ctx): string | undefined {
  if (checkVictory(ctx)) return
  const s = ctx.s
  const n = s.players.length
  let i = s.currentPlayerIndex
  do {
    i = (i + 1) % n
  } while (s.players[i].eliminated)
  s.currentPlayerIndex = i
  s.turn += 1
  s.phase = { kind: 'awaiting_action' }
  const p = s.players[i]
  ctx.events.push({ type: 'TURN_STARTED', playerId: p.id, turn: s.turn, mustCoup: p.coins >= MUST_COUP_AT })
  return
}

/* --------------------------- Utilidades -------------------------- */

export function current(s: GameState): PlayerState {
  return s.players[s.currentPlayerIndex]
}

export function hidden(p: PlayerState): InfluenceCard[] {
  return p.cards.filter((c) => !c.revealed)
}

function byId(s: GameState, id: string): PlayerState {
  const p = s.players.find((x) => x.id === id)
  if (!p) throw new Error(`Jogador ${id} não encontrado`)
  return p
}
