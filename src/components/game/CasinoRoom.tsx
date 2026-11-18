import { useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { MATERIAL_COLORS, PALETTE } from '../../game/constants/palette'
import { floorTexture, rugTexture, wallTexture } from '../../utils/textures'
import { Chandelier } from './Chandelier'

const ROOM_RADIUS = 7.5
const ROOM_HEIGHT = 4.6

/**
 * O salão do cassino clandestino: piso, tapete, paredes forradas, colunas,
 * cortinas de veludo, lustres e mesas ao fundo (só silhuetas, sem poluir a cena).
 */
export function CasinoRoom() {
  const m = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.55, metalness: 0.05, color: '#a48a78' }),
      rug: new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.9, side: THREE.BackSide }),
      wainscot: new THREE.MeshStandardMaterial({ color: MATERIAL_COLORS.woodDark, roughness: 0.45, side: THREE.BackSide }),
      ceiling: new THREE.MeshStandardMaterial({ color: '#120d0b', roughness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.35 }),
      column: new THREE.MeshStandardMaterial({ color: '#2a1d16', roughness: 0.5 }),
      velvet: new THREE.MeshStandardMaterial({ color: MATERIAL_COLORS.velvet, roughness: 0.75, side: THREE.DoubleSide }),
      silhouette: new THREE.MeshStandardMaterial({ color: '#0f0b0a', roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#2d4a2f', roughness: 0.7 }),
    }),
    [],
  )
  const curtainGeo = useMemo(() => makeCurtainGeometry(1.7, ROOM_HEIGHT - 0.3), [])

  // colunas e cortinas alternadas pelo perímetro
  const columns = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2 + Math.PI / 12)
  const curtains = columns.map((a) => a + Math.PI / 12)

  return (
    <group>
      <fog attach="fog" args={[PALETTE.background, 6, 15]} />
      <color attach="background" args={[PALETTE.background]} />

      {/* piso e tapete */}
      <mesh material={m.floor} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ROOM_RADIUS, 64]} />
      </mesh>
      <mesh material={m.rug} rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <circleGeometry args={[2.9, 72]} />
      </mesh>

      {/* paredes */}
      <mesh material={m.wall} position-y={ROOM_HEIGHT / 2}>
        <cylinderGeometry args={[ROOM_RADIUS, ROOM_RADIUS, ROOM_HEIGHT, 48, 1, true]} />
      </mesh>
      <mesh material={m.wainscot} position-y={0.55}>
        <cylinderGeometry args={[ROOM_RADIUS - 0.02, ROOM_RADIUS - 0.02, 1.1, 48, 1, true]} />
      </mesh>
      <mesh material={m.gold} position-y={1.1} rotation-x={Math.PI / 2}>
        <torusGeometry args={[ROOM_RADIUS - 0.04, 0.015, 6, 96]} />
      </mesh>
      <mesh material={m.ceiling} position-y={ROOM_HEIGHT} rotation-x={Math.PI / 2}>
        <circleGeometry args={[ROOM_RADIUS, 48]} />
      </mesh>

      {columns.map((a, i) => (
        <group key={i} position={[Math.sin(a) * (ROOM_RADIUS - 0.25), 0, Math.cos(a) * (ROOM_RADIUS - 0.25)]}>
          <mesh material={m.column} position-y={ROOM_HEIGHT / 2}>
            <cylinderGeometry args={[0.16, 0.18, ROOM_HEIGHT, 16]} />
          </mesh>
          <mesh material={m.gold} position-y={ROOM_HEIGHT - 0.25}>
            <cylinderGeometry args={[0.24, 0.17, 0.18, 16]} />
          </mesh>
          <mesh material={m.column} position-y={0.12}>
            <boxGeometry args={[0.42, 0.24, 0.42]} />
          </mesh>
        </group>
      ))}

      {curtains.map((a, i) => (
        <mesh
          key={i}
          geometry={curtainGeo}
          material={m.velvet}
          position={[Math.sin(a) * (ROOM_RADIUS - 0.35), (ROOM_HEIGHT - 0.3) / 2, Math.cos(a) * (ROOM_RADIUS - 0.35)]}
          rotation-y={a + Math.PI}
        />
      ))}

      {/* lustre principal sobre a mesa e lustres distantes */}
      <Chandelier position={[0, 3.15, 0]} />
      <Chandelier position={[-4.2, 3.6, -3.6]} scale={0.8} dim />
      <Chandelier position={[4.4, 3.6, -3.2]} scale={0.8} dim />

      {/* mesas ao fundo, com silhuetas de frequentadores */}
      {(
        [
          [-4.6, -3.2],
          [4.8, -2.6],
          [0.4, -5.6],
          [-5.4, 1.6],
        ] as const
      ).map(([x, z], i) => (
        <BackgroundTable key={i} x={x} z={z} silhouette={m.silhouette} gold={m.gold} seed={i} />
      ))}

      {/* arandelas (as luzes ficam em Lighting) */}
      {(
        [
          [-3.6, -5.6],
          [3.8, -5.4],
          [-6.4, -1.4],
          [6.5, -0.9],
        ] as const
      ).map(([x, z], i) => {
        const k = (ROOM_RADIUS - 0.08) / Math.hypot(x, z)
        return <Sconce key={i} position={[x * k, 2.2, z * k]} rotation-y={Math.atan2(x, z) + Math.PI} gold={m.gold} />
      })}

      {/* plantas */}
      <Plant position={[-6.3, 0, 1.2]} leaf={m.leaf} />
      <Plant position={[6.3, 0, 1.6]} leaf={m.leaf} />
    </group>
  )
}

