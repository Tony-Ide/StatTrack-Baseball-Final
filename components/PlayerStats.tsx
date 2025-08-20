"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

interface PlayerStatsProps {
  playerName: string
  playerType: "pitchers" | "hitters"
  team: string
  onBack: () => void
}

// Mock stats data - in real app this would come from TrackMan API
const mockPitcherStats = {
  "Velocity (mph)": "92.5",
  "Spin Rate (rpm)": "2,450",
  "Strike %": "65.2%",
  "Whiff %": "28.7%",
  "Ground Ball %": "45.3%",
  "Fly Ball %": "32.1%",
  "Line Drive %": "22.6%",
  ERA: "3.45",
}

const mockHitterStats = {
  "Exit Velocity (mph)": "89.3",
  "Launch Angle (°)": "12.5",
  "Hard Hit %": "42.8%",
  "Barrel %": "8.9%",
  "Sweet Spot %": "35.2%",
  "Ground Ball %": "38.7%",
  "Fly Ball %": "35.4%",
  "Line Drive %": "25.9%",
  "Batting Average": ".285",
}

export default function PlayerStats({ playerName, playerType, team, onBack }: PlayerStatsProps) {
  const stats = playerType === "pitchers" ? mockPitcherStats : mockHitterStats

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Player Selection
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{playerName}</h2>
          <p className="text-gray-600">
            {team} • {playerType === "pitchers" ? "Pitcher" : "Hitter"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TrackMan Statistics</CardTitle>
          <CardDescription>Latest performance metrics and analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats).map(([metric, value]) => (
              <div key={metric} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-600 mb-1">{metric}</div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Performance Trends</CardTitle>
          <CardDescription>Performance analysis over the last 10 games</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Performance charts and trends will be displayed here</p>
            <p className="text-sm mt-2">Integration with TrackMan data visualization coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
