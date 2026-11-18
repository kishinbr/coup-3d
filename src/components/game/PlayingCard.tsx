import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import type { Influence } from '../../game/types/card'
import { cardBackTexture, cardFrontTexture } from '../../utils/textures'

/** Tamanho da carta em metros (levemente maior que o real para leitura na mesa). */
export const CARD_W = 0.09
export const CARD_H = 0.126
const THICKNESS = 0.0016

const edgeGeometry = new THREE.BoxGeometry(CARD_W * 0.985, CARD_H * 0.985, THICKNESS)
const faceGeometry = makeRoundedPlane(CARD_W, CARD_H, 0.008)
const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#d9c7a6', roughness: 0.8 })

type Props = ThreeElements['group'] & {
  /**
   * Influência da frente. Quando ausente, os dois lados mostram o verso:
   * cartas ocultas de adversários nunca carregam a identidade (GDD §6.6).
   */
  influence?: Influence
  /** Desenha por cima da cena (cartas na mão do jogador, junto à câmera). */
  overlay?: boolean
}

export function PlayingCard({ influence, overlay = false, ...group }: Props) {
  const [front, back] = useMemo(() => {
    const backTex = cardBackTexture()
    const frontTex = influence ? cardFrontTexture(influence) : backTex
    const make = (map: THREE.Texture) =>
      overlay
        ? new THREE.MeshBasicMaterial({ map, color: '#e6d3b4', depthTest: false, transparent: true })
        : new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.05 })
    return [make(frontTex), make(backTex)]
  }, [influence, overlay])

  const order = overlay ? 20 : 0
  return (
    <group {...group}>
      <mesh geometry={faceGeometry} material={front} position-z={THICKNESS / 2 + 0.0001} renderOrder={order + 1} castShadow={!overlay} />
      <mesh geometry={faceGeometry} material={back} position-z={-THICKNESS / 2 - 0.0001} rotation-y={Math.PI} renderOrder={order + 1} />
      {!overlay && <mesh geometry={edgeGeometry} material={edgeMaterial} castShadow receiveShadow />}
    </group>
  )
}

/** Plano com cantos arredondados e UV de 0 a 1. */
function makeRoundedPlane(w: number, h: number, r: number): THREE.BufferGeometry {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const g = new THREE.ShapeGeometry(s, 6)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h)
  }
  return g
}
