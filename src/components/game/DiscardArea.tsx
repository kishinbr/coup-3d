import { useMemo } from 'react'
import * as THREE from 'three'
import { TABLE, seatPoint } from '../../game/constants/table'
import type { Influence } from '../../game/types/card'
import { cardBackTexture } from '../../utils/textures'
import { CARD_H, CARD_W, PlayingCard } from './PlayingCard'

const CARD_THICK = 0.0016

/** Posições das zonas impressas no feltro (ver feltTexture). */
export const COURT_POSITION: [number, number] = [-0.312, 0.156]
export const TREASURY_POSITION: [number, number] = [0.312, 0.156]

/** A Corte: baralho central com as cartas restantes. */
export function CourtDeck({ count }: { count: number }) {
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#cdb994', roughness: 0.9 })
    const top = new THREE.MeshStandardMaterial({ map: cardBackTexture(), roughness: 0.6 })
    // ordem da BoxGeometry: +x, -x, +y, -y, +z, -z  (o topo do baralho é o +z, já que o grupo é girado)
    return [side, side, side, side, top, side]
  }, [])
  const h = Math.max(1, count) * CARD_THICK
  return (
    <group position={[COURT_POSITION[0], TABLE.surfaceY + h / 2, COURT_POSITION[1]]} rotation={[-Math.PI / 2, 0, 0.12]}>
      <mesh material={materials} castShadow receiveShadow>
        <boxGeometry args={[CARD_W, CARD_H, h]} />
      </mesh>
    </group>
  )
}

/**
 * Influências perdidas de um jogador: viradas para cima, na mesa, logo à frente
 * do personagem (GDD §2.3). Não voltam para a Corte.
 */
export function RevealedCards({ cards, seat }: { cards: Influence[]; seat: number }) {
  const [x, z] = seatPoint(seat, 0.82)
  // orientadas para quem olha do assento local, para leitura imediata
  return (
    <group position={[x, TABLE.surfaceY + 0.002, z]}>
      {cards.map((c, i) => (
        <PlayingCard
          key={i}
          influence={c}
          position={[(i - (cards.length - 1) / 2) * (CARD_W + 0.014), i * 0.0005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
    </group>
  )
}
