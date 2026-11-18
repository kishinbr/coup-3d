import { describe, expect, it } from 'vitest'
import { applyCommand, createGame } from '../../src/game/rules/engine'
import { eventsFor, getPlayerView } from '../../src/game/rules/view'
import { CHALLENGE, PASS, hiddenOf, player, rejects, run, setup, totalCards } from './helpers'

/* Casos do GDD §15. "A", "B", "C" são jogadores; A começa. */

describe('preparação', () => {
  it('distribui 2 cartas e 2 moedas por jogador, e o resto vai para a Corte', () => {
    const { state } = createGame(
      ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })),
      7,
    )
    expect(state.players.every((p) => p.cards.length === 2 && p.coins === 2)).toBe(true)
    expect(state.court.length).toBe(25 - 4 * 2)
    expect(totalCards(state)).toBe(25)
  })

  it('recusa menos de 2 ou mais de 6 jogadores', () => {
    expect(() => createGame([{ id: 'a', name: 'a' }], 1)).toThrow()
    expect(() => createGame(Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: '' })), 1)).toThrow()
  })
})

describe('ações gerais', () => {
  it('Renda dá 1 moeda e passa o turno', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'income' }])
    expect(player(r.state, 'A').coins).toBe(3)
    expect(r.state.players[r.state.currentPlayerIndex].id).toBe('B')
  })

  it('Golpe de Estado custa 7 e o alvo perde uma influência', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'], coins: 7 },
      { id: 'B', cards: ['capitao', 'assassino'] },
      { id: 'C', cards: ['capitao', 'assassino'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'coup', targetId: 'B' }])
    expect(player(r.state, 'A').coins).toBe(0)
    expect(r.state.phase.kind).toBe('choosing_influence_loss')
    const card = player(r.state, 'B').cards[1]
    r = run(r.state, ['B', { type: 'choose_influence', cardId: card.id }])
    expect(hiddenOf(r.state, 'B')).toEqual(['capitao'])
  })

  it('com 10 moedas no início do turno o Golpe é obrigatório', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'], coins: 10 },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    expect(rejects(s, 'A', { type: 'declare_action', action: 'tax' })).toMatch(/obrigatório/)
    expect(rejects(s, 'A', { type: 'declare_action', action: 'income' })).toMatch(/obrigatório/)
    run(s, ['A', { type: 'declare_action', action: 'coup', targetId: 'B' }])
  })

  it('Ajuda Externa sem bloqueio dá 2 moedas e não pode ser contestada', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'foreign_aid' }])
    expect(r.state.phase.kind).toBe('block_window')
    rejects(r.state, 'B', CHALLENGE)
    r = run(r.state, ['B', PASS])
    expect(player(r.state, 'A').coins).toBe(4)
  })

  it('Ajuda Externa bloqueada por Duque (sem contestação) é cancelada', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['duque', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'foreign_aid' }], ['B', { type: 'block', claim: 'duque' }], ['A', PASS])
    expect(player(r.state, 'A').coins).toBe(2)
    expect(r.events.some((e) => e.type === 'ACTION_BLOCKED')).toBe(true)
  })

  it('bloqueio falso de Duque contestado: bloqueador perde influência e a Ajuda Externa acontece', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'condessa'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'foreign_aid' }], ['B', { type: 'block', claim: 'duque' }], ['A', CHALLENGE])
    expect(r.state.phase.kind).toBe('choosing_influence_loss')
    r = run(r.state, ['B', { type: 'choose_influence', cardId: player(r.state, 'B').cards[0].id }])
    expect(player(r.state, 'A').coins).toBe(4)
    expect(hiddenOf(r.state, 'B')).toEqual(['condessa'])
  })
})

