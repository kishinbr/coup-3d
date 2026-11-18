import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { EYE_HEIGHT, TABLE, seatAngle, seatPoint } from '../../game/constants/table'
import { AVATAR_LOOKS, useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { CameraController } from '../camera/CameraController'
import { HeldCards } from '../camera/HeldCards'
import { PlayerTag } from '../interface/PlayerTag'
import { CasinoRoom } from './CasinoRoom'
import { Chair } from './Chair'
import { CoinField, stackPlacements, type CoinPlacement } from './Coin'
import { CourtDeck, RevealedCards, TREASURY_POSITION } from './DiscardArea'
import { Lighting } from './Lighting'
import { PlayerAvatar, AVATAR_TAG_HEIGHT } from './PlayerAvatar'
import { PlayingCard } from './PlayingCard'
import { PokerTable } from './PokerTable'
import { TurnMarker } from './TurnMarker'

const LOCAL_EYE = new THREE.Vector3(0, EYE_HEIGHT, 1.72)
const TREASURY_COINS = 30

/** Monta a cena a partir da PlayerView: só desenha o que o jogador pode saber. */
export function CasinoScene() {
  const view = useGameStore((s) => s.view)
  const seats = useGameStore((s) => s.seats)
  const send = useGameStore((s) => s.send)
  const cardsOpen = useInterfaceStore((s) => s.cardsOpen)
  const targeting = useInterfaceStore((s) => s.targeting)
  const setTargeting = useInterfaceStore((s) => s.setTargeting)

  const players = useMemo(() => view?.players ?? [], [view])
  const me = players.find((p) => p.id === view?.viewerId)
  const opponents = players.filter((p) => p.id !== view?.viewerId)
  const turnSeat = view ? seats[view.currentPlayerId] : undefined
  const validTargets = view?.prompt?.kind === 'choose_action' ? view.prompt.targets : []

  const coins = useMemo(() => {
    const all: CoinPlacement[] = []
    const y = TABLE.surfaceY
    for (const p of players) {
      const seat = seats[p.id]
      if (seat === undefined) continue
      const a = seatAngle(seat)
      const [cx, cz] = seatPoint(seat, 0.98)
      const right = new THREE.Vector2(Math.cos(a), -Math.sin(a)) // à direita de quem está sentado
      // pilhas de até 8 moedas, lado a lado
      for (let left = p.coins, k = 0; left > 0; k++) {
        const n = Math.min(8, left)
        left -= n
        const off = 0.24 + k * 0.055
        all.push(...stackPlacements(cx + right.x * off, y, cz + right.y * off, n, seat * 10 + k + 3))
      }
    }
    const [tx, tz] = TREASURY_POSITION
    const heights = [8, 6, 7, 5, 4]
    const offsets = [
      [-0.07, -0.03],
      [0.0, 0.04],
      [0.07, -0.02],
      [-0.03, 0.08],
      [0.09, 0.07],
    ]
    let left = TREASURY_COINS
    heights.forEach((h, i) => {
      const n = Math.min(h, left)
      left -= n
      all.push(...stackPlacements(tx + offsets[i][0], y, tz + offsets[i][1], n, 20 + i))
    })
    return all
  }, [players, seats])

  return (
    <>
      <CameraController />
      <Lighting />
      <CasinoRoom />
      <PokerTable />

      {Array.from({ length: TABLE.seatCount - 1 }, (_, i) => i + 1).map((seat) => {
        const [x, z] = seatPoint(seat, TABLE.seatRadius)
        return <Chair key={seat} position={[x, 0, z]} rotation-y={seatAngle(seat) + Math.PI} />
      })}

      {opponents.map((p, i) => {
        const seat = seats[p.id]
        if (seat === undefined) return null
        const [x, z] = seatPoint(seat, TABLE.seatRadius)
        const look = AVATAR_LOOKS[p.id]
        const selectable = targeting !== null && validTargets.includes(p.id)
        return (
          <group key={p.id}>
            {look && (
              <group position={[x, 0, z]} rotation-y={seatAngle(seat) + Math.PI}>
                <PlayerAvatar look={look} cardsInHand={p.hiddenInfluenceCount} lookAt={LOCAL_EYE} phase={i * 2.3} eliminated={p.eliminated} />
              </group>
            )}
            <Html position={[x, AVATAR_TAG_HEIGHT, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: selectable ? 'auto' : 'none' }}>
              <PlayerTag
                player={p}
                isTurn={p.id === view?.currentPlayerId && view?.phase.kind !== 'game_over'}
                thinking={!!view?.phase.waitingOn.includes(p.id)}
                selectable={selectable}
                onSelect={() => {
                  if (!targeting) return
                  send({ type: 'declare_action', action: targeting, targetId: p.id })
                  setTargeting(null)
                }}
              />
            </Html>
            <RevealedCards seat={seat} cards={p.revealed} />
          </group>
        )
      })}

      {/* suas cartas ocultas, viradas para baixo (somem quando você as pega) */}
      {me && !cardsOpen && (
        <group position={[0, TABLE.surfaceY + 0.002, 0.98]}>
          {Array.from({ length: me.hiddenInfluenceCount }, (_, i) => (
            <PlayingCard
              key={i}
              position={[(i - (me.hiddenInfluenceCount - 1) / 2) * 0.1, i * 0.002, 0]}
              rotation={[-Math.PI / 2, 0, (i - 0.5) * 0.12]}
            />
          ))}
        </group>
      )}
      {me && <RevealedCards seat={0} cards={me.revealed} />}

      <CourtDeck count={view?.courtCount ?? 25} />
      <CoinField coins={coins} />
      {turnSeat !== undefined && view?.phase.kind !== 'game_over' && <TurnMarker seat={turnSeat} />}
      <HeldCards />
    </>
  )
}
