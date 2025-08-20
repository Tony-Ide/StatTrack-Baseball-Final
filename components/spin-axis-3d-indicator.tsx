import React, { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Line, Sphere } from "@react-three/drei"
import * as THREE from "three"

interface SpinAxis3DIndicatorProps {
  spin_axis: number | null | undefined
  size?: number // px
}

function SpinAxis3DScene({ spin_axis }: { spin_axis: number }) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Create golf ball texture with small ridges
  const golfBallTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    
    // Add subtle shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, 512, 512)
    
    // Draw golf ball dimples/ridges
    ctx.fillStyle = '#e0e0e0'
    
    // Create a pattern of larger, more noticeable circular ridges
    const dimpleSize = 12
    const spacing = 25
    
    for (let y = spacing; y < 512 - spacing; y += spacing) {
      for (let x = spacing; x < 512 - spacing; x += spacing) {
        // Add some randomness to the pattern
        const offsetX = (Math.random() - 0.5) * 8
        const offsetY = (Math.random() - 0.5) * 8
        
        // Outer ridge (darker)
        ctx.fillStyle = '#d0d0d0'
        ctx.beginPath()
        ctx.arc(x + offsetX, y + offsetY, dimpleSize, 0, 2 * Math.PI)
        ctx.fill()
        
        // Middle ridge (medium)
        ctx.fillStyle = '#e0e0e0'
        ctx.beginPath()
        ctx.arc(x + offsetX, y + offsetY, dimpleSize * 0.7, 0, 2 * Math.PI)
        ctx.fill()
        
        // Inner ridge (lighter, creating depth)
        ctx.fillStyle = '#f5f5f5'
        ctx.beginPath()
        ctx.arc(x + offsetX, y + offsetY, dimpleSize * 0.4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])
  
  // 180deg = 12 o'clock (up), 270 = 3 o'clock (right), 360/0 = 6 o'clock (down), 90 = 9 o'clock (left)
  // In math, 0deg is +X, so we rotate -90deg to make 0deg = down
  const angleRad = ((spin_axis - 90) * Math.PI) / 180
  const perpAngleRad = angleRad + Math.PI / 2
  const r = 0.9 // length of lines from center

  // Invert X axis by multiplying all X coordinates by -1
  const inv = (x: number) => -x

  // Spin axis arrow (from center to edge)
  const spinAxisArrowEnd: [number, number, number] = [inv(r * Math.cos(angleRad)), r * Math.sin(angleRad), 0]
  // Axis of rotation (perpendicular, full diameter)
  const axisStart: [number, number, number] = [inv(r * Math.cos(perpAngleRad)), r * Math.sin(perpAngleRad), 0]
  const axisEnd: [number, number, number] = [inv(-r * Math.cos(perpAngleRad)), -r * Math.sin(perpAngleRad), 0]

  // Arrowhead for spin axis
  const arrowHeadLength = 0.18
  const arrowHeadAngle = Math.PI / 8
  const arrowBase: [number, number, number] = [
    spinAxisArrowEnd[0] - inv(arrowHeadLength * Math.cos(angleRad)),
    spinAxisArrowEnd[1] - arrowHeadLength * Math.sin(angleRad),
    0
  ]
  const arrowLeft: [number, number, number] = [
    arrowBase[0] + inv(arrowHeadLength * Math.cos(angleRad + arrowHeadAngle)),
    arrowBase[1] + arrowHeadLength * Math.sin(angleRad + arrowHeadAngle),
    0
  ]
  const arrowRight: [number, number, number] = [
    arrowBase[0] + inv(arrowHeadLength * Math.cos(angleRad - arrowHeadAngle)),
    arrowBase[1] + arrowHeadLength * Math.sin(angleRad - arrowHeadAngle),
    0
  ]

  // ----------  axis used for animation  ----------
  // world‑space unit vector along the dashed grey line
  const rotationAxis = useMemo(
    () =>
      new THREE.Vector3(
        inv(Math.cos(perpAngleRad)),   // use the same inv() function as the dashed line
         Math.sin(perpAngleRad),
         0
      ).normalize(),
    [perpAngleRad]
  );

  // Animation: spin the ball around the fixed world axis (ball‑on‑a‑stick)
  useFrame((_, delta) => {
    if (groupRef.current) {
      const rotationSpeed = 1.5;            // radians · s⁻¹
      groupRef.current.rotateOnWorldAxis(    // <— key change
        rotationAxis,
        delta * rotationSpeed
      );
    }
  });

  return (
    <>
      {/* Enhanced coordinate axes - STATIC, outside the rotating group */}
      {/* X-axis (red) */}
      <Line
        points={[[-1, 0, 0], [1, 0, 0]]}
        color="#ef4444"
        lineWidth={1.5}
      />
      {/* Y-axis (green) */}
      <Line
        points={[[0, -1, 0], [0, 1, 0]]}
        color="#22c55e"
        lineWidth={1.5}
      />
      {/* Z-axis indicator (blue dot at origin) */}
      <Sphere args={[0.06, 12, 12]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#3b82f6" />
      </Sphere>
      
      {/* Enhanced axis of rotation (solid red) - STATIC, outside the rotating group */}
      <Line
        points={[axisStart, axisEnd]}
        color="#ef4444"
        lineWidth={4}
      />
      
      {/* Rotating group: ball + spin axis + arrowhead */}
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Enhanced Golf Ball with better lighting */}
        <Sphere args={[0.5, 32, 32]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            map={golfBallTexture} 
            roughness={0.8}
            metalness={0.1}
          />
        </Sphere>
      </group>
    </>
  )
}

export default function SpinAxis3DIndicator({ spin_axis, size = 96 }: SpinAxis3DIndicatorProps) {
  if (spin_axis == null || isNaN(spin_axis)) return null
  return (
    <div style={{ width: size * 1.5, height: size * 1.5, position: "relative" }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 3], up: [0, 1, 0], zoom: 80, near: 0.1, far: 10 }}
        style={{ background: "none" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 2]} intensity={0.6} />
        <directionalLight position={[1, 1, 1]} intensity={0.3} />
        <SpinAxis3DScene spin_axis={spin_axis} />
      </Canvas>
    </div>
  )
} 