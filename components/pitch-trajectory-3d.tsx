"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Line, Sphere, Box, Environment } from "@react-three/drei"
import { useRef, useState, useMemo } from "react"
import * as THREE from "three"

// Helper to get a number or throw
function getNumber(v: any, name: string) {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) throw new Error(`Missing or invalid value for ${name}`)
  return n
}

function getTrajectoryPointsFromSQL(pitch: any, numPoints = 150) {
  const pt = pitch.pitch_trajectory || {}
  const pm = pitch.pitching_metrics || {}
  const Xc0 = getNumber(pt.pitch_trajectory_xc0, "pitch_trajectory_xc0")
  const Xc1 = getNumber(pt.pitch_trajectory_xc1, "pitch_trajectory_xc1")
  const Xc2 = getNumber(pt.pitch_trajectory_xc2, "pitch_trajectory_xc2")
  const Yc0 = getNumber(pt.pitch_trajectory_yc0, "pitch_trajectory_yc0")
  const Yc1 = getNumber(pt.pitch_trajectory_yc1, "pitch_trajectory_yc1")
  const Yc2 = getNumber(pt.pitch_trajectory_yc2, "pitch_trajectory_yc2")
  const Zc0 = getNumber(pt.pitch_trajectory_zc0, "pitch_trajectory_zc0")
  const Zc1 = getNumber(pt.pitch_trajectory_zc1, "pitch_trajectory_zc1")
  const Zc2 = getNumber(pt.pitch_trajectory_zc2, "pitch_trajectory_zc2")
  const ZoneTimeRaw = parseFloat(pm.zone_time)
  const ZoneTime = Number.isFinite(ZoneTimeRaw) && ZoneTimeRaw > 0 ? ZoneTimeRaw : 0.5

  const t = Array.from({ length: numPoints }, (_, i) => (i * ZoneTime) / (numPoints - 1))
  const rawX = t.map(ti => Xc0 + Xc1 * ti + Xc2 * ti * ti)
  const rawY = t.map(ti => Yc0 + Yc1 * ti + Yc2 * ti * ti)
  const rawZ = t.map(ti => Zc0 + Zc1 * ti + Zc2 * ti * ti)

  // Assign axes directly based on known mapping
  const forward = rawX;
  const lateral = rawZ;
  const vertical = rawY;
  const invertForward = forward[0] > forward.at(-1)!

  // --- ADJUSTMENT: Shift forward so that the last point is at y = 0 ---
  const yOffset = forward[forward.length - 1];
  const adjustedForward = forward.map(y => y - yOffset);

  return {
    lateral,
    forward: adjustedForward, // y = 0 at plate
    vertical,
    invertForward,
    ZoneTime
  }
}

function PitchPath({ selectedPitch }: { selectedPitch?: any }) {
  const lineRef = useRef<THREE.Group>(null)
  const ballRef = useRef<THREE.Mesh>(null)
  // Animation state
  const [animTime, setAnimTime] = useState(0);
  const hangTime = 2; // your hang_time value

  // Always call hooks, but conditionally use their results
  const traj = useMemo(() => {
    if (!selectedPitch || !selectedPitch.pitch_trajectory || !selectedPitch.pitching_metrics) {
      return null
    }
    try {
      return getTrajectoryPointsFromSQL(selectedPitch)
    } catch (e) {
      return null
    }
  }, [selectedPitch])

  const curve = useMemo(() => {
    if (!traj) return null
    const { lateral, forward, vertical } = traj
    const points = lateral.map((_: any, i: number) => new THREE.Vector3(lateral[i], forward[i], vertical[i]))
    return new THREE.CatmullRomCurve3(points)
  }, [traj])

  const linePoints = useMemo(() => {
    if (!curve) return []
    const pts = []
    for (let i = 0; i <= 100; i++) {
      pts.push(curve.getPoint(i / 100))
    }
    return pts
  }, [curve])

  useFrame((state, delta) => {
    if (!curve) return
    setAnimTime(prev => {
      const next = prev + .75*delta;
      if (next >= hangTime) {
        return 0; // restart from beginning
      }
      return next;
    });
    if (ballRef.current) {
      const position = curve.getPoint(animTime)
      ballRef.current.position.copy(position)
    }
  })

  if (!traj || !curve) return null

  return (
    <group ref={lineRef}>
      <Line points={linePoints} color="#ff6b35" lineWidth={3} transparent opacity={0.8} />
      <Sphere ref={ballRef} args={[0.2]} position={curve ? curve.getPoint(0) : [0, 0, 0]}>
        <meshStandardMaterial color="white" />
      </Sphere>
    </group>
  )
}

