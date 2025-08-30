"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { parseGameDate } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import GameDayViewer from "@/components/GameDayViewer"

// Helper function to determine season from game date (same as in user-games.ts)
function getSeasonFromDate(dateString: string): string {
  if (!dateString) return 'Unknown Season';
  
  const date = parseGameDate(dateString);
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const year = date.getFullYear();
  
  // Pre-season: August 1 to February 12
  if ((month >= 8) || (month <= 2 && date.getDate() <= 12)) {
    const seasonYear = month >= 8 ? year : year - 1;
    return `${seasonYear}-${seasonYear + 1} Pre-season`;
  }
  // Regular season: February 14 to July 1
  else if (month >= 2 && date.getDate() >= 14 || month <= 7) {
    return `${year} Regular Season`;
  }
  // Fallback
  else {
    return `${year} Regular Season`;
  }
}

const gameData = {
  home: {
    name: "Home Team",
    city: "Home City",
    lineup: [
      {
        name: "Nootbaar",
        position: "LF",
        battingOrder: 1,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".238",
        ops: ".714",
      },
      {
        name: "Herrera",
        position: "DH",
        battingOrder: 2,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".281",
        ops: ".781",
      },
      {
        name: "Contreras, Wn",
        position: "1B",
        battingOrder: 3,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".255",
        ops: ".788",
      },
      {
        name: "Gorman",
        position: "3B",
        battingOrder: 4,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".221",
        ops: ".734",
      },
      {
        name: "Winn",
        position: "SS",
        battingOrder: 5,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".254",
        ops: ".681",
      },
      {
        name: "Saggese",
        position: "2B",
        battingOrder: 6,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".254",
        ops: ".625",
      },
      {
        name: "Walker, J",
        position: "RF",
        battingOrder: 7,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".232",
        ops: ".614",
      },
      {
        name: "Pagés, P",
        position: "C",
        battingOrder: 8,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".224",
        ops: ".625",
      },
      {
        name: "Church",
        position: "CF",
        battingOrder: 9,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".125",
        ops: ".404",
      },
    ],
    pitchers: [{ name: "Liberatore", ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, era: "4.27" }],
  },
  away: {
    name: "Away Team",
    city: "Away City",
    lineup: [
      {
        name: "India",
        position: "2B",
        battingOrder: 1,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".267",
        ops: ".742",
      },
      {
        name: "Stephenson",
        position: "C",
        battingOrder: 2,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".262",
        ops: ".751",
      },
      {
        name: "Encarnacion-Strand",
        position: "1B",
        battingOrder: 3,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".234",
        ops: ".698",
      },
      {
        name: "Steer",
        position: "RF",
        battingOrder: 4,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".233",
        ops: ".701",
      },
      {
        name: "Fraley",
        position: "LF",
        battingOrder: 5,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".270",
        ops: ".789",
      },
      {
        name: "McLain",
        position: "SS",
        battingOrder: 6,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".248",
        ops: ".652",
      },
      {
        name: "Marte, N",
        position: "3B",
        battingOrder: 7,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".186",
        ops: ".521",
      },
      {
        name: "Friedl",
        position: "CF",
        battingOrder: 8,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".267",
        ops: ".731",
      },
      {
        name: "Abbott",
        position: "DH",
        battingOrder: 9,
        pa: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        bb: 0,
        k: 0,
        avg: ".272",
        ops: ".756",
      },
    ],
    pitchers: [{ name: "Williamson", ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, era: "3.89" }],
  },
}

const atBatsData = [
  { inning: "T1", batter: "India", pitcher: "Liberatore", result: "Single to RF", count: "2-1" },
  { inning: "T1", batter: "Stephenson", pitcher: "Liberatore", result: "Strikeout", count: "1-2" },
  { inning: "T1", batter: "Encarnacion-Strand", pitcher: "Liberatore", result: "Ground out 4-3", count: "3-2" },
  { inning: "B1", batter: "Nootbaar", pitcher: "Williamson", result: "Home Run", count: "2-0" },
  { inning: "B1", batter: "Herrera", pitcher: "Williamson", result: "Walk", count: "3-1" },
  { inning: "B1", batter: "Contreras, Wn", pitcher: "Williamson", result: "Double to LF", count: "1-1" },
  { inning: "T2", batter: "Steer", pitcher: "Liberatore", result: "Fly out to CF", count: "2-2" },
  { inning: "T2", batter: "Fraley", pitcher: "Liberatore", result: "Single to SS", count: "3-2" },
  { inning: "B2", batter: "Gorman", pitcher: "Williamson", result: "Strikeout", count: "0-2" },
  { inning: "B2", batter: "Winn", pitcher: "Williamson", result: "Ground out 6-3", count: "1-0" },
]

interface GameData {
  home_team: string
  away_team: string
  date: string
  game_id: string
  game_uid: string
  // Add other game properties as needed
}

interface MLBGameDayProps {
  game?: GameData
}

export default function MLBGameDay({ game }: MLBGameDayProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentGame, setCurrentGame] = useState<GameData | null>(null)
  const [games, setGames] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home")
  const [lineupTab, setLineupTab] = useState<"home" | "away">("home")
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([])
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([])
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null)
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null)
  const [selectedHitter, setSelectedHitter] = useState<string | null>(null)
  const [selectedPlateAppearance, setSelectedPlateAppearance] = useState<any>(null)

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true)
        
        // Get the game_uid from the URL
        const { id } = router.query
        if (!id || typeof id !== 'string') {
          setError('Invalid game ID')
          return
        }

        // Fetch all user games to find the specific game and get season data
        const response = await fetch('/api/user-games', { credentials: 'include' })
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch games')
        }

        const allGamesData = await response.json()
        
        // Find the specific game by game_uid
        let targetGame: any = null
        let targetSeason: string = ''
        
        for (const season of allGamesData) {
          for (const game of season.games) {
            if (game.game_uid === id) {
              targetGame = game
              targetSeason = season.season
              break
            }
          }
          if (targetGame) break
        }

        if (!targetGame) {
          setError('Game not found')
          return
        }

        setCurrentGame(targetGame)

        // Filter games to only include those from the same season
        const seasonGames = allGamesData.filter((season: any) => season.season === targetSeason)
        setGames(seasonGames)
        
        // Debug: Show games prop structure
        console.log('=== GAMES PROP DEBUG ===')
        console.log('Games prop structure:', seasonGames)
        console.log('Number of seasons:', seasonGames.length)
        seasonGames.forEach((season: any, index: number) => {
          console.log(`Season ${index + 1}:`, season.season, '-', season.games.length, 'games')
        })
        console.log('Total games:', seasonGames.reduce((total: number, season: any) => total + season.games.length, 0))
        console.log('=== END GAMES PROP DEBUG ===')


      } catch (err) {
        console.error('Error fetching game data:', err)
        setError('Failed to load game data')
      } finally {
        setLoading(false)
      }
    }

    if (router.isReady) {
      fetchGameData()
    }
  }, [router.isReady, router.query])

  // Process games data to extract player information
  useEffect(() => {
    if (!games.length || !currentGame) return

    const processGameData = async () => {
      try {
        // Find the specific game with the selected game_uid
        let targetGame: any = null
        for (const season of games) {
          for (const game of season.games) {
            if (game.game_uid === currentGame.game_uid) {
              targetGame = game
              break
            }
          }
          if (targetGame) break
        }

        if (!targetGame) {
          return
        }

        // Extract all pitches from the target game
        const allPitches: any[] = []
        targetGame.innings?.forEach((inning: any) => {
          inning.plate_appearances?.forEach((pa: any) => {
            pa.pitches?.forEach((pitch: any) => {
              allPitches.push(pitch)
            })
          })
        })



        // Sort pitches by pitch number to maintain order
        allPitches.sort((a, b) => {
          // Sort by inning, top_bottom, pa_of_inning, pitch_of_pa
          if (a.inning !== b.inning) return a.inning - b.inning
          if (a.top_bottom !== b.top_bottom) return a.top_bottom === 'Top' ? -1 : 1
          if (a.pa_of_inning !== b.pa_of_inning) return a.pa_of_inning - b.pa_of_inning
          return a.pitch_of_pa - b.pitch_of_pa
        })

        // Extract unique hitters ordered by first appearance
        const uniqueHitters = new Map<string, any>()
        const uniquePitchers = new Map<string, any>()
        
        allPitches.forEach((pitch, index) => {
          // Check for batter_id
          if (pitch.batter_id && !uniqueHitters.has(pitch.batter_id)) {
            uniqueHitters.set(pitch.batter_id, {
              batter_id: pitch.batter_id,
              firstPitchIndex: index
            })
          }
          
          // Check for pitcher_id
          if (pitch.pitcher_id && !uniquePitchers.has(pitch.pitcher_id)) {
            uniquePitchers.set(pitch.pitcher_id, {
              pitcher_id: pitch.pitcher_id,
              firstPitchIndex: index
            })
          }
        })

        // Convert to array and sort by first appearance
        const orderedHitters = Array.from(uniqueHitters.values())
          .sort((a, b) => a.firstPitchIndex - b.firstPitchIndex)
          .map(item => item.batter_id)

        const orderedPitchers = Array.from(uniquePitchers.values())
          .sort((a, b) => a.firstPitchIndex - b.firstPitchIndex)
          .map(item => item.pitcher_id)



        // Get team IDs from the game data
        const homeTeamId = targetGame.home_team_foreign_id
        const awayTeamId = targetGame.away_team_foreign_id



        setHomeTeamId(homeTeamId)
        setAwayTeamId(awayTeamId)

        // Fetch player data from Supabase for both teams
        if (homeTeamId) {
          const { data: homePlayers, error: homeError } = await supabase
            .from('players')
            .select('player_id, name, team_id')
            .eq('team_id', homeTeamId)

          if (homeError) {
            console.error('[GAME-DETAIL] Error fetching home team players:', homeError)
          } else {
            setHomeTeamPlayers(homePlayers || [])
          }
        }

        if (awayTeamId) {
          const { data: awayPlayers, error: awayError } = await supabase
            .from('players')
            .select('player_id, name, team_id')
            .eq('team_id', awayTeamId)

          if (awayError) {
            console.error('[GAME-DETAIL] Error fetching away team players:', awayError)
          } else {
            setAwayTeamPlayers(awayPlayers || [])
          }
        }

      } catch (error) {
        console.error('[GAME-DETAIL] Error processing game data:', error)
      }
    }

    processGameData()
  }, [games, currentGame])

  // Use the current game data instead of the prop
  const gameToUse = currentGame || game

  // Helper function to get player name by batter_id
  const getPlayerNameByBatterId = (batterId: string, teamPlayers: any[]) => {
    const player = teamPlayers.find(p => p.player_id === batterId)
    return player ? player.name : `Unknown Player (${batterId})`
  }

  // Helper function to get ordered hitters for a team
  const getOrderedHitters = (teamId: string | null, teamPlayers: any[]) => {
    if (!teamId || !games.length || !currentGame) return []

    // Find the target game
    let targetGame: any = null
    for (const season of games) {
      for (const game of season.games) {
        if (game.game_uid === currentGame.game_uid) {
          targetGame = game
          break
        }
      }
      if (targetGame) break
    }

    if (!targetGame) return []

    // Extract all pitches from the target game
    const allPitches: any[] = []
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        pa.pitches?.forEach((pitch: any) => {
          allPitches.push(pitch)
        })
      })
    })

    // Sort pitches by order
    allPitches.sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      if (a.top_bottom !== b.top_bottom) return a.top_bottom === 'Top' ? -1 : 1
      if (a.pa_of_inning !== b.pa_of_inning) return a.pa_of_inning - b.pa_of_inning
      return a.pitch_of_pa - b.pitch_of_pa
    })

    // Extract unique hitters for this team, ordered by first appearance
    const uniqueHitters = new Map<string, any>()
    
    allPitches.forEach((pitch, index) => {
      if (pitch.batter_id && !uniqueHitters.has(pitch.batter_id)) {
        // Check if this batter belongs to the specified team
        const player = teamPlayers.find(p => p.player_id === pitch.batter_id)
        if (player && player.team_id === teamId) {
          uniqueHitters.set(pitch.batter_id, {
            batter_id: pitch.batter_id,
            firstPitchIndex: index
          })
        }
      }
    })
    


    // Convert to array and sort by first appearance
    return Array.from(uniqueHitters.values())
      .sort((a, b) => a.firstPitchIndex - b.firstPitchIndex)
      .map(item => ({
        batter_id: item.batter_id,
        name: getPlayerNameByBatterId(item.batter_id, teamPlayers)
      }))
  }

  // Get ordered hitters for both teams
  const homeTeamHitters = getOrderedHitters(homeTeamId, homeTeamPlayers)
  const awayTeamHitters = getOrderedHitters(awayTeamId, awayTeamPlayers)



  // Helper function to get at-bats for a selected hitter
  const getAtBatsForHitter = (hitterId: string | null) => {
    if (!hitterId || !games.length || !currentGame) return []

    // Find the target game
    let targetGame: any = null
    for (const season of games) {
      for (const game of season.games) {
        if (game.game_uid === currentGame.game_uid) {
          targetGame = game
          break
        }
      }
      if (targetGame) break
    }

    if (!targetGame) return []

    const atBats: any[] = []

    // Extract all plate appearances for this hitter
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        // Check if this hitter appears in this plate appearance
        const hitterPitches = pa.pitches?.filter((pitch: any) => pitch.batter_id === hitterId) || []
        
        if (hitterPitches.length > 0) {
          // Get the last pitch of the plate appearance
          const lastPitch = hitterPitches[hitterPitches.length - 1]
          
          // Get hitter name
          const allHitters = [...homeTeamHitters, ...awayTeamHitters]
          const hitter = allHitters.find(h => h.batter_id === hitterId)
          const hitterName = hitter?.name || `Unknown (${hitterId})`

          // Format the result text based on kor_bb
          let resultText = ''
          if (lastPitch.kor_bb && lastPitch.kor_bb !== 'Undefined') {
            resultText = lastPitch.kor_bb
          } else {
            const hitType = lastPitch.tagged_hit_type || 'Unknown'
            const playResult = lastPitch.play_result || 'Unknown'
            resultText = `${hitType} - ${playResult}`
          }

          // Get count and outs
          const count = `${lastPitch.balls || 0}-${lastPitch.strikes || 0}`
          const outs = lastPitch.outs || 0

          atBats.push({
            inning: inning.inning,
            top_bottom: inning.top_bottom,
            pa_of_inning: pa.pa_of_inning,
            hitterName,
            result: resultText,
            count,
            outs,
            lastPitch,
            allPitches: pa.pitches || [] // Include all pitches for this plate appearance
          })
        }
      })
    })

    // Sort by inning, top/bottom, and pa_of_inning
    atBats.sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      if (a.top_bottom !== b.top_bottom) return a.top_bottom === 'Top' ? -1 : 1
      return a.pa_of_inning - b.pa_of_inning
    })

    return atBats
  }

  const selectedHitterAtBats = getAtBatsForHitter(selectedHitter)



  // Helper function to get ordered pitchers for a team
  const getOrderedPitchers = (teamId: string | null, teamPlayers: any[]) => {
    if (!teamId || !games.length || !currentGame) return []

    // Find the target game
    let targetGame: any = null
    for (const season of games) {
      for (const game of season.games) {
        if (game.game_uid === currentGame.game_uid) {
          targetGame = game
          break
        }
      }
      if (targetGame) break
    }

    if (!targetGame) return []

    // Extract all pitches from the target game
    const allPitches: any[] = []
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        pa.pitches?.forEach((pitch: any) => {
          allPitches.push(pitch)
        })
      })
    })

    // Sort pitches by order
    allPitches.sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      if (a.top_bottom !== b.top_bottom) return a.top_bottom === 'Top' ? -1 : 1
      if (a.pa_of_inning !== b.pa_of_inning) return a.pa_of_inning - b.pa_of_inning
      return a.pitch_of_pa - b.pitch_of_pa
    })

    // Extract unique pitchers for this team, ordered by first appearance
    const uniquePitchers = new Map<string, any>()
    
    allPitches.forEach((pitch, index) => {
      if (pitch.pitcher_id && !uniquePitchers.has(pitch.pitcher_id)) {
        // Check if this pitcher belongs to the specified team
        const player = teamPlayers.find(p => p.player_id === pitch.pitcher_id)
        if (player && player.team_id === teamId) {
          uniquePitchers.set(pitch.pitcher_id, {
            pitcher_id: pitch.pitcher_id,
            firstPitchIndex: index
          })
        }
      }
    })
    


    // Convert to array and sort by first appearance
    return Array.from(uniquePitchers.values())
      .sort((a, b) => a.firstPitchIndex - b.firstPitchIndex)
      .map(item => ({
        pitcher_id: item.pitcher_id,
        name: getPlayerNameByBatterId(item.pitcher_id, teamPlayers) // Reuse the same function
      }))
  }

  // Get ordered pitchers for both teams
  const homeTeamPitchers = getOrderedPitchers(homeTeamId, homeTeamPlayers)
  const awayTeamPitchers = getOrderedPitchers(awayTeamId, awayTeamPlayers)



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading game data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Game</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/imported-games')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Games
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Use actual team names from game data or fallback to defaults
  const homeTeamName = gameToUse?.home_team || "Home Team"
  const awayTeamName = gameToUse?.away_team || "Away Team"

  const currentTeam = gameData[selectedTeam]

  const handlePlayerClick = (playerName: string, playerType: "hitter" | "pitcher") => {
    console.log(`[v0] Player clicked: ${playerName} (${playerType})`)
    // User will edit this functionality later
  }

  const handleAtBatClick = (atBat: any) => {
    setSelectedPlateAppearance(atBat)
  }

  const handleLineupPlayerClick = (playerName: string, batterId: string) => {
    setSelectedHitter(batterId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 text-balance">MLB GameDay</h1>
            <button 
              onClick={() => router.push('/imported-games')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Back to View Games
            </button>
          </div>
          <div className="flex items-center gap-4">
                         <Badge
               variant="outline"
               className="text-lg px-6 py-3 font-semibold bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700"
             >
               {awayTeamName} @ {homeTeamName}
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
          <div className="xl:col-span-2 lg:col-span-3 md:col-span-4">
            <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-slate-100 text-lg font-semibold">Plate Appearances</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] lg:h-[500px] pr-4">
                  <div className="space-y-3">
                    {selectedHitterAtBats.map((atBat, index) => (
                      <div
                        key={index}
                        className="p-3 lg:p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-200 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md"
                        onClick={() => handleAtBatClick(atBat)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                          >
                            {atBat.top_bottom}{atBat.inning}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{atBat.count}</span>
                        </div>
                        <div className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">
                          {atBat.hitterName}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Outs: {atBat.outs}</div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{atBat.result}</div>
                      </div>
                    ))}
                    {selectedHitterAtBats.length === 0 && selectedHitter && (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No at-bats found for this player
                      </div>
                    )}
                    {!selectedHitter && (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        Click on a player to view their at-bats
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-7 lg:col-span-6 md:col-span-8">
            <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-slate-100 text-lg font-semibold">3D Game Day Viewer</CardTitle>
              </CardHeader>
                              <CardContent className="p-0 h-[400px] lg:h-[500px]">
                  <GameDayViewer 
                    games={games} 
                    selectedPitch={null}
                    onPitchSelect={() => {}}
                    selectedPlateAppearance={selectedPlateAppearance}
                  />
                </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-3 lg:col-span-3 md:col-span-4">
            <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="pb-3 px-2">
                <Tabs value={lineupTab} onValueChange={(value) => setLineupTab(value as "home" | "away")}>
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700">
                                         <TabsTrigger
                       value="home"
                       className="text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600"
                     >
                       {homeTeamName}
                     </TabsTrigger>
                     <TabsTrigger
                       value="away"
                       className="text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600"
                     >
                       {awayTeamName}
                     </TabsTrigger>
                  </TabsList>

                                     <TabsContent value="home" className="mt-6">
                     <ScrollArea className="h-[400px] lg:h-[500px]">
                      <div className="space-y-6 px-2">
                                                                          <div>
                                                       <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                              Batters - {homeTeamName}
                            </h3>

                                                       {/* Header Row */}
                            <div className="grid grid-cols-9 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
                              <div className="col-span-2 pl-1">PLAYER</div>
                              <div className="text-center">PA</div>
                              <div className="text-center">1B</div>
                              <div className="text-center">2B</div>
                              <div className="text-center">3B</div>
                              <div className="text-center">HR</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">K</div>
                              <div className="text-center">AVG</div>
                            </div>

                                                     {/* Player Rows */}
                          {homeTeamHitters.map((player, index) => (
                            <div
                              key={player.batter_id}
                              className="grid grid-cols-9 gap-1 text-xs py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer rounded transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                              onClick={() => handleLineupPlayerClick(player.name, player.batter_id)}
                            >
                              <div className="col-span-2 font-medium pl-1">
                                <span className="text-slate-900 dark:text-slate-100 font-semibold truncate block">{player.name}</span>
                              </div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center font-semibold text-slate-900 dark:text-slate-100">
                                -
                              </div>
                            </div>
                          ))}

                                                        {/* Totals Row */}
                            <div className="grid grid-cols-9 gap-1 text-xs py-1 border-t-2 border-slate-300 dark:border-slate-600 mt-2 font-semibold bg-slate-50 dark:bg-slate-700/30 rounded">
                              <div className="col-span-2 text-slate-900 dark:text-slate-100 pl-1">Totals</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300"></div>
                            </div>
                        </div>

                        <div>
                                                     <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                             Pitchers - {homeTeamName}
                           </h3>

                          {/* Header Row */}
                          <div className="grid grid-cols-9 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
                            <div className="col-span-2 pl-2">PITCHER</div>
                            <div className="text-center">IP</div>
                            <div className="text-center">H</div>
                            <div className="text-center">R</div>
                            <div className="text-center">ER</div>
                            <div className="text-center">BB</div>
                            <div className="text-center">K</div>
                            <div className="text-center pr-2">ERA</div>
                          </div>

                          {/* Pitcher Rows */}
                          {homeTeamPitchers.map((pitcher, index) => (
                            <div
                              key={pitcher.pitcher_id}
                              className="grid grid-cols-9 gap-1 text-xs py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer rounded transition-colors duration-150"
                              onClick={() => handleLineupPlayerClick(pitcher.name, pitcher.pitcher_id)}
                            >
                              <div className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 pl-2">
                                {pitcher.name}
                              </div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center font-semibold text-slate-900 dark:text-slate-100 pr-2">
                                -
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                                     <TabsContent value="away" className="mt-6">
                     <ScrollArea className="h-[400px] lg:h-[500px]">
                      <div className="space-y-6 px-2">
                                                 {/* Batters Section */}
                         <div>
                                                       <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                              Batters - {awayTeamName}
                            </h3>

                                                       {/* Header Row */}
                            <div className="grid grid-cols-9 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
                              <div className="col-span-2 pl-1">PLAYER</div>
                              <div className="text-center">PA</div>
                              <div className="text-center">1B</div>
                              <div className="text-center">2B</div>
                              <div className="text-center">3B</div>
                              <div className="text-center">HR</div>
                              <div className="text-center">BB</div>
                              <div className="text-center">K</div>
                              <div className="text-center">AVG</div>
                            </div>

                            {/* Player Rows */}
                            {awayTeamHitters.map((player, index) => (
                              <div
                                key={player.batter_id}
                                className="grid grid-cols-9 gap-1 text-xs py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer rounded transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                                onClick={() => handleLineupPlayerClick(player.name, player.batter_id)}
                              >
                                <div className="col-span-2 font-medium pl-1">
                                  <span className="text-slate-900 dark:text-slate-100 font-semibold truncate block">{player.name}</span>
                                </div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                                <div className="text-center font-semibold text-slate-900 dark:text-slate-100">
                                  -
                                </div>
                              </div>
                            ))}

                                                        {/* Totals Row */}
                            <div className="grid grid-cols-9 gap-1 text-xs py-1 border-t-2 border-slate-300 dark:border-slate-600 mt-2 font-semibold bg-slate-50 dark:bg-slate-700/30 rounded">
                              <div className="col-span-2 text-slate-900 dark:text-slate-100 pl-1">Totals</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">0</div>
                              <div className="text-center text-slate-700 dark:text-slate-300"></div>
                            </div>
                        </div>

                        {/* Pitchers Section */}
                        <div>
                                                     <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                             Pitchers - {awayTeamName}
                           </h3>

                          {/* Header Row */}
                          <div className="grid grid-cols-9 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
                            <div className="col-span-2 pl-2">PITCHER</div>
                            <div className="text-center">IP</div>
                            <div className="text-center">H</div>
                            <div className="text-center">R</div>
                            <div className="text-center">ER</div>
                            <div className="text-center">BB</div>
                            <div className="text-center">K</div>
                            <div className="text-center pr-2">ERA</div>
                          </div>

                          {/* Pitcher Rows */}
                          {awayTeamPitchers.map((pitcher, index) => (
                            <div
                              key={pitcher.pitcher_id}
                              className="grid grid-cols-9 gap-1 text-xs py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer rounded transition-colors duration-150"
                              onClick={() => handleLineupPlayerClick(pitcher.name, pitcher.pitcher_id)}
                            >
                              <div className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 pl-2">
                                {pitcher.name}
                              </div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center text-slate-700 dark:text-slate-300">-</div>
                              <div className="text-center font-semibold text-slate-900 dark:text-slate-100 pr-2">
                                -
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
