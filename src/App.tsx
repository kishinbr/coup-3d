import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { CasinoScene } from './components/game/CasinoScene'
import { GameHUD } from './components/interface/GameHUD'
import { PALETTE } from './game/constants/palette'

export default function App() {
  return (
    <div className="app">
      <Canvas
        className="scene"
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 56, near: 0.05, far: 40, position: [0, 1.24, 1.72] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}
        style={{ background: PALETTE.background }}
      >
        <Suspense fallback={null}>
          <CasinoScene />
        </Suspense>
      </Canvas>
      <GameHUD />
    </div>
  )
}
