import { describe, expect, it } from 'vitest'
import { RoomLogic, newRoomData, parseClientMessage, type Outgoing } from '../../server/src/rooms/RoomLogic'
import type { ServerMessage } from '../../src/game/types/protocol'

/* Testes da sala multiplayer (GDD §11, §15), sem rede: a mesma lógica que roda no Durable Object. */

let ids = 0
function room() {
  ids = 0
  let seed = 1
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return new RoomLogic(newRoomData('ABCDE', 0), { random, makeId: () => `id${++ids}-xxxxxxxxxxxx` })
}

function join(r: RoomLogic, name: string, token?: string) {
  const res = r.join(name, token, 1000)
  if (!res.ok) throw new Error(res.error)
  return res.player
}

function lastFor(out: Outgoing[], playerId: string): ServerMessage {
  const msgs = out.filter((o) => o.playerId === playerId)
  return msgs[msgs.length - 1].msg
}

describe('sala de espera', () => {
  it('o primeiro a entrar é o anfitrião e nomes repetidos ganham sufixo', () => {
    const r = room()
    const a = join(r, 'Ana')
    const b = join(r, 'ana')
    expect(r.data.hostId).toBe(a.id)
    expect(b.name).toBe('ana 2')
  })

  it('só o anfitrião adiciona bots e inicia', () => {
    const r = room()
    const a = join(r, 'Ana')
    const b = join(r, 'Beto')
    expect(r.message(b.id, { t: 'add_bot' }, 1).reply).toMatchObject({ t: 'error' })
    expect(r.message(b.id, { t: 'start' }, 1).reply).toMatchObject({ t: 'error' })
    expect(r.message(a.id, { t: 'add_bot' }, 1).reply).toBeUndefined()
    expect(r.data.players.filter((p) => p.isBot)).toHaveLength(1)
  })

  it('não inicia com menos de 2 jogadores', () => {
    const r = room()
    const a = join(r, 'Ana')
    expect(r.message(a.id, { t: 'start' }, 1).reply).toMatchObject({ t: 'error' })
  })

  it('máximo de 6 jogadores', () => {
    const r = room()
    for (let i = 0; i < 6; i++) join(r, `J${i}`)
    expect(r.join('Sétimo', undefined, 1).ok).toBe(false)
  })

  it('não é possível entrar numa partida em andamento sem token', () => {
    const r = room()
    const a = join(r, 'Ana')
    join(r, 'Beto')
    r.message(a.id, { t: 'start' }, 1)
    expect(r.join('Carla', undefined, 2).ok).toBe(false)
  })

  it('quem cai na sala de espera sai da lista; o anfitrião passa adiante', () => {
    const r = room()
    const a = join(r, 'Ana')
    const b = join(r, 'Beto')
    r.disconnect(a.id, 5)
    expect(r.data.players.map((p) => p.id)).toEqual([b.id])
    expect(r.data.hostId).toBe(b.id)
  })
})