function BackgroundTable({
  x,
  z,
  silhouette,
  gold,
  seed,
}: {
  x: number
  z: number
  silhouette: THREE.Material
  gold: THREE.Material
  seed: number
}) {
  const people = seed % 2 === 0 ? [0.9, 2.6] : [1.6, 3.6, 5.1]
  return (
    <group position={[x, 0, z]}>
      <mesh material={silhouette} position-y={0.72}>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 24]} />
      </mesh>
      <mesh material={silhouette} position-y={0.36}>
        <cylinderGeometry args={[0.08, 0.2, 0.72, 12]} />
      </mesh>
      {/* abajur */}
      <mesh material={gold} position-y={0.9}>
        <cylinderGeometry args={[0.015, 0.03, 0.3, 8]} />
      </mesh>
      <mesh position-y={1.08}>
        <cylinderGeometry args={[0.07, 0.14, 0.14, 16, 1, true]} />
        <meshStandardMaterial color="#ffb36b" emissive="#ff9a45" emissiveIntensity={2.2} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {people.map((a, i) => (
        <group key={i} position={[Math.sin(a) * 0.95, 0, Math.cos(a) * 0.95]} rotation-y={a + Math.PI}>
          <mesh material={silhouette} position-y={0.95} scale={[1.2, 1, 0.8]}>
            <capsuleGeometry args={[0.2, 0.45, 4, 12]} />
          </mesh>
          <mesh material={silhouette} position-y={1.48}>
            <sphereGeometry args={[0.13, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Sconce({ gold, ...props }: { gold: THREE.Material } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh material={gold} position-z={0.02}>
        <boxGeometry args={[0.12, 0.3, 0.03]} />
      </mesh>
      <mesh material={gold} position={[0, -0.02, 0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
      </mesh>
      <mesh position={[0, 0.06, 0.18]}>
        <cylinderGeometry args={[0.06, 0.1, 0.16, 16, 1, true]} />
        <meshStandardMaterial color="#ffc489" emissive="#ff9a45" emissiveIntensity={2.4} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* halo de luz na parede */}
      <mesh position={[0, 0.1, 0.005]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color="#ff8f40" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Plant({ position, leaf }: { position: [number, number, number]; leaf: THREE.Material }) {
  const leaves = Array.from({ length: 9 }, (_, i) => i)
  return (
    <group position={position}>
      <mesh position-y={0.3}>
        <cylinderGeometry args={[0.28, 0.22, 0.6, 20]} />
        <meshStandardMaterial color="#3a2a1d" roughness={0.6} />
      </mesh>
      {leaves.map((i) => {
        const a = (i / leaves.length) * Math.PI * 2
        const tilt = 0.5 + (i % 3) * 0.25
        return (
          <mesh
            key={i}
            material={leaf}
            position={[Math.sin(a) * 0.25, 1.05 + (i % 3) * 0.15, Math.cos(a) * 0.25]}
            rotation={[Math.cos(a) * tilt, 0, -Math.sin(a) * tilt]}
            scale={[0.12, 0.6, 0.04]}
          >
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Plano ondulado que imita as dobras de uma cortina de veludo. */
function makeCurtainGeometry(width: number, height: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, height, 48, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, Math.sin((x / width) * Math.PI * 9) * 0.06)
  }
  g.computeVertexNormals()
  return g
}
