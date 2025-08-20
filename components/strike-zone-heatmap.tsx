"use client"

interface StrikeZoneHeatmapProps {
  side: "left" | "right"
}

export default function StrikeZoneHeatmap({ side }: StrikeZoneHeatmapProps) {
  // Mock heat map data - in real app this would come from props/API
  const heatmapData = [
    [0.2, 0.4, 0.3, 0.1],
    [0.6, 0.8, 0.9, 0.4],
    [0.7, 0.9, 0.8, 0.5],
    [0.3, 0.5, 0.4, 0.2],
    [0.1, 0.2, 0.1, 0.1],
  ]

  const getHeatColor = (intensity: number) => {
    if (intensity > 0.8) return "bg-red-500"
    if (intensity > 0.6) return "bg-orange-500"
    if (intensity > 0.4) return "bg-yellow-500"
    if (intensity > 0.2) return "bg-green-500"
    return "bg-blue-500"
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          vs. {side === "left" ? "Left-Handed" : "Right-Handed"} Hitters
        </h3>
      </div>

      <div className="relative">
        {/* Strike Zone */}
        <div className="grid grid-cols-4 gap-1 p-4 border-2 border-white rounded-lg bg-black/20">
          {heatmapData.map((row, rowIndex) =>
            row.map((intensity, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-12 h-12 rounded ${getHeatColor(intensity)} opacity-80 flex items-center justify-center text-white text-xs font-bold`}
              >
                {Math.round(intensity * 100)}
              </div>
            )),
          )}
        </div>

        {/* Labels */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm">Strike Zone</div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-400">Low</span>
        <div className="w-4 h-4 bg-blue-500 rounded"></div>
        <div className="w-4 h-4 bg-green-500 rounded"></div>
        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
        <div className="w-4 h-4 bg-orange-500 rounded"></div>
        <div className="w-4 h-4 bg-red-500 rounded"></div>
        <span className="text-gray-400">High</span>
      </div>
    </div>
  )
}
