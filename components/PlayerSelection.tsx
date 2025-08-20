"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"

interface PlayerSelectionProps {
  onBack: () => void
  onPlayerSelect: (playerType: string, playerName: string, team?: string) => void
  teams: { team_id: string; name: string }[]
  userTeamId: string
  userTeamName: string
  pitchTypes?: string[]
}

// Mock data for opponents only
const opponentTeams = ["UCLA Bruins", "USC Trojans", "Stanford Cardinal", "Cal Bears"]
const opponentPitchers = ["Tom Wilson", "Steve Garcia", "Matt Rodriguez", "Kevin Lee"]
const opponentHitters = ["Carlos Martinez", "Tony Johnson", "Luis Gonzalez", "Mark Thompson"]

export default function PlayerSelection({ onBack, onPlayerSelect, teams, userTeamId, userTeamName }: PlayerSelectionProps) {
  const [selectedTeamType, setSelectedTeamType] = useState<"uci" | "opponent" | null>(null)
  const [selectedOpponentTeam, setSelectedOpponentTeam] = useState("")
  const [selectedPlayerType, setSelectedPlayerType] = useState<"pitchers" | "hitters">("pitchers")
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [pitchers, setPitchers] = useState<{ player_id: string; name: string }[]>([])
  const [hitters, setHitters] = useState<{ player_id: string; name: string }[]>([])
  const [teamName, setTeamName] = useState<string>("")

  // Fetch own team players on mount
  useEffect(() => {
    if (!selectedTeamType) {
      fetch("/api/player-list", { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setPitchers(data.pitchers || [])
          setHitters(data.hitters || [])
          // Do not update teamName here; always use userTeamName for own team
        })
    }
  }, [selectedTeamType])

  // Fetch opponent team players when selected
  useEffect(() => {
    if (selectedTeamType === "opponent" && selectedOpponentTeam) {
      fetch(`/api/player-list?opponent_team_id=${selectedOpponentTeam}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setPitchers(data.pitchers || [])
          setHitters(data.hitters || [])
          setTeamName(data.team_name || "")
        })
    }
  }, [selectedTeamType, selectedOpponentTeam])

  const handlePlayerSelect = () => {
    if (selectedPlayer) {
      // Find the player object (real data, not dummy)
      const playerList = selectedPlayerType === "pitchers" ? pitchers : hitters;
      const playerObj = playerList.find((p: any) => p.player_id === selectedPlayer);
      if (playerObj) {
        console.log("Selected player_id:", playerObj.player_id);
        console.log("Selected player name:", playerObj.name);
        console.log("Selected playerType:", selectedPlayerType);
        // Pass the player_id directly to the parent component
        onPlayerSelect(selectedPlayerType, playerObj.player_id, selectedTeamType === "uci" ? userTeamName : teamName);
      } else {
        console.log("Player object not found for:", selectedPlayer);
      }
    }
  }

  const resetSelection = () => {
    setSelectedTeamType(null)
    setSelectedOpponentTeam("")
    setSelectedPlayer("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Player Statistics</h2>
      </div>

      {!selectedTeamType && (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle>{userTeamName} Players</CardTitle>
              <CardDescription>View statistics for {userTeamName} players</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setSelectedTeamType("uci")} className="w-full">
                Select {userTeamName} Players
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle>Opponent Players</CardTitle>
              <CardDescription>View statistics for opposing team players</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setSelectedTeamType("opponent")} className="w-full" variant="outline">
                Select Opponent Players
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTeamType && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedTeamType === "uci" ? `${userTeamName} Players` : "Opponent Players"}</CardTitle>
              <Button variant="outline" onClick={resetSelection}>
                Change Team Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTeamType === "opponent" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Opponent Team</label>
                <Select
                  value={selectedOpponentTeam}
                  onValueChange={setSelectedOpponentTeam}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose opponent team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.team_id} value={team.team_id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(selectedTeamType === "uci" || selectedOpponentTeam) && (
              <Tabs
                value={selectedPlayerType}
                onValueChange={(value) => setSelectedPlayerType(value as "pitchers" | "hitters")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pitchers">Pitchers</TabsTrigger>
                  <TabsTrigger value="hitters">Hitters</TabsTrigger>
                </TabsList>

                <TabsContent value="pitchers" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Pitcher</label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a pitcher" />
                      </SelectTrigger>
                      <SelectContent>
                        {pitchers.map((player: any) => (
                          <SelectItem key={player.player_id} value={player.player_id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="hitters" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Hitter</label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a hitter" />
                      </SelectTrigger>
                      <SelectContent>
                        {hitters.map((player: any) => (
                          <SelectItem key={player.player_id} value={player.player_id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {selectedPlayer && (
              <div className="pt-4">
                <Button onClick={handlePlayerSelect} className="w-full">
                  View {selectedPlayer}'s Stats
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
