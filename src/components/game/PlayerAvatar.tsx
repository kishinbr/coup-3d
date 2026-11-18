import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AvatarLook } from '../../game/types/player'
import { PlayingCard } from './PlayingCard'

/**
 * Personagem PROVISÓRIO da Fase 1, montado com geometrias em código.
 * Proporções levemente caricatas (cabeça grande, ombros largos) e identidade
 * própria por cabelo, rosto e roupa. Será trocado por modelos GLB na Fase 2.
 * Frente voltada para +Z; origem no chão, no centro do assento.
 */

const HIP_Y = 0.52
const HEAD_Y = 1.39

interface Props {
  look: AvatarLook
  /** Quantidade de cartas ocultas na mão (só o verso é desenhado). */
  cardsInHand: number
  /** Ponto (no mundo) para onde o personagem tende a olhar. */
  lookAt: THREE.Vector3
  phase?: number
  /** Eliminado: abaixa a cabeça e larga as cartas (GDD §8.1). */
  eliminated?: boolean
}

export function PlayerAvatar({ look, cardsInHand, lookAt, phase = 0, eliminated = false }: Props) {
  const root = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  const mat = useMemo(() => {
    const std = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    return {
      skin: std(look.skin, 0.62),
      skinShade: std(new THREE.Color(look.skin).multiplyScalar(0.86).getStyle(), 0.65),
      hair: std(look.hair, 0.55),
      outfit: std(look.outfit, look.dress ? 0.45 : 0.6, look.dress ? 0.1 : 0),
      pants: std('#151111', 0.8),
      shirt: std(look.shirt, 0.7),
      accent: std(look.outfitAccent, 0.3, 1),
      eyeWhite: std('#f4ede2', 0.3),
      iris: std('#2a1810', 0.2),
      brow: std(new THREE.Color(look.hair).multiplyScalar(0.8).getStyle(), 0.8),
      lips: std(look.dress ? '#9b2530' : new THREE.Color(look.skin).multiplyScalar(0.7).getStyle(), 0.5),
    }
  }, [look])

  const torso = useMemo(() => makeTorso(!!look.dress), [look.dress])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (chest.current) chest.current.scale.y = 1 + Math.sin(t * 1.5) * 0.012
    if (head.current && root.current) {
      // vira a cabeça na direção do alvo, com limites e um leve balanço
      tmp.copy(lookAt)
      root.current.worldToLocal(tmp)
      const yaw = eliminated ? 0 : THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -0.6, 0.6)
      const sway = Math.sin(t * 0.37) * 0.12 + Math.sin(t * 0.83) * 0.04
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, yaw * 0.7 + sway * (eliminated ? 0.3 : 1), 0.05)
      const pitch = eliminated ? 0.5 : Math.sin(t * 0.5) * 0.03 + 0.04
      head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, pitch, 0.05)
      head.current.rotation.z = Math.sin(t * 0.29) * 0.025
    }
    if (eyes.current) {
      // piscar a cada ~4 s
      const cycle = (t * 0.27) % 1
      eyes.current.scale.y = cycle < 0.03 ? 0.15 : 1
    }
  })

  // braços: ombro → cotovelo → pulso (coordenadas locais)
  const armL = { shoulder: v(0.235, 1.08, -0.04), elbow: v(0.3, 0.88, 0.14), wrist: v(0.16, 0.875, 0.4) }
  const armR = { shoulder: v(-0.235, 1.08, -0.04), elbow: v(-0.3, 0.88, 0.14), wrist: v(-0.15, 0.9, 0.38) }
  const sleeve = look.dress ? mat.skin : mat.outfit

  return (
    <group ref={root}>
      {/* pernas (quase todas escondidas sob a mesa) */}
      <Limb from={v(0.1, HIP_Y, 0)} to={v(0.11, 0.5, 0.36)} radius={0.075} material={look.dress ? mat.outfit : mat.pants} />
      <Limb from={v(-0.1, HIP_Y, 0)} to={v(-0.11, 0.5, 0.36)} radius={0.075} material={look.dress ? mat.outfit : mat.pants} />

      <group ref={chest} position={[0, HIP_Y, -0.04]}>
        <group rotation-x={0.07}>
          <mesh geometry={torso.lower} material={mat.outfit} scale={look.dress ? [0.86, 1, 0.62] : [1, 1, 0.68]} castShadow />
          {torso.upper && <mesh geometry={torso.upper} material={mat.skin} scale={[0.86, 1, 0.62]} castShadow />}
          {!look.dress && <mesh geometry={shirtGeometry} material={mat.shirt} />}
          {!look.dress && <Lapels material={mat.accent} />}
          {look.dress && (
            <mesh material={mat.accent} position={[0, 0.6, 0.02]} rotation-x={Math.PI / 2 + 0.5} scale={[1, 0.8, 1]}>
              <torusGeometry args={[0.09, 0.006, 6, 32]} />
            </mesh>
          )}
          {/* pescoço */}
          <mesh material={mat.skinShade} position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.052, 0.058, 0.14, 14]} />
          </mesh>
          {/* gola alta (ternos) */}
          {!look.dress && (
            <mesh material={mat.outfit} position={[0, 0.69, -0.012]}>
              <cylinderGeometry args={[0.085, 0.1, 0.08, 18, 1, true, Math.PI * 0.3, Math.PI * 1.4]} />
            </mesh>
          )}
        </group>
      </group>

      {/* braços */}
      <Limb from={armL.shoulder} to={armL.elbow} radius={0.058} material={sleeve} />
      <Limb from={armL.elbow} to={armL.wrist} radius={0.05} material={sleeve} />
      <Limb from={armR.shoulder} to={armR.elbow} radius={0.058} material={sleeve} />
      <Limb from={armR.elbow} to={armR.wrist} radius={0.05} material={sleeve} />
      {[armL, armR].map((arm, i) => (
        <group key={i}>
          {!look.dress && (
            <mesh material={mat.accent} position={arm.wrist} rotation={[Math.PI / 2 - 0.2, 0, i === 0 ? 0.5 : -0.5]}>
              <torusGeometry args={[0.05, 0.008, 6, 20]} />
            </mesh>
          )}
          <mesh material={mat.skin} position={[arm.wrist.x * 0.92, arm.wrist.y + 0.005, arm.wrist.z + 0.05]} scale={[1, 0.65, 1.25]} castShadow>
            <sphereGeometry args={[0.045, 14, 10]} />
          </mesh>
        </group>
      ))}
      {/* cartas na mão direita: só o verso, nunca a identidade */}
      <group position={[armR.wrist.x * 0.92 - 0.005, armR.wrist.y + 0.07, armR.wrist.z + 0.06]} rotation={[-0.35, Math.PI, 0]}>
        {Array.from({ length: cardsInHand }, (_, i) => (
          <PlayingCard key={i} position={[i * 0.03 - 0.015, 0, i * -0.002]} rotation-z={(i - (cardsInHand - 1) / 2) * -0.22} />
        ))}
      </group>

      {/* cabeça */}
      <group ref={head} position={[0, HEAD_Y, -0.02]}>
        <mesh material={mat.skin} scale={[0.95, 1.08, 0.95]} castShadow>
          <sphereGeometry args={[0.15, 32, 24]} />
        </mesh>
        {/* queixo/mandíbula */}
        <mesh material={mat.skin} position={[0, -0.07, 0.03]} scale={[look.dress ? 0.8 : 0.95, 0.7, 0.85]}>
          <sphereGeometry args={[0.1, 20, 14]} />
        </mesh>
        {/* orelhas */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={mat.skinShade} position={[s * 0.142, -0.005, -0.005]} scale={[0.45, 1, 0.7]}>
            <sphereGeometry args={[0.032, 10, 8]} />
          </mesh>
        ))}
        {/* olhos */}
        <group ref={eyes} position={[0, 0.018, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.054, 0, 0.118]}>
              <mesh material={mat.eyeWhite} scale={[1, 0.82, 0.55]}>
                <sphereGeometry args={[0.03, 16, 12]} />
              </mesh>
              <mesh material={mat.iris} position={[0, -0.002, 0.014]} scale={[1, 1, 0.5]}>
                <sphereGeometry args={[0.017, 12, 10]} />
              </mesh>
            </group>
          ))}
        </group>
        {/* sobrancelhas: dão a personalidade */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            material={mat.brow}
            position={[s * 0.056, 0.064, 0.135]}
            rotation={[0, 0, browTilt(look) * s]}
          >
            <boxGeometry args={[0.058, look.beard ? 0.016 : 0.011, 0.012]} />
          </mesh>
        ))}
        {/* nariz */}
        <mesh material={mat.skinShade} position={[0, -0.018, 0.148]} scale={[0.75, 1.1, 1]}>
          <sphereGeometry args={[0.022, 12, 10]} />
        </mesh>
        {/* boca */}
        <mesh material={mat.lips} position={[look.dress ? 0 : 0.008, -0.068, look.beard ? 0.16 : 0.133]} rotation-z={look.dress ? 0 : 0.08}>
          <boxGeometry args={[look.dress ? 0.045 : 0.05, look.dress ? 0.014 : 0.008, 0.012]} />
        </mesh>
        <Hair look={look} material={mat.hair} accent={mat.accent} />
      </group>
    </group>
  )
}

