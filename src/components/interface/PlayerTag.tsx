import type { PublicPlayer } from '../../game/types/player'
import { Portrait } from './Portrait'

/** Plaquinha acima de cada adversário: retrato, nome, moedas e influências restantes. */
export function PlayerTag({ player, isTurn }: { player: PublicPlayer; isTurn: boolean }) {
  return (
    <div className={`player-tag ${isTurn ? 'is-turn' : ''}`}>
      <Portrait id={player.id} name={player.name} size={40} active={isTurn} />
      <div className="player-tag__body">
        <div className="player-tag__name">
          {player.name}
          {isTurn && <span className="turn-dot" aria-label="vez de jogar" />}
        </div>
        <div className="player-tag__stats">
          <span className="coin-chip" />
          {player.coins}
          <span className="influence-pips" aria-label={`${player.hiddenInfluenceCount} influências`}>
            {Array.from({ length: 2 }, (_, i) => (
              <i key={i} className={i < player.hiddenInfluenceCount ? 'on' : ''} />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
