import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { PlayerTag } from './PlayerTag'
import { registerTag } from './tagLayer'

/** Camada com as plaquinhas dos adversários (a posição vem do TagProjector, na cena). */
export function PlayerTags() {
  const view = useGameStore((s) => s.view)
  const looks = useGameStore((s) => s.looks)
  const roomPlayers = useGameStore((s) => s.room?.players)
  const send = useGameStore((s) => s.send)
  const targeting = useInterfaceStore((s) => s.targeting)
  const setTargeting = useInterfaceStore((s) => s.setTargeting)
  if (!view) return null
  const validTargets = view.prompt?.kind === 'choose_action' ? view.prompt.targets : []

  return (
    <div className="tag-layer">
      {view.players
        .filter((p) => p.id !== view.viewerId)
        .map((p) => {
          const selectable = targeting !== null && validTargets.includes(p.id)
          const offline = roomPlayers?.find((r) => r.id === p.id)?.connected === false
          return (
            <div key={p.id} ref={(el) => registerTag(p.id, el)} className="tag-anchor" style={{ visibility: 'hidden' }}>
              <PlayerTag
                player={p}
                look={looks[p.id]}
                offline={offline && !p.eliminated}
                isTurn={p.id === view.currentPlayerId && view.phase.kind !== 'game_over'}
                thinking={view.phase.waitingOn.includes(p.id)}
                selectable={selectable}
                onSelect={() => {
                  if (!targeting) return
                  send({ type: 'declare_action', action: targeting, targetId: p.id })
                  setTargeting(null)
                }}
              />
            </div>
          )
        })}
    </div>
  )
}