describe('contestação (GDD §4.1)', () => {
  it('Taxar sem contestação dá 3 moedas', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
      { id: 'C', cards: ['capitao', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', PASS], ['C', PASS])
    expect(player(r.state, 'A').coins).toBe(5)
  })

  it('Taxar com Duque verdadeiro: contestador perde, a carta é trocada e a ação continua', () => {
    const s = setup(
      [
        { id: 'A', cards: ['duque', 'condessa'] },
        { id: 'B', cards: ['capitao', 'assassino'] },
      ],
      { courtTop: ['embaixador'] },
    )
    const duqueId = player(s, 'A').cards[0].id
    let r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', CHALLENGE])
    // o Duque foi devolvido à Corte e A comprou outra carta
    expect(player(r.state, 'A').cards.some((c) => c.id === duqueId)).toBe(false)
    expect(player(r.state, 'A').cards).toHaveLength(2)
    expect(totalCards(r.state)).toBe(25)
    expect(r.state.phase).toMatchObject({ kind: 'choosing_influence_loss', playerId: 'B', reason: 'lost_challenge' })
    r = run(r.state, ['B', { type: 'choose_influence', cardId: player(r.state, 'B').cards[0].id }])
    expect(player(r.state, 'A').coins).toBe(5)
  })

  it('Taxar com Duque falso: quem blefou perde influência e não recebe moedas', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', CHALLENGE])
    expect(r.state.phase).toMatchObject({ kind: 'choosing_influence_loss', playerId: 'A', reason: 'caught_bluffing' })
    expect(r.events.some((e) => e.type === 'ACTION_CANCELLED')).toBe(true)
    r = run(r.state, ['A', { type: 'choose_influence', cardId: player(r.state, 'A').cards[0].id }])
    expect(player(r.state, 'A').coins).toBe(2)
  })

  it('a carta declarada que não existe não é revelada', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', CHALLENGE])
    expect(r.events.some((e) => e.type === 'INFLUENCE_LOST')).toBe(false)
    expect(player(r.state, 'A').cards.every((c) => !c.revealed)).toBe(true)
  })

  it('dois jogadores contestando a mesma ação: só o primeiro vale', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
      { id: 'C', cards: ['capitao', 'embaixador'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', CHALLENGE])
    rejects(r.state, 'C', CHALLENGE)
  })

  it('perda de influência é aplicada uma única vez', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'tax' }], ['B', CHALLENGE])
    const cardId = player(r.state, 'A').cards[0].id
    r = run(r.state, ['A', { type: 'choose_influence', cardId }])
    rejects(r.state, 'A', { type: 'choose_influence', cardId: player(r.state, 'A').cards[1].id })
    expect(hiddenOf(r.state, 'A')).toHaveLength(1)
  })
})

describe('Assassino e Condessa', () => {
  it('não pode assassinar sem 3 moedas', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'], coins: 2 },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])
    expect(rejects(s, 'A', { type: 'declare_action', action: 'assassinate', targetId: 'B' })).toMatch(/3 moedas/)
  })

  it('assassinato sem resposta: alvo perde uma influência', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'condessa'], coins: 3 },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'assassinate', targetId: 'B' }], ['B', PASS], ['B', PASS])
    expect(player(r.state, 'A').coins).toBe(0)
    r = run(r.state, ['B', { type: 'choose_influence', cardId: player(r.state, 'B').cards[0].id }])
    expect(hiddenOf(r.state, 'B')).toEqual(['duque'])
  })

  it('bloqueio com Condessa sem contestação: assassinato cancelado e o pagamento é perdido', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'duque'], coins: 3 },
      { id: 'B', cards: ['condessa', 'duque'] },
    ])
    const r = run(
      s,
      ['A', { type: 'declare_action', action: 'assassinate', targetId: 'B' }],
      ['B', PASS],
      ['B', { type: 'block', claim: 'condessa' }],
      ['A', PASS],
    )
    expect(player(r.state, 'A').coins).toBe(0)
    expect(hiddenOf(r.state, 'B')).toHaveLength(2)
  })

  it('Condessa falsa contestada: o bloqueador perde as duas influências e é eliminado', () => {
    const s = setup([
      { id: 'A', cards: ['assassino', 'duque'], coins: 3 },
      { id: 'B', cards: ['capitao', 'duque'] },
      { id: 'C', cards: ['capitao', 'embaixador'] },
    ])
    let r = run(
      s,
      ['A', { type: 'declare_action', action: 'assassinate', targetId: 'B' }],
      ['B', PASS],
      ['C', PASS],
      ['B', { type: 'block', claim: 'condessa' }],
      ['A', CHALLENGE],
    )
    r = run(r.state, ['B', { type: 'choose_influence', cardId: player(r.state, 'B').cards[0].id }])
    // a segunda perda (o assassinato) é automática: só restava uma carta
    expect(player(r.state, 'B').eliminated).toBe(true)
    expect(r.state.players[r.state.currentPlayerIndex].id).toBe('C')
  })

  it('Assassino desmascarado: perde influência, ação cancelada e as 3 moedas não voltam', () => {
    const s = setup([
      { id: 'A', cards: ['capitao', 'duque'], coins: 3 },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])
    let r = run(s, ['A', { type: 'declare_action', action: 'assassinate', targetId: 'B' }], ['B', CHALLENGE])
    r = run(r.state, ['A', { type: 'choose_influence', cardId: player(r.state, 'A').cards[0].id }])
    expect(player(r.state, 'A').coins).toBe(0)
    expect(hiddenOf(r.state, 'B')).toHaveLength(2)
  })
})