function browTilt(look: AvatarLook): number {
  if (look.beard) return 0.22 // olhar severo
  if (look.dress) return -0.12 // arqueada, confiante
  return 0.05
}

function Hair({ look, material, accent }: { look: AvatarLook; material: THREE.Material; accent: THREE.Material }) {
  const cap = (
    <mesh material={material} position={[0, 0.012, -0.012]} rotation-x={look.hairStyle === 'bun' ? -0.55 : -0.42} scale={[1.02, 1.05, 1.06]}>
      <sphereGeometry args={[0.158, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
    </mesh>
  )
  switch (look.hairStyle) {
    case 'slick':
      return (
        <group>
          {cap}
          {/* topete penteado para trás */}
          <mesh material={material} position={[0.025, 0.125, 0.06]} rotation={[-0.5, 0, -0.25]} scale={[1.5, 0.6, 1.2]}>
            <sphereGeometry args={[0.07, 16, 12]} />
          </mesh>
          {/* costeletas */}
          {[-1, 1].map((s) => (
            <mesh key={s} material={material} position={[s * 0.138, 0.01, 0.045]} scale={[0.4, 1.2, 0.8]}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
          ))}
        </group>
      )
    case 'bun':
      return (
        <group>
          {cap}
          {/* coque */}
          <mesh material={material} position={[0, 0.13, -0.1]}>
            <sphereGeometry args={[0.075, 18, 14]} />
          </mesh>
          <mesh material={material} position={[0, 0.06, -0.12]} scale={[1.2, 1, 0.8]}>
            <sphereGeometry args={[0.09, 16, 12]} />
          </mesh>
          {/* franja repartida ao lado */}
          <mesh material={material} position={[-0.05, 0.1, 0.1]} rotation={[-0.9, 0, 0.5]} scale={[1.3, 0.5, 0.9]}>
            <sphereGeometry args={[0.06, 14, 10]} />
          </mesh>
          {/* mechas laterais */}
          {[-1, 1].map((s) => (
            <mesh key={s} material={material} position={[s * 0.13, -0.05, 0.05]} rotation-z={s * 0.15} scale={[0.5, 1, 0.7]}>
              <capsuleGeometry args={[0.03, 0.12, 4, 8]} />
            </mesh>
          ))}
          {/* brincos */}
          {[-1, 1].map((s) => (
            <mesh key={`e${s}`} material={accent} position={[s * 0.148, -0.05, 0]}>
              <sphereGeometry args={[0.012, 8, 8]} />
            </mesh>
          ))}
        </group>
      )
    case 'swept':
      return (
        <group>
          {cap}
          {/* cabelo da nuca */}
          <mesh material={material} position={[0, -0.02, -0.06]} scale={[1.02, 1.0, 0.85]}>
            <sphereGeometry args={[0.15, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.45]} />
          </mesh>
          {/* barba */}
          <mesh material={material} position={[0, -0.075, 0.035]} scale={[0.95, 0.85, 0.9]}>
            <sphereGeometry args={[0.13, 24, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58]} />
          </mesh>
          {/* bigode */}
          <mesh material={material} position={[0, -0.045, 0.148]} rotation-z={Math.PI / 2} scale={[0.6, 1, 0.7]}>
            <capsuleGeometry args={[0.018, 0.06, 4, 8]} />
          </mesh>
        </group>
      )
  }
}

function Lapels({ material }: { material: THREE.Material }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={material} position={[s * 0.06, 0.5, 0.135]} rotation={[0.25, s * 0.35, s * 0.32]}>
          <boxGeometry args={[0.014, 0.26, 0.006]} />
        </mesh>
      ))}
    </group>
  )
}

