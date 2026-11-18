import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { Portrait } from './Portrait'

/** Tela de vitória/derrota. Online, só o anfitrião começa a próxima partida. */
export function GameOver() {
  const { view, mode, room, myId, looks, lastLocal, startLocal, roomAction, leave } = useGameStore()
  if (!view || view.phase.kind !== 'game_over') return null
  const winner = view.players.find((p) => p.id === view.phase.winnerId)!
  const won = winner.id === view.viewerId
  const isHost = mode === 'local' || room?.hostId === myId

  return (
    <motion.div className="overlay overlay--soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}>
      <motion.div className="panel game-over" initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 1.2, duration: 0.5 }}>
        <Portrait look={looks[winner.id]} name={winner.name} size={84} active />
        <div className="decision__eyebrow">{won ? 'Vitória' : 'Derrota'}</div>
        <h1 className="lobby__title">{won ? 'A mesa é sua.' : `${winner.name} venceu`}</h1>
        <p className="decision__text">
          {won ? 'Você foi o último com influência na mesa.' : 'Suas influências caíram. Revanche?'} Partida decidida no turno {view.turn}.
        </p>
        <div className="decision__actions">
          {isHost ? (
            <button
              className="btn btn--gold btn--lg"
              onClick={() => (mode === 'local' ? startLocal(lastLocal.botCount) : roomAction({ t: 'restart' }))}
            >
              Jogar de novo
            </button>
          ) : (
            <p className="decision__text">Aguardando o anfitrião começar outra partida…</p>
          )}
          <button className="btn btn--ghost" onClick={leave}>
            {mode === 'online' ? 'Sair da sala' : 'Voltar ao início'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