describe('Capitão', () => {
  const steal = (coins: number) => {
    const s = setup([
      { id: 'A', cards: ['capitao', 'duque'] },
      { id: 'B', cards: ['assassino', 'duque'], coins },
    ])
    return run(s, ['A', { type: 'declare_action', action: 'steal', targetId: 'B' }], ['B', PASS], ['B', PASS]).state
  }
  it('rouba 2 moedas', () => {
    const s = steal(5)
    expect([player(s, 'A').coins, player(s, 'B').coins]).toEqual([4, 3])
  })
  it('rouba só 1 se o alvo tiver 1', () => {
    const s = steal(1)
    expect([player(s, 'A').coins, player(s, 'B').coins]).toEqual([3, 0])
  })
  it('alvo sem moedas: nada é roubado', () => {
    const s = steal(0)
    expect([player(s, 'A').coins, player(s, 'B').coins]).toEqual([2, 0])
  })
  it('bloqueio com Embaixador impede a transferência', () => {
    const s = setup([
      { id: 'A', cards: ['capitao', 'duque'] },
      { id: 'B', cards: ['embaixador', 'duque'] },
    ])
    const r = run(
      s,
      ['A', { type: 'declare_action', action: 'steal', targetId: 'B' }],
      ['B', PASS],
      ['B', { type: 'block', claim: 'embaixador' }],
      ['A', PASS],
    )
    expect([player(r.state, 'A').coins, player(r.state, 'B').coins]).toEqual([2, 2])
  })
  it('só o alvo pode bloquear e só com Capitão ou Embaixador', () => {
    const s = setup([
      { id: 'A', cards: ['capitao', 'duque'] },
      { id: 'B', cards: ['embaixador', 'duque'] },
      { id: 'C', cards: ['capitao', 'duque'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'steal', targetId: 'B' }], ['B', PASS], ['C', PASS])
    rejects(r.state, 'C', { type: 'block', claim: 'capitao' })
    rejects(r.state, 'B', { type: 'block', claim: 'condessa' })
  })
})

describe('Embaixador', () => {
  it('compra 2, mantém 2 e devolve 2 para a Corte', () => {
    const s = setup(
      [
        { id: 'A', cards: ['embaixador', 'duque'] },
        { id: 'B', cards: ['capitao', 'assassino'] },
      ],
      { courtTop: ['condessa', 'capitao'] },
    )
    let r = run(s, ['A', { type: 'declare_action', action: 'exchange' }], ['B', PASS])
    expect(r.state.phase.kind).toBe('choosing_exchange')
    const view = getPlayerView(r.state, 'A')
    expect(view.prompt).toMatchObject({ kind: 'exchange', keep: 2 })
    const options = view.prompt!.kind === 'exchange' ? view.prompt!.cards : []
    expect(options).toHaveLength(4)
    const keep = options.filter((c) => c.influence === 'duque' || c.influence === 'condessa').map((c) => c.id)
    rejects(r.state, 'A', { type: 'exchange_keep', cardIds: keep.slice(0, 1) })
    r = run(r.state, ['A', { type: 'exchange_keep', cardIds: keep }])
    expect(hiddenOf(r.state, 'A').sort()).toEqual(['condessa', 'duque'])
    expect(r.state.court).toHaveLength(25 - 4)
    expect(totalCards(r.state)).toBe(25)
  })

  it('com uma influência, mantém apenas uma', () => {
    const s = setup([
      { id: 'A', cards: ['embaixador'], revealed: ['duque'] },
      { id: 'B', cards: ['capitao', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'exchange' }], ['B', PASS])
    const view = getPlayerView(r.state, 'A')
    expect(view.prompt).toMatchObject({ kind: 'exchange', keep: 1 })
  })
})

describe('eliminação e vitória', () => {
  it('perder a última influência elimina; o último jogador vence', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'], coins: 7 },
      { id: 'B', cards: ['capitao'], revealed: ['assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'coup', targetId: 'B' }])
    expect(player(r.state, 'B').eliminated).toBe(true)
    expect(r.state.phase).toEqual({ kind: 'game_over', winnerId: 'A' })
    rejects(r.state, 'A', { type: 'declare_action', action: 'income' })
  })

  it('jogador eliminado não pode agir nem contestar', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'] },
      { id: 'B', cards: ['capitao', 'duque'] },
      { id: 'X', cards: [], revealed: ['assassino', 'assassino'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'tax' }])
    expect(rejects(r.state, 'X', CHALLENGE)).toMatch(/eliminados/)
    // o eliminado também não é esperado na janela de resposta
    expect(getPlayerView(r.state, 'A').phase.waitingOn).toEqual(['B'])
  })

  it('turno pula jogadores eliminados', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'] },
      { id: 'X', cards: [], revealed: ['assassino', 'assassino'] },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])
    const r = run(s, ['A', { type: 'declare_action', action: 'income' }])
    expect(r.state.players[r.state.currentPlayerIndex].id).toBe('B')
  })
})

