import type { PublicPlayerView } from '../../game/types/engine'
import { Portrait } from './Portrait'

interface Props {
  player: PublicPlayerView
  look?: string | null
  isTurn: boolean
  /** Online: o jogador está sem conexão (o servidor joga por ele quando o prazo acaba). */
  offline?: boolean
  /** A partida está esperando uma decisão deste jogador. */
  thinking?: boolean
  /** Pode ser escolhido como alvo agora. */
  selectable?: boolean
  onSelect?: () => void
}

/** Plaquinha acima de cada adversário: retrato, nome, moedas e influências restantes. */
export function PlayerTag({ player, look, isTurn, offline = false, thinking = false, selectable = false, onSelect }: Props) {
  const cls = ['player-tag', isTurn && 'is-turn', player.eliminated && 'is-out', selectable && 'is-selectable'].filter(Boolean).join(' ')
  return (
    <div className={cls} onClick={selectable ? onSelect : undefined} role={selectable ? 'button' : undefined}>
      <Portrait look={look} name={player.name} size={40} active={isTurn} />
      <div className="player-tag__body">
        <div className="player-tag__name">
          {player.name}
          {isTurn && <span className="turn-dot" aria-label="vez de jogar" />}
        </div>
        <div className="player-tag__stats">
          {player.eliminated ? (
            <span className="player-tag__out">fora da partida</span>
          ) : (
            <>
              <span className="coin-chip" />
              {player.coins}
              <span className="influence-pips" aria-label={`${player.hiddenInfluenceCount} influências`}>
                {Array.from({ length: 2 }, (_, i) => (
                  <i key={i} className={i < player.hiddenInfluenceCount ? 'on' : ''} />
                ))}
              </span>
              {thinking && <span className="thinking" aria-label="decidindo" />}
              {offline && <span className="offline-badge">sem conexão</span>}
            </>
          )}
        </div>
      </div>
      {selectable && <span className="player-tag__target">Alvo</span>}
    </div>
  )
}
