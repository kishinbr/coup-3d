import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EYE_HEIGHT } from '../../game/constants/table'
import { useCameraStore } from '../../stores/cameraStore'
import { useInterfaceStore } from '../../stores/interfaceStore'

/**
 * Câmera híbrida em primeira pessoa (GDD §7).
 * - Clique na cena: captura o cursor (pointer lock) e o mouse passa a olhar ao redor.
 * - ESC: libera o cursor (comportamento padrão do navegador).
 * - Se o navegador/iframe bloquear o pointer lock, arrastar com o mouse também olha.
 * - A posição é fixa no assento; só a rotação muda, com limites confortáveis.
 * - "Ver minhas cartas": inclina a câmera para baixo e depois volta para onde estava.
 */

const SEAT_POSITION = new THREE.Vector3(0, EYE_HEIGHT, 1.72)
const BASE_PITCH = -0.16
const YAW_LIMIT = 1.15
const PITCH_MIN = -0.95
const PITCH_MAX = 0.32
const SENSITIVITY = 0.0022
const CARD_VIEW = { yaw: 0, pitch: -0.32 }

export function CameraController() {
  const { camera, gl } = useThree()
  const target = useRef({ yaw: 0, pitch: BASE_PITCH })
  const current = useRef({ yaw: 0, pitch: BASE_PITCH })
  const saved = useRef<{ yaw: number; pitch: number } | null>(null)
  const dragging = useRef(false)
  const setLocked = useCameraStore((s) => s.setLocked)
  const cardsOpen = useInterfaceStore((s) => s.cardsOpen)

  // ao abrir/fechar as cartas, guarda e restaura a direção do olhar
  useEffect(() => {
    if (cardsOpen) {
      saved.current = { ...target.current }
      target.current = { ...CARD_VIEW }
      if (document.pointerLockElement) document.exitPointerLock()
    } else if (saved.current) {
      target.current = saved.current
      saved.current = null
    }
  }, [cardsOpen])

  useEffect(() => {
    const el = gl.domElement
    const look = (dx: number, dy: number) => {
      if (useInterfaceStore.getState().cardsOpen) return
      const t = target.current
      t.yaw = THREE.MathUtils.clamp(t.yaw - dx * SENSITIVITY, -YAW_LIMIT, YAW_LIMIT)
      t.pitch = THREE.MathUtils.clamp(t.pitch - dy * SENSITIVITY, PITCH_MIN, PITCH_MAX)
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || useInterfaceStore.getState().cardsOpen) return
      dragging.current = true
      if (!document.pointerLockElement) {
        try {
          const req = el.requestPointerLock() as unknown as Promise<void> | undefined
          req?.catch?.(() => undefined)
        } catch {
          /* pointer lock indisponível: segue no modo de arrastar */
        }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (document.pointerLockElement === el || dragging.current) look(e.movementX, e.movementY)
    }
    const onUp = () => {
      dragging.current = false
    }
    const onLockChange = () => setLocked(document.pointerLockElement === el)
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const ui = useInterfaceStore.getState()
      if (e.key === 'c' || e.key === 'C') ui.toggleCards()
      if (e.key === 'Escape' && ui.cardsOpen) ui.setCardsOpen(false)
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.addEventListener('pointerlockchange', onLockChange)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl, setLocked])

  useFrame(({ clock }, delta) => {
    const c = current.current
    const t = target.current
    const speed = saved.current ? 6 : 12
    c.yaw = THREE.MathUtils.damp(c.yaw, t.yaw, speed, delta)
    c.pitch = THREE.MathUtils.damp(c.pitch, t.pitch, speed, delta)
    // respiração sutil: a câmera nunca fica completamente parada
    const breathe = Math.sin(clock.elapsedTime * 0.9) * 0.004
    camera.position.copy(SEAT_POSITION)
    camera.position.y += breathe * 0.5
    camera.rotation.set(c.pitch + breathe, c.yaw, 0, 'YXZ')
  })

  return null
}
