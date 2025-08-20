"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const spinData = [
  { pitch: "FB", spinRate: 2485, avgSpin: 2300 },
  { pitch: "SL", spinRate: 2650, avgSpin: 2400 },
  { pitch: "CH", spinRate: 1850, avgSpin: 1750 },
  { pitch: "CB", spinRate: 2750, avgSpin: 2500 },
]

export default function SpinRateChart() {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={spinData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="pitch" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
          <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #4ecdc4",
              borderRadius: "8px",
              color: "#ffffff",
            }}
          />
          <Bar dataKey="spinRate" fill="#4ecdc4" name="Spin Rate" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avgSpin" fill="#374151" name="League Avg" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
