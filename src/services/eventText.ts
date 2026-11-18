import { ACTIONS } from '../game/rules/actions'
import { INFLUENCES } from '../game/constants/influences'
import type { Influence } from '../game/types/card'
import type { DeclaredAction, GameEvent } from '../game/types/engine'
import type { LogEntry } from '../game/types/game'

/** Textos em português para o registro da partida. */

export const influenceName = (i: Influence) => INFLUENCES[i].name

/** "o Duque", "a Condessa"... */
export function withArticle(i: Influence): string {
  return `${i === 'condessa' ? 'a' : 'o'} ${influenceName(i)}`
}

/** "Você" no meio da frase vira "você". */
const obj = (n: string) => (n === 'Você' ? 'você' : n)

export function describeAction(action: DeclaredAction, name: (id: string) => string): string {
  const actor = name(action.actorId)
  const target = action.targetId ? obj(name(action.targetId)) : ''
  switch (action.type) {
    case 'income':
      return `${actor} pegou Renda`
    case 'foreign_aid':
      return `${actor} pediu Ajuda Externa`
    case 'coup':
      return `${actor} deu um Golpe de Estado em ${target}`
    case 'tax':
      return `${actor} declarou Taxar com o Duque`
    case 'assassinate':
      return `${actor} quer assassinar ${target} com o Assassino`
    case 'steal':
      return `${actor} quer roubar ${target} com o Capitão`
    case 'exchange':
      return `${actor} quer trocar cartas com o Embaixador`
  }
}

let seq = 0

export function eventToLog(e: GameEvent, name: (id: string) => string, viewerId: string): LogEntry | null {
  const id = `e${++seq}`
  const entry = (kind: LogEntry['kind'], text: string): LogEntry => ({ id, kind, text })
  switch (e.type) {
    case 'GAME_STARTED':
      return entry('info', 'A partida começou. Cada jogador tem 2 moedas e 2 influências.')
    case 'TURN_STARTED':
      return e.mustCoup ? entry('info', `${name(e.playerId)} tem 10+ moedas: Golpe de Estado obrigatório`) : null
    case 'ACTION_DECLARED':
      return entry('action', describeAction(e.action, name))
    case 'COINS_CHANGED':
      if (e.delta > 0) return entry('coins', `${name(e.playerId)} recebeu ${e.delta} moeda${e.delta > 1 ? 's' : ''}`)
      return null
    case 'COINS_TRANSFERRED':
      return entry('coins', `${name(e.toId)} roubou ${e.amount} moeda${e.amount > 1 ? 's' : ''} de ${obj(name(e.fromId))}`)
    case 'CHALLENGE_DECLARED':
      return entry('challenge', `${name(e.challengerId)} contestou ${withArticle(e.claim)} de ${obj(name(e.claimantId))}`)
    case 'CHALLENGE_RESOLVED':
      return e.claimWasTrue
        ? entry('challenge', `${name(e.claimantId)} tinha ${withArticle(e.claim)}! A carta volta à Corte e é trocada`)
        : entry('challenge', `Blefe! ${name(e.claimantId)} não tinha ${withArticle(e.claim)}`)
    case 'CARD_DRAWN_PRIVATE':
      return e.to === viewerId ? entry('info', `Você comprou ${withArticle(e.influence)} (só você vê)`) : null
    case 'BLOCK_DECLARED':
      return entry('action', `${name(e.block.blockerId)} bloqueou com ${withArticle(e.block.claim)}`)
    case 'ACTION_BLOCKED':
      return entry('action', `${ACTIONS[e.action.type].label} de ${obj(name(e.action.actorId))} foi bloqueado`)
    case 'ACTION_CANCELLED':
      return null
    case 'INFLUENCE_LOST':
      return entry('challenge', `${name(e.playerId)} perdeu ${withArticle(e.influence)}`)
    case 'PLAYER_ELIMINATED':
      return entry('challenge', `${name(e.playerId)} está fora da partida`)
    case 'EXCHANGE_COMPLETED':
      return entry('action', `${name(e.playerId)} trocou cartas com a Corte`)
    case 'GAME_FINISHED':
      return entry('info', `${name(e.winnerId)} venceu a partida!`)
    default:
      return null
  }
}