describe('partida online', () => {
  function started() {
    const r = room()
    const a = join(r, 'Ana')
    const b = join(r, 'Beto')
    const c = join(r, 'Caio')
    const out = r.message(a.id, { t: 'start' }, 2000).out
    return { r, a, b, c, out }
  }

  it('cada jogador recebe só as próprias cartas (nada de cartas alheias nos dados)', () => {
    const { r, a, b, c, out } = started()
    for (const me of [a, b, c]) {
      const msg = lastFor(out, me.id)
      expect(msg.t).toBe('state')
      const json = JSON.stringify(msg)
      for (const other of r.data.game!.players.filter((p) => p.id !== me.id)) {
        for (const card of other.cards) expect(json).not.toContain(`"${card.id}"`)
      }
      if (msg.t === 'state') expect(msg.view.myCards.map((x) => x.id)).toEqual(r.data.game!.players.find((p) => p.id === me.id)!.cards.map((x) => x.id))
    }
  })

  it('o servidor recusa ação fora do turno e comandos malformados', () => {
    const { r } = started()
    const g = r.data.game!
    const current = g.players[g.currentPlayerIndex].id
    const other = g.players.find((p) => p.id !== current)!.id
    expect(r.message(other, { t: 'command', cmd: { type: 'declare_action', action: 'income' } }, 1).reply).toMatchObject({ t: 'error' })
    // tentativa de "inventar" uma ação ou mandar lixo
    const bad = [
      { type: 'declare_action', action: 'toString' },
      { type: 'declare_action', action: 'give_me_coins', amount: 99 },
      { type: 'exchange_keep', cardIds: 'tudo' },
      { type: 'choose_influence' },
    ]
    for (const cmd of bad) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(r.message(current, { t: 'command', cmd: cmd as any }, 1).reply).toMatchObject({ t: 'error' })
    }
    expect(r.data.game).toEqual(g) // nada mudou
  })

  it('jogador desconectado não trava a partida: o prazo curto escolhe por ele', () => {
    const { r } = started()
    const g = r.data.game!
    const current = g.players[g.currentPlayerIndex].id
    r.disconnect(current, 3000)
    const timer = r.data.timers.find((t) => t.playerId === current)!
    expect(timer.total).toBe(8000)
    r.alarm(timer.at)
    // a ação padrão (Renda) foi aplicada e o turno andou
    expect(r.data.game!.players.find((p) => p.id === current)!.coins).toBe(3)
    expect(r.data.game!.turn).toBe(2)
  })

  it('reconectar com o token devolve o mesmo lugar e o estado atual', () => {
    const { r, b } = started()
    r.disconnect(b.id, 3000)
    expect(r.data.players.find((p) => p.id === b.id)!.connected).toBe(false)
    const res = r.join('Qualquer', b.token, 4000)
    expect(res.ok && res.player.id).toBe(b.id)
    expect(r.data.players.find((p) => p.id === b.id)!.connected).toBe(true)
    expect(r.snapshotFor(b.id).t).toBe('state')
  })

  it('token de outra pessoa não dá acesso', () => {
    const { r } = started()
    expect(r.join('Intruso', 'token-falso', 5000).ok).toBe(false)
  })

  it('partida inteira com bots e um humano ausente termina, e o anfitrião pode recomeçar', () => {
    const r = room()
    const a = join(r, 'Ana')
    r.message(a.id, { t: 'add_bot' }, 1)
    r.message(a.id, { t: 'add_bot' }, 1)
    r.message(a.id, { t: 'start' }, 0)
    let now = 0
    for (let i = 0; i < 2000 && r.data.status === 'playing'; i++) {
      now = r.nextAlarm()!
      r.alarm(now)
    }
    expect(r.data.status).toBe('finished')
    expect(r.data.timers).toHaveLength(0)
    const msg = r.snapshotFor(a.id, [], now)
    expect(msg.t === 'state' && msg.view.phase.kind).toBe('game_over')
    r.message(a.id, { t: 'restart' }, now + 1)
    expect(r.data.status).toBe('playing')
    expect(r.data.game!.turn).toBe(1)
  })

  it('sala sem ninguém conectado é considerada abandonada depois de 2h', () => {
    const { r, a, b, c } = started()
    for (const p of [a, b, c]) r.disconnect(p.id, 10_000)
    expect(r.isAbandoned(10_000 + 60_000)).toBe(false)
    expect(r.isAbandoned(10_000 + 2 * 60 * 60 * 1000)).toBe(true)
  })
})

describe('mensagens', () => {
  it('rejeita mensagens malformadas', () => {
    expect(parseClientMessage('não é json')).toBeNull()
    expect(parseClientMessage('{"t":"hack"}')).toBeNull()
    expect(parseClientMessage('{"t":"command","cmd":"x"}')).toBeNull()
    expect(parseClientMessage('x'.repeat(5000))).toBeNull()
    expect(parseClientMessage('{"t":"join","name":"Ana"}')).toEqual({ t: 'join', name: 'Ana', token: undefined })
  })
})
