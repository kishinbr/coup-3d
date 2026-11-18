import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'

export const COIN_RADIUS = 0.024
export const COIN_HEIGHT = 0.0055

export interface CoinPlacement {
  position: [number, number, number]
  rotation?: [number, number, number]
}

/** Gera posições de uma pilha de moedas, com leve desalinhamento natural. */
export function stackPlacements(x: number, y: number, z: number, count: number, seed = 1): CoinPlacement[] {
  let s = seed * 9301 + 49297
  const r = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280 - 0.5
  }
  return Array.from({ length: count }, (_, i) => ({
    position: [x + r() * 0.004, y + COIN_HEIGHT / 2 + i * COIN_HEIGHT, z + r() * 0.004] as [number, number, number],
    rotation: [0, r() * Math.PI, 0] as [number, number, number],
  }))
}

/**
 * Todas as moedas da cena num único InstancedMesh (GDD §13.4).
 * Cada moeda tem uma borda e uma face com relevo simples.
 */
export function CoinField({ coins }: { coins: CoinPlacement[] }) {
  const geometry = useMemo(() => makeCoinGeometry(), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d4a94f', metalness: 1, roughness: 0.28, envMapIntensity: 1.3 }),
    [],
  )
  return (
    <Instances geometry={geometry} material={material} limit={256} castShadow receiveShadow>
      {coins.map((c, i) => (
        <Instance key={i} position={c.position} rotation={c.rotation} />
      ))}
    </Instances>
  )
}

/** Moeda com borda elevada (perfil torneado). */
function makeCoinGeometry(): THREE.BufferGeometry {
  const r = COIN_RADIUS
  const h = COIN_HEIGHT / 2
  const pts = [
    new THREE.Vector2(0, h * 0.55),
    new THREE.Vector2(r * 0.72, h * 0.55),
    new THREE.Vector2(r * 0.8, h),
    new THREE.Vector2(r * 0.97, h),
    new THREE.Vector2(r, h * 0.7),
    new THREE.Vector2(r, -h * 0.7),
    new THREE.Vector2(r * 0.97, -h),
    new THREE.Vector2(r * 0.8, -h),
    new THREE.Vector2(r * 0.72, -h * 0.55),
    new THREE.Vector2(0, -h * 0.55),
  ].reverse() // a Lathe espera os pontos de baixo para cima (normais para fora)
  const g = new THREE.LatheGeometry(pts, 28)
  g.computeVertexNormals()
  return g
}