describe('validação e segurança (GDD §15)', () => {
  const base = () =>
    setup([
      { id: 'A', cards: ['duque', 'condessa'] },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])

  it('ação fora do turno é recusada', () => {
    expect(rejects(base(), 'B', { type: 'declare_action', action: 'income' })).toMatch(/vez/)
  })

  it('ação duplicada é recusada', () => {
    const r = run(base(), ['A', { type: 'declare_action', action: 'tax' }])
    rejects(r.state, 'A', { type: 'declare_action', action: 'tax' })
  })

  it('não é possível escolher a si mesmo como alvo', () => {
    const s = setup([
      { id: 'A', cards: ['capitao', 'condessa'], coins: 7 },
      { id: 'B', cards: ['capitao', 'duque'] },
    ])
    rejects(s, 'A', { type: 'declare_action', action: 'coup', targetId: 'A' })
  })

  it('comandos não alteram o estado original (imutabilidade)', () => {
    const s = base()
    const before = JSON.stringify(s)
    applyCommand(s, 'A', { type: 'declare_action', action: 'tax' })
    expect(JSON.stringify(s)).toBe(before)
  })

  it('a visão de um jogador não contém as cartas ocultas dos outros', () => {
    const s = setup([
      { id: 'A', cards: ['duque', 'condessa'] },
      { id: 'B', cards: ['assassino', 'assassino'] },
    ])
    const view = getPlayerView(s, 'A')
    const json = JSON.stringify(view)
    expect(json).not.toContain('assassino')
    expect(view.myCards.map((c) => c.influence)).toEqual(['duque', 'condessa'])
  })

  it('a carta nova comprada após uma contestação só aparece para o dono', () => {
    const s = setup(
      [
        { id: 'A', cards: ['duque', 'condessa'] },
        { id: 'B', cards: ['capitao', 'assassino'] },
      ],
      { courtTop: ['embaixador'] },
    )
    const r = applyCommand(s, 'A', { type: 'declare_action', action: 'tax' })
    if (!r.ok) throw new Error(r.error)
    const r2 = applyCommand(r.state, 'B', CHALLENGE)
    if (!r2.ok) throw new Error(r2.error)
    expect(eventsFor(r2.events, 'B').some((e) => e.type === 'CARD_DRAWN_PRIVATE')).toBe(false)
    expect(eventsFor(r2.events, 'A').some((e) => e.type === 'CARD_DRAWN_PRIVATE')).toBe(true)
  })
})
