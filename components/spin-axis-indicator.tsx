import React from "react"

interface SpinAxisIndicatorProps {
  spin_axis: number | null | undefined
  size?: number // px
}

export default function SpinAxisIndicator({ spin_axis, size = 64 }: SpinAxisIndicatorProps) {
  if (spin_axis == null || isNaN(spin_axis)) return null

  // Convert spin_axis to radians for SVG math
  // 180deg = 12 o'clock (up), 270 = 3 o'clock (right), 360/0 = 6 o'clock (down), 90 = 9 o'clock (left)
  // SVG 0deg is to the right, so we rotate -90deg to make 0deg = down
  const angleRad = ((spin_axis - 90) * Math.PI) / 180
  const r = size / 2 - 8 // radius for arrow tip
  const cx = size / 2
  const cy = size / 2
  const arrowX = cx + r * Math.cos(angleRad)
  const arrowY = cy + r * Math.sin(angleRad)

  // Axis of rotation: perpendicular to spin axis (angle + 90deg)
  const perpAngleRad = angleRad + Math.PI / 2
  const axisX1 = cx + (size / 2 - 6) * Math.cos(perpAngleRad)
  const axisY1 = cy + (size / 2 - 6) * Math.sin(perpAngleRad)
  const axisX2 = cx - (size / 2 - 6) * Math.cos(perpAngleRad)
  const axisY2 = cy - (size / 2 - 6) * Math.sin(perpAngleRad)

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        {/* Circle */}
        <circle cx={cx} cy={cy} r={size / 2 - 4} fill="#fff" stroke="#ddd" strokeWidth="2" />
        {/* Axis of rotation (perpendicular line) */}
        <line
          x1={axisX1}
          y1={axisY1}
          x2={axisX2}
          y2={axisY2}
          stroke="#888"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        {/* Arrow (spin axis) */}
        <line
          x1={cx}
          y1={cy}
          x2={arrowX}
          y2={arrowY}
          stroke="#222"
          strokeWidth={3}
          markerEnd="url(#arrowhead)"
        />
        {/* Arrowhead marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <polygon points="0,0 8,4 0,8" fill="#222" />
          </marker>
        </defs>
      </svg>
    </div>
  )
} 