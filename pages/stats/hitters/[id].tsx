"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import HitterDashboard from "@/components/hitter-dashboard"
import { supabase } from "@/lib/supabase"
import { ThemeProvider } from "@/components/theme-provider"

export default function HitterStatsPage() {
  const router = useRouter()
  const { id } = router.query
  const [playerData, setPlayerData] = useState<{
    name: string
    type: "pitchers" | "hitters"
    team: string
    player_id: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<any[]>([])
  const [hitterInfo, setHitterInfo] = useState<any>(null)
  const [pitchTypes, setPitchTypes] = useState<string[]>([])

  useEffect(() => {
    if (!id) return

    async function fetchPlayerStats() {
      try {
        // 1. Get hitter info
        const { data: hitter } = await supabase
          .from('players')
          .select('*')
          .eq('player_id', id)
          .single()
        
        if (!hitter) {
          router.push("/players")
          return
        }

        setHitterInfo(hitter)
        setPlayerData({
          name: hitter.name,
          type: "hitters",
          team: hitter.team_id || "Unknown",
          player_id: id as string
        })

        // 2. Get all games and pitches for this player from the API
        const res = await fetch(`/api/player-stats?player_id=${id}`)
        if (!res.ok) {
          if (res.status === 401) {
            // Authentication failed - redirect to login
            console.log("Authentication failed, redirecting to login")
            router.push("/login")
            return
          }
          console.error("Failed to fetch player stats")
          return
        }
        
        const gamesData = await res.json()
        setGames(gamesData || [])

        // Compute all distinct auto_pitch_type values for this player using new hierarchical structure
        const getAllPitches = (games: any[]): any[] => {
          const allPitches: any[] = [];
          games.forEach((season: any) => {
            season.games?.forEach((game: any) => {
              game.innings?.forEach((inning: any) => {
                inning.plate_appearances?.forEach((pa: any) => {
                  pa.pitches?.forEach((pitch: any) => {
                    allPitches.push(pitch);
                  });
                });
              });
            });
          });
          return allPitches;
        };
        
        const allPitches = getAllPitches(gamesData || [])
        const uniquePitchTypes = Array.from(new Set(allPitches.map((p: any) => p.auto_pitch_type).filter(Boolean)))
        setPitchTypes(uniquePitchTypes as string[])
        
      } catch (error) {
        console.error("Error fetching player data:", error)
        router.push("/players")
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerStats()
  }, [id, router])

  const handleBack = () => {
    router.push("/players")
  }

  if (loading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Layout showLogout fullBleed>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading hitter data...</div>
          </div>
        </Layout>
      </ThemeProvider>
    )
  }

  if (!playerData || !hitterInfo) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Layout showLogout fullBleed>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Player not found</div>
          </div>
        </Layout>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Layout showLogout fullBleed>
        <button
          onClick={handleBack}
          className="mb-4 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
        >
          ← Back to Players
        </button>
        <HitterDashboard
          hitter={hitterInfo}
          games={games}
          pitchTypes={pitchTypes}
        />
      </Layout>
    </ThemeProvider>
  )
} 