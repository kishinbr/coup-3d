import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { Portrait } from './Portrait'

/** Tela de vitória/derrota (GDD §14, Fase 5 terá a versão final). */
export function GameOver() {
  const view = useGameStore((s) => s.view)
  const last = useGameStore((s) => s.lastConfig)
  const start = useGameStore((s) => s.startLocal)
  const backToLobby = useGameStore((s) => s.backToLobby)
  if (!view || view.phase.kind !== 'game_over') return null
  const winner = view.players.find((p) => p.id === view.phase.winnerId)!
  const won = winner.id === view.viewerId

  return (
    <motion.div className="overlay overlay--soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}>
      <motion.div className="panel game-over" initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 1.2, duration: 0.5 }}>
        <Portrait id={winner.id} name={winner.name} size={84} active />
        <div className="decision__eyebrow">{won ? 'Vitória' : 'Derrota'}</div>
        <h1 className="lobby__title">{won ? 'A mesa é sua.' : `${winner.name} venceu`}</h1>
        <p className="decision__text">
          {won ? 'Você foi o último com influência na mesa.' : 'Suas influências caíram. Revanche?'} Partida decidida no turno {view.turn}.
        </p>
        <div className="decision__actions">
          <button className="btn btn--gold btn--lg" onClick={() => start(last.playerName, last.botCount)}>
            Jogar de novo
          </button>
          <button className="btn btn--ghost" onClick={backToLobby}>
            Voltar ao início
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