/** Abertura em "V" da camisa sobre o peito do terno. */
const shirtGeometry = (() => {
  const g = new THREE.BufferGeometry()
  const verts = new Float32Array([
    0.085, 0.665, 0.085, // ordem anti-horária vista de frente
    -0.085, 0.665, 0.085,
    0, 0.36, 0.142,
  ])
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  g.computeVertexNormals()
  return g
})()

/** Tronco torneado: ombros largos, cintura fina. Dividido em parte baixa e alta (decote do vestido). */
function makeTorso(dress: boolean) {
  const profile: [number, number][] = [
    [0.0, 0],
    [0.17, 0.0],
    [0.19, 0.08],
    [0.175, 0.24],
    [0.215, 0.42],
    [0.25, 0.55],
    [0.235, 0.6],
    [0.165, 0.65],
    [0.07, 0.69],
    [0.0, 0.7],
  ]
  const split = dress ? 0.6 : 0.7
  const lower = profile.filter(([, y]) => y <= split)
  const upper = profile.filter(([, y]) => y >= split)
  if (dress) {
    // ponto de corte interpolado para os dois pedaços se encontrarem
    lower.push([0.235, split])
    upper.unshift([0, split], [0.235, split])
  }
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28)
  return { lower: lathe(lower), upper: dress ? lathe(upper) : null }
}

function v(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z)
}

const UP = new THREE.Vector3(0, 1, 0)

/** Cápsula entre dois pontos (braços e pernas). */
function Limb({ from, to, radius, material }: { from: THREE.Vector3; to: THREE.Vector3; radius: number; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = to.clone().sub(from)
    const length = dir.length()
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
      length,
    }
  }, [from, to])
  return (
    <mesh material={material} position={position} quaternion={quaternion} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.001, length), 4, 12]} />
    </mesh>
  )
}

export const AVATAR_TAG_HEIGHT = 1.78
