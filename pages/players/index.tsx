"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import PlayerSelection from "@/components/PlayerSelection"
import { supabase } from "@/lib/supabase"

export default function PlayersPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState<string>("UCI")
  const [pitchers, setPitchers] = useState<{ player_id: string; name: string }[]>([])
  const [hitters, setHitters] = useState<{ player_id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ team_id: string; name: string }[]>([])
  const [userTeamId, setUserTeamId] = useState<string>("")
  const [userTeamName, setUserTeamName] = useState<string>("")
  const [pitchTypes, setPitchTypes] = useState<string[]>([])

  useEffect(() => {
    async function fetchTeamName() {
      const res = await fetch("/api/authcheck", { credentials: "include" })
      if (!res.ok) {
        router.push("/login")
        return
      }
      const data = await res.json()
      if (data && data.user && data.user.team_id) {
        setUserTeamId(data.user.team_id)
        // Fetch team name from teams table (only for user's team)
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("team_id", data.user.team_id)
          .single()
        if (team && team.name) setUserTeamName(team.name)
        // Fetch pitchers (throws not null)
        const { data: pitcherPlayers } = await supabase
          .from("players")
          .select("player_id, name")
          .eq("team_id", data.user.team_id)
          .not("throws", "is", null)
        setPitchers(pitcherPlayers || [])
        // Fetch hitters (side not null)
        const { data: hitterPlayers } = await supabase
          .from("players")
          .select("player_id, name")
          .eq("team_id", data.user.team_id)
          .not("side", "is", null)
        setHitters(hitterPlayers || [])
        // Fetch teams from user's imported games (excluding user's own team)
        const teamsRes = await fetch("/api/teams", { credentials: "include" })
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(teamsData.teams || [])
        } else {
          setTeams([])
        }
      }
      setIsAuthenticated(true)
      setLoading(false)
    }
    fetchTeamName()
  }, [router])

  const handleBack = () => {
    router.push("/dashboard")
  }

  const handlePlayerSelect = (playerType: string, playerId: string, team = "UCI") => {
    // The PlayerSelection component now passes the player_id directly
    if (playerId) {
      // Route directly to the [id] page
      if (playerType === "pitchers") {
        router.push(`/stats/pitchers/${playerId}`)
      } else {
        router.push(`/stats/hitters/${playerId}`)
      }
    } else {
      console.error("No player ID provided")
    }
  }

  // Handler to fetch opponent team players
  const handleOpponentTeamSelect = async (opponentTeamId: string) => {
    // Fetch pitchers for opponent team
    const { data: pitcherPlayers } = await supabase
      .from("players")
      .select("player_id, name")
      .eq("team_id", opponentTeamId)
      .not("throws", "is", null)
    setPitchers(pitcherPlayers || [])
    // Fetch hitters for opponent team
    const { data: hitterPlayers } = await supabase
      .from("players")
      .select("player_id, name")
      .eq("team_id", opponentTeamId)
      .not("side", "is", null)
    setHitters(hitterPlayers || [])
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Layout showLogout>
      <PlayerSelection
        onBack={handleBack}
        onPlayerSelect={handlePlayerSelect}
        teams={teams}
        userTeamId={userTeamId}
        userTeamName={userTeamName}
        pitchTypes={pitchTypes}
      />
    </Layout>
  )
}
