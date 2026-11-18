import { useState } from 'react'
import { motion } from 'motion/react'
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '../../game/types/protocol'
import { useGameStore } from '../../stores/gameStore'

/** Tela inicial: seu nome, jogar contra bots ou jogar online com amigos. */
export function MainMenu({ initialCode = '' }: { initialCode?: string }) {
  const { playerName, setPlayerName, lastLocal, startLocal, createOnline, joinOnline, menuError, busy } = useGameStore()
  const [bots, setBots] = useState(lastLocal.botCount)
  const [code, setCode] = useState(initialCode)
  const [tab, setTab] = useState<'online' | 'local'>('online')
  const nameOk = playerName.trim().length > 0

  return (
    <div className="overlay">
      <motion.div className="panel menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="decision__eyebrow">Coup 3D</div>
        <h1 className="lobby__title">Sente-se à mesa</h1>

        <label className="field">
          <span>Seu nome</span>
          <input value={playerName} maxLength={16} onChange={(e) => setPlayerName(e.target.value)} placeholder="Como os outros vão te ver" autoFocus />
        </label>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'online'} className={tab === 'online' ? 'is-on' : ''} onClick={() => setTab('online')}>
            Com amigos (online)
          </button>
          <button role="tab" aria-selected={tab === 'local'} className={tab === 'local' ? 'is-on' : ''} onClick={() => setTab('local')}>
            Contra bots
          </button>
        </div>

        {tab === 'online' ? (
          <div className="menu__section">
            <button className="btn btn--gold btn--lg" disabled={!nameOk || busy} onClick={() => void createOnline()}>
              {busy ? 'Conectando…' : 'Criar sala'}
            </button>
            <div className="menu__or">ou entre com um código</div>
            <form
              className="join-row"
              onSubmit={(e) => {
                e.preventDefault()
                void joinOnline(code)
              }}
            >
              <input
                className="code-input"
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                placeholder="ABCDE"
                aria-label="Código da sala"
                spellCheck={false}
              />
              <button type="submit" className="btn" disabled={!nameOk || busy || code.length !== ROOM_CODE_LENGTH}>
                Entrar
              </button>
            </form>
          </div>
        ) : (
          <div className="menu__section">
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
            <button className="btn btn--gold btn--lg" disabled={!nameOk} onClick={() => startLocal(bots)}>
              Começar partida
            </button>
          </div>
        )}

        {!nameOk && <p className="menu__hint">Digite seu nome para começar.</p>}
        {menuError && <p className="menu__error">{menuError}</p>}
      </motion.div>
    </div>
  )
}
