import { useState } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'

/** Tela inicial do modo local: nome e quantidade de adversários (bots). */
export function Lobby() {
  const last = useGameStore((s) => s.lastConfig)
  const start = useGameStore((s) => s.startLocal)
  const [name, setName] = useState(last.playerName)
  const [bots, setBots] = useState(last.botCount)

  return (
    <div className="overlay">
      <motion.form
        className="panel lobby"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={(e) => {
          e.preventDefault()
          start(name, bots)
        }}
      >
        <div className="decision__eyebrow">Modo local · Fase 3</div>
        <h1 className="lobby__title">Sente-se à mesa</h1>
        <p className="decision__text">
          Blefe, conteste e elimine as influências dos adversários. Nesta fase você joga contra bots; o multiplayer online chega na Fase 4.
        </p>

        <label className="field">
          <span>Seu nome</span>
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="Você" />
        </label>

        <div className="field">
          <span>Adversários</span>
          <div className="segmented">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} className={n === bots ? 'is-on' : ''} onClick={() => setBots(n)}>
                {n}
              </button>
            ))}
          </div>
          <small>
            {bots + 1} jogadores na mesa · {25 - (bots + 1) * 2} cartas na Corte
          </small>
        </div>

        <button type="submit" className="btn btn--gold btn--lg">
          Começar partida
        </button>
      </motion.form>
    </div>
  )
}
