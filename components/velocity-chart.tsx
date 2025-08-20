"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

const velocityData = [
  { game: 1, velocity: 93.2, maxVelo: 96.1 },
  { game: 2, velocity: 94.1, maxVelo: 97.2 },
  { game: 3, velocity: 93.8, maxVelo: 96.8 },
  { game: 4, velocity: 94.5, maxVelo: 97.8 },
  { game: 5, velocity: 93.9, maxVelo: 96.5 },
  { game: 6, velocity: 94.2, maxVelo: 97.1 },
  { game: 7, velocity: 94.8, maxVelo: 97.5 },
  { game: 8, velocity: 94.3, maxVelo: 97.0 },
]

interface VelocityChartProps {
  detailed?: boolean
}

export default function VelocityChart({ detailed = false }: VelocityChartProps) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={velocityData}>
          <defs>
            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="maxVeloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#e74c3c" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="game" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #ff6b35",
              borderRadius: "8px",
              color: "#ffffff",
            }}
          />
          <Area
            type="monotone"
            dataKey="velocity"
            stroke="#ff6b35"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#velocityGradient)"
            name="Avg Velocity"
          />
          {detailed && (
            <Area
              type="monotone"
              dataKey="maxVelo"
              stroke="#e74c3c"
              strokeWidth={2}
              fillOpacity={0.3}
              fill="url(#maxVeloGradient)"
              name="Max Velocity"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
