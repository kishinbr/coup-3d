import type { Influence } from '../types/card'
import type { ActionType, Command, PlayerView, Prompt } from '../types/engine'
import { ACTIONS } from '../rules/actions'

/**
 * Bot simples para o modo local. Ele recebe só a PlayerView, exatamente como
 * um jogador humano: não enxerga as cartas dos outros.
 * Estratégia: age de acordo com as próprias cartas, blefa de vez em quando e
 * contesta com mais vontade quando muitas cópias da influência já apareceram.
 */

/** Valor de cada influência para decidir o que manter. */
const VALUE: Record<Influence, number> = { duque: 5, capitao: 4, assassino: 3, condessa: 3, embaixador: 2 }

export function decideBotCommand(view: PlayerView, rand: () => number = Math.random): Command {
  const p = view.prompt
  if (!p) throw new Error('O bot foi chamado sem nada para decidir')
  switch (p.kind) {
    case 'choose_action':
      return chooseAction(view, p, rand)
    case 'respond_action':
      return rand() < challengeChance(view, p.claim, p.action.targetId === view.viewerId) ? { type: 'challenge' } : { type: 'pass' }
    case 'respond_block_window':
      return decideBlock(view, p, rand)
    case 'respond_block': {
      const isActor = p.action.actorId === view.viewerId
      const chance = challengeChance(view, p.block.claim, false) * (isActor ? 1.4 : 0.6)
      return rand() < chance ? { type: 'challenge' } : { type: 'pass' }
    }
    case 'lose_influence': {
      const worst = [...p.cards].sort((a, b) => VALUE[a.influence] - VALUE[b.influence])[0]
      return { type: 'choose_influence', cardId: worst.id }
    }
    case 'exchange': {
      const sorted = [...p.cards].sort((a, b) => VALUE[b.influence] - VALUE[a.influence])
      const keep: string[] = []
      const kinds = new Set<Influence>()
      // prefere manter influências diferentes
      for (const c of sorted) {
        if (keep.length < p.keep && !kinds.has(c.influence)) {
          keep.push(c.id)
          kinds.add(c.influence)
        }
      }
      for (const c of sorted) if (keep.length < p.keep && !keep.includes(c.id)) keep.push(c.id)
      return { type: 'exchange_keep', cardIds: keep }
    }
  }
}

function chooseAction(view: PlayerView, p: Extract<Prompt, { kind: 'choose_action' }>, rand: () => number): Command {
  const me = view.players.find((x) => x.id === view.viewerId)!
  const mine = new Set(view.myCards.filter((c) => !c.revealed).map((c) => c.influence))
  const enabled = new Set(p.actions.filter((a) => a.enabled).map((a) => a.type))
  const opponents = view.players.filter((x) => !x.eliminated && x.id !== me.id)
  // alvo preferido: quem tem mais influências, desempatando por moedas
  const strongest = [...opponents].sort((a, b) => b.hiddenInfluenceCount - a.hiddenInfluenceCount || b.coins - a.coins)[0]
  const richest = [...opponents].sort((a, b) => b.coins - a.coins)[0]
  const act = (type: ActionType, targetId?: string): Command => ({ type: 'declare_action', action: type, targetId })

  if (p.mustCoup || (enabled.has('coup') && rand() < 0.9)) return act('coup', strongest.id)
  if (mine.has('assassino') && enabled.has('assassinate') && rand() < 0.75) return act('assassinate', strongest.id)
  if (mine.has('duque') && rand() < 0.85) return act('tax')
  if (mine.has('capitao') && richest.coins >= 2 && rand() < 0.75) return act('steal', richest.id)
  if (mine.has('embaixador') && rand() < 0.3) return act('exchange')

  // blefes ocasionais
  const roll = rand()
  if (roll < 0.12) return act('tax')
  if (roll < 0.17 && richest.coins >= 2) return act('steal', richest.id)
  if (roll < 0.2 && enabled.has('assassinate')) return act('assassinate', strongest.id)
  return rand() < 0.55 ? act('foreign_aid') : act('income')
}

function decideBlock(view: PlayerView, p: Extract<Prompt, { kind: 'respond_block_window' }>, rand: () => number): Command {
  const mine = view.myCards.filter((c) => !c.revealed).map((c) => c.influence)
  const real = p.blockClaims.find((c) => mine.includes(c))
  if (real) return { type: 'block', claim: real }
  const me = view.players.find((x) => x.id === view.viewerId)!
  const isTarget = p.action.targetId === view.viewerId
  // à beira da eliminação por assassinato, blefar a Condessa é a melhor aposta
  let bluff = 0.08
  if (p.action.type === 'assassinate' && isTarget) bluff = me.hiddenInfluenceCount === 1 ? 0.65 : 0.3
  if (p.action.type === 'steal' && isTarget) bluff = 0.18
  if (p.action.type === 'foreign_aid') bluff = 0.06
  return rand() < bluff ? { type: 'block', claim: p.blockClaims[Math.floor(rand() * p.blockClaims.length)] } : { type: 'pass' }
}

/** Quanto mais cópias da influência já estão visíveis para mim, mais provável que seja blefe. */
function challengeChance(view: PlayerView, claim: Influence, iAmTarget: boolean): number {
  const known =
    view.players.reduce((n, pl) => n + pl.revealed.filter((i) => i === claim).length, 0) +
    view.myCards.filter((c) => !c.revealed && c.influence === claim).length
  const table = [0.08, 0.12, 0.25, 0.55, 0.9, 1]
  let chance = table[Math.min(known, 5)]
  const me = view.players.find((x) => x.id === view.viewerId)!
  if (iAmTarget && me.hiddenInfluenceCount === 1) chance += 0.25
  return Math.min(1, chance)
}

/** Usado pela interface para nomear a influência declarada por uma ação. */
export function claimOf(type: ActionType): Influence | null {
  return ACTIONS[type].claim
}
