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

/** Monta a cena completa a partir da visão de mesa (TableView). */
export function CasinoScene() {
  const table = useGameStore((s) => s.table)
  const cardsOpen = useInterfaceStore((s) => s.cardsOpen)
  const opponents = table.players.filter((p) => p.id !== table.localPlayerId)
  const me = table.players.find((p) => p.id === table.localPlayerId)
  const turnSeat = table.players.find((p) => p.id === table.currentTurnPlayerId)?.seat ?? 0

  const coins = useMemo(() => {
    const all: CoinPlacement[] = []
    const y = TABLE.surfaceY
    // moedas de cada jogador, à direita de quem está sentado
    for (const p of table.players) {
      const a = seatAngle(p.seat)
      const [cx, cz] = seatPoint(p.seat, 0.98)
      const right = new THREE.Vector2(Math.cos(a), -Math.sin(a)) // direita do jogador sentado
      const sx = cx + right.x * 0.24
      const sz = cz + right.y * 0.24
      all.push(...stackPlacements(sx, y, sz, p.coins, p.seat + 3))
    }
    // tesouro: pilhas de alturas variadas
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
  }, [table.players])

  return (
    <>
      <CameraController />
      <Lighting />
      <CasinoRoom />
      <PokerTable />

      {/* cadeiras vazias completam a mesa de 6 lugares */}
      {Array.from({ length: TABLE.seatCount }, (_, seat) => seat)
        .filter((seat) => seat !== 0)
        .map((seat) => {
          const [x, z] = seatPoint(seat, TABLE.seatRadius)
          return <Chair key={seat} position={[x, 0, z]} rotation-y={seatAngle(seat) + Math.PI} />
        })}

      {opponents.map((p, i) => {
        const [x, z] = seatPoint(p.seat, TABLE.seatRadius)
        const look = AVATAR_LOOKS[p.id]
        return (
          <group key={p.id}>
            {look && (
              <group position={[x, 0, z]} rotation-y={seatAngle(p.seat) + Math.PI}>
                <PlayerAvatar look={look} cardsInHand={p.hiddenInfluenceCount} lookAt={LOCAL_EYE} phase={i * 2.3} />
              </group>
            )}
            <Html position={[x, AVATAR_TAG_HEIGHT, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <PlayerTag player={p} isTurn={p.id === table.currentTurnPlayerId} />
            </Html>
            <RevealedCards seat={p.seat} cards={p.revealed} />
          </group>
        )
      })}

      {/* cartas do jogador local, viradas para baixo na mesa (somem quando ele as pega) */}
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

      <CourtDeck count={table.courtCount} />
      <CoinField coins={coins} />
      <TurnMarker seat={turnSeat} />
      <HeldCards />
    </>
  )
}
