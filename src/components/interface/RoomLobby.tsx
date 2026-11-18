import { useState } from 'react'
import { motion } from 'motion/react'
import { inviteLink, useGameStore } from '../../stores/gameStore'
import { botLook } from '../../game/constants/seating'
import { Portrait } from './Portrait'

/** Sala de espera online: código para convidar, lista de jogadores, bots e botão de iniciar. */
export function RoomLobby() {
  const { room, myId, roomAction, leave, connection } = useGameStore()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  if (!room) {
    return (
      <div className="overlay">
        <div className="panel">
          <div className="decision__eyebrow">Sala online</div>
          <h1 className="lobby__title">Conectando…</h1>
          <button className="btn btn--ghost" onClick={leave}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const isHost = room.hostId === myId
  const canStart = room.players.length >= 2
  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? room.code : inviteLink(room.code))
      setCopied(what)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      /* sem permissão para copiar: o código continua visível */
    }
  }

  return (
    <div className="overlay">
      <motion.div className="panel room" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="decision__eyebrow">Sala online</div>
        <div className="room-code" aria-label={`Código da sala ${room.code}`}>
          {room.code.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <div className="room__share">
          <button className="btn btn--ghost" onClick={() => void copy('code')}>
            {copied === 'code' ? 'Copiado!' : 'Copiar código'}
          </button>
          <button className="btn btn--ghost" onClick={() => void copy('link')}>
            {copied === 'link' ? 'Copiado!' : 'Copiar link de convite'}
          </button>
        </div>

        <ul className="room__players">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'is-offline'}>
              <Portrait look={p.isBot ? botLook(p.id) : null} name={p.name} size={34} />
              <span className="room__name">
                {p.name}
                {p.id === myId && <em> (você)</em>}
              </span>
              <span className="room__tags">
                {p.isHost && <b>anfitrião</b>}
                {p.isBot && <b>bot</b>}
                {!p.connected && <b>sem conexão</b>}
              </span>
              {isHost && p.isBot && (
                <button className="room__remove" aria-label={`Remover ${p.name}`} onClick={() => roomAction({ t: 'remove_player', playerId: p.id })}>
                  ×
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: room.maxPlayers - room.players.length }, (_, i) => (
            <li key={`empty${i}`} className="is-empty">
              Lugar vago
            </li>
          ))}
        </ul>

        {isHost ? (
          <div className="decision__actions">
            <button className="btn" disabled={room.players.length >= room.maxPlayers} onClick={() => roomAction({ t: 'add_bot' })}>
              + Adicionar bot
            </button>
            <button className="btn btn--gold btn--lg" disabled={!canStart} onClick={() => roomAction({ t: 'start' })}>
              Começar partida
            </button>
          </div>
        ) : (
          <p className="decision__text">Aguardando o anfitrião começar a partida…</p>
        )}
        {isHost && !canStart && <p className="menu__hint">Mande o código para os amigos ou adicione um bot (mínimo de 2 jogadores).</p>}

        <div className="room__footer">
          <span className={`conn conn--${connection ?? 'closed'}`}>{connection === 'open' ? 'conectado' : 'reconectando…'}</span>
          <button className="btn btn--ghost" onClick={leave}>
            Sair da sala
          </button>
        </div>
      </motion.div>
    </div>
  )
}