function StrikeZone() {
  return (
    <group position={[0, 0, 0]}>
      {/* Strike zone outline */}
      <Line
        points={[
          [0.83, 0, 1.5],
          [-0.83, 0, 1.5],
          [-0.83, 0, 3.5],
          [0.83, 0, 3.5],
          [0.83, 0, 1.5],
        ]}
        color="#ffffff"
        lineWidth={2}
      />

      {/* Home plate (flat at z=1) */}
      <Box args={[1.4, 1.4, 0.05]} position={[0, 0, .1]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>

      {/* Pitcher's mound (z=1, y=60.5) */}
      <Box args={[2, 2, 0.2]} position={[0, 60.5, .1]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>
    </group>
  )
}

function BaseballField() {
  return (
    <group>
      {/* Ground (flat at z=0) */}
      <Box args={[100, 100, 0.1]} position={[0, 0, 0.05]}>
        <meshStandardMaterial color="#2d5016" />
      </Box>

      {/* Pitcher's rubber (z=1, y=60.5) */}
      <Box args={[0.5, 0.2, 0.1]} position={[0, 60.5, 1]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
    </group>
  )
}

interface PitchTrajectory3DProps {
  selectedPitch?: any
  fixedCameraPosition?: { x: number, y: number, z: number }
  showCatcherViewButton?: boolean
}

// Camera controller component
function CameraController({ isCatcherView }: { isCatcherView: boolean }) {
  const { camera } = useThree()

  useFrame(() => {
    if (isCatcherView) {
      // Set camera to catcher view position
      camera.position.set(0.03, -7.74, 2.62)
      camera.lookAt(0, 5, 0)
    }
  })

  return null
}

export default function PitchTrajectory3D({ selectedPitch, fixedCameraPosition, showCatcherViewButton = false }: PitchTrajectory3DProps) {
  const [isCatcherView, setIsCatcherView] = useState(false)

  const handleCatcherView = () => {
    setIsCatcherView(true)
  }

  const handleResetView = () => {
    setIsCatcherView(false)
  }

  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden relative">
      {/* Catcher View Button */}
      {showCatcherViewButton && (
        <div className="absolute top-4 left-4 z-10">
          {!isCatcherView ? (
            <button
              onClick={handleCatcherView}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Catcher View
            </button>
          ) : (
            <button
              onClick={handleResetView}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Reset View
            </button>
          )}
        </div>
      )}

      <Canvas camera={{ position: [10, -20, 8], fov: 60 }}>
        <Environment preset="night" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, -20, 10]} intensity={1} />
        <pointLight position={[0, -30, 10]} intensity={0.5} color="#ff6b35" />

        <BaseballField />
        <StrikeZone />
        <PitchPath selectedPitch={selectedPitch} />

        <Text
          position={[0, -60, 8]}
          fontSize={1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          PITCHER
        </Text>

        <Text
          position={[0, 5, -2]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          HOME PLATE
        </Text>

        <OrbitControls 
          enablePan={!isCatcherView} 
          enableZoom={!isCatcherView} 
          enableRotate={!isCatcherView} 
          minDistance={5} 
          maxDistance={50}
        />
        <CameraController isCatcherView={isCatcherView} />
      </Canvas>
    </div>
  )
}
