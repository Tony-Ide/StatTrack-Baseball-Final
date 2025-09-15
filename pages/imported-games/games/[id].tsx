"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { parseGameDate, displayInningsPitched } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import GameDayViewer from "@/components/GameDayViewer"
import { ChevronDown, ChevronRight } from "lucide-react"
import PrintPitcherReport from "@/components/print-pitcher-report"
import GamedayGamesTrend from "@/components/GamedayGamesTrend"
import GamedayInteractiveStrikezone from "@/components/GamedayInteractiveStrikezone"

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
  const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null)
  const [selectedPlateAppearance, setSelectedPlateAppearance] = useState<any>(null)
  const [expandedPAs, setExpandedPAs] = useState<Set<string>>(new Set())
  const [selectedPitch, setSelectedPitch] = useState<any>(null)
  const [selectedZonePitch, setSelectedZonePitch] = useState<any>(null)
  const [showPitcherReports, setShowPitcherReports] = useState(false)
  const [pitcherCache, setPitcherCache] = useState<{ [key: string]: string }>({})
  const [pitcherCacheLoaded, setPitcherCacheLoaded] = useState(false)

  // Pitcher cache management functions
  const PITCHER_CACHE_KEY = 'hatetrackman_pitcher_cache'
  const CACHE_GAME_KEY = 'hatetrackman_cache_game_id'
  
  const loadPitcherCache = (gameId: string): { [key: string]: string } => {
    try {
      const cachedGameId = localStorage.getItem(CACHE_GAME_KEY)
      const cached = localStorage.getItem(PITCHER_CACHE_KEY)
      
      // Only use cache if it's for the same game
      if (cached && cachedGameId === gameId) {
        const parsedCache = JSON.parse(cached)
        console.log('=== PITCHER CACHE LOADED FROM LOCALSTORAGE ===')
        console.log('Game ID:', gameId)
        console.log('Cached pitcher mappings:', parsedCache)
        console.log('=== END PITCHER CACHE DEBUG ===')
        return parsedCache
      }
    } catch (error) {
      console.error('Error loading pitcher cache:', error)
    }
    return {}
  }

  const savePitcherCache = (cache: { [key: string]: string }, gameId: string) => {
    try {
      localStorage.setItem(PITCHER_CACHE_KEY, JSON.stringify(cache))
      localStorage.setItem(CACHE_GAME_KEY, gameId)
      console.log('=== PITCHER CACHE SAVED TO LOCALSTORAGE ===')
      console.log('Game ID:', gameId)
      console.log('Saved pitcher mappings:', cache)
      console.log('=== END PITCHER CACHE SAVE DEBUG ===')
    } catch (error) {
      console.error('Error saving pitcher cache:', error)
    }
  }

  const clearPitcherCache = () => {
    try {
      localStorage.removeItem(PITCHER_CACHE_KEY)
      localStorage.removeItem(CACHE_GAME_KEY)
      console.log('=== PITCHER CACHE CLEARED ===')
    } catch (error) {
      console.error('Error clearing pitcher cache:', error)
    }
  }

  // Helper function to extract all unique pitcher IDs from games data
  const extractPitcherIds = (gamesData: any[]): string[] => {
    const pitcherIds = new Set<string>()
    
    gamesData.forEach((season: any) => {
      season.games?.forEach((game: any) => {
        game.innings?.forEach((inning: any) => {
          inning.plate_appearances?.forEach((pa: any) => {
            pa.pitches?.forEach((pitch: any) => {
              if (pitch.pitcher_id) {
                pitcherIds.add(pitch.pitcher_id)
              }
            })
          })
        })
      })
    })
    
    return Array.from(pitcherIds)
  }

  // Build pitcher cache when games data is available
  useEffect(() => {
    const buildPitcherCache = async () => {
      if (!games.length || !currentGame) return
      
      try {
        console.log('=== BUILDING PITCHER CACHE ===')
        
        // Try to load existing cache first
        const existingCache = loadPitcherCache(currentGame.game_uid)
        
        // Extract all pitcher IDs from games data
        const allPitcherIds = extractPitcherIds(games)
        console.log('Unique pitcher IDs found:', allPitcherIds)
        
        // Check if we need to fetch any missing pitcher data
        const missingPitcherIds = allPitcherIds.filter(id => !existingCache[id])
        
        if (missingPitcherIds.length > 0) {
          console.log('Fetching missing pitcher data for IDs:', missingPitcherIds)
          
          // Fetch missing pitcher data from Supabase
          const { data: playersData, error } = await supabase
            .from('players')
            .select('player_id, name')
            .in('player_id', missingPitcherIds)
          
          if (error) {
            console.error('Error fetching pitcher data:', error)
            setPitcherCacheLoaded(true)
            return
          }
          
          // Build updated cache
          const updatedCache = { ...existingCache }
          playersData?.forEach((player: any) => {
            updatedCache[player.player_id] = player.name || 'Unknown Pitcher'
          })
          
          // Add any pitcher IDs that weren't found in the database
          missingPitcherIds.forEach(id => {
            if (!updatedCache[id]) {
              updatedCache[id] = 'Unknown Pitcher'
            }
          })
          
          setPitcherCache(updatedCache)
          savePitcherCache(updatedCache, currentGame.game_uid)
          console.log('Updated pitcher cache:', updatedCache)
        } else {
          console.log('All pitcher data already cached')
          setPitcherCache(existingCache)
        }
        
        setPitcherCacheLoaded(true)
        console.log('=== PITCHER CACHE BUILD COMPLETE ===')
      } catch (error) {
        console.error('Error building pitcher cache:', error)
        setPitcherCacheLoaded(true)
      }
    }
    
    buildPitcherCache()
  }, [games, currentGame])

  // Clear cache when component unmounts or game changes
  useEffect(() => {
    return () => {
      // Clear cache when leaving the page
      clearPitcherCache()
    }
  }, [])

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

        // Only include the specific game that was clicked
        const singleGameSeason = [{
          season: targetSeason,
          games: [targetGame]
        }]
        setGames(singleGameSeason)

        // Debug: Show games prop structure
        console.log('=== GAMES PROP DEBUG ===')
        console.log('Games prop structure:', singleGameSeason)
        console.log('Number of seasons:', singleGameSeason.length)
        singleGameSeason.forEach((season: any, index: number) => {
          console.log(`Season ${index + 1}:`, season.season, '-', season.games.length, 'games')
        })
        console.log('Total games:', singleGameSeason.reduce((total: number, season: any) => total + season.games.length, 0))
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

  // Helper function to format player name to show only first initial of first name
  const formatPlayerName = (fullName: string) => {
    if (!fullName) return fullName
    
    // Handle names like "Palmeira, Konnor" -> "Palmeira, K"
    if (fullName.includes(',')) {
      const parts = fullName.split(',')
      if (parts.length === 2) {
        const lastName = parts[0].trim()
        const firstName = parts[1].trim()
        if (firstName) {
          const firstInitial = firstName.charAt(0)
          return `${lastName}, ${firstInitial}`
        }
      }
    }
    
    // Return original name if no pattern matches
    return fullName
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

          // Get pitcher name from first pitch using cache
          const firstPitch = pa.pitches?.[0]
          const pitcherName = firstPitch?.pitcher_id ? (pitcherCache[firstPitch.pitcher_id] || 'Unknown Pitcher') : 'Unknown Pitcher'

          // Format the result text based on kor_bb
          let resultText = ''
          if (lastPitch.pitch_call === 'HitByPitch') {
            resultText = lastPitch.pitch_call
          } else if (lastPitch.kor_bb && lastPitch.kor_bb !== 'Undefined') {
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
            pitcherName,
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
      .map(item => {
        // Find the first pitch by this pitcher to get throws information
        const firstPitch = allPitches.find(p => p.pitcher_id === item.pitcher_id)
        return {
          pitcher_id: item.pitcher_id,
          name: getPlayerNameByBatterId(item.pitcher_id, teamPlayers), // Reuse the same function
          throws: firstPitch?.pitcher?.throws || null // Extract throws from pitcher data
        }
      })
  }

  // Get ordered pitchers for both teams
  const homeTeamPitchers = getOrderedPitchers(homeTeamId, homeTeamPlayers)
  const awayTeamPitchers = getOrderedPitchers(awayTeamId, awayTeamPlayers)

  // Helper function to get at-bats for a selected pitcher
  const getAtBatsForPitcher = (pitcherId: string | null) => {
    if (!pitcherId || !games.length || !currentGame) return []

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

    // Extract all plate appearances for this pitcher
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        // Check if this pitcher appears in this plate appearance
        const pitcherPitches = pa.pitches?.filter((pitch: any) => pitch.pitcher_id === pitcherId) || []
        
        if (pitcherPitches.length > 0) {
          // Get the last pitch of the plate appearance
          const lastPitch = pitcherPitches[pitcherPitches.length - 1]
          
          // Get pitcher name
          const allPitchers = [...homeTeamPitchers, ...awayTeamPitchers]
          const pitcher = allPitchers.find(p => p.pitcher_id === pitcherId)
          const pitcherName = pitcher?.name || `Unknown (${pitcherId})`

          // Get batter name for this plate appearance
          const batterPitches = pa.pitches?.filter((pitch: any) => pitch.batter_id) || []
          const firstBatterPitch = batterPitches[0]
          const batterName = firstBatterPitch ? getPlayerNameByBatterId(firstBatterPitch.batter_id, [...homeTeamPlayers, ...awayTeamPlayers]) : 'Unknown Batter'

          // Format the result text based on kor_bb
          let resultText = ''
          if (lastPitch.pitch_call === 'HitByPitch') {
            resultText = lastPitch.pitch_call
          } else if (lastPitch.kor_bb && lastPitch.kor_bb !== 'Undefined') {
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
            pitcherName,
            batterName,
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

  const selectedPitcherAtBats = getAtBatsForPitcher(selectedPitcher)

  // Helper function to calculate hitter stats for a specific player
  const calculateHitterStats = (batterId: string) => {
    if (!games.length || !currentGame) return { pa: 0, singles: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, hbp: 0 }

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

    if (!targetGame) return { pa: 0, singles: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, hbp: 0 }

    // Extract all pitches for this batter
    const allPitches: any[] = []
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        pa.pitches?.forEach((pitch: any) => {
          if (pitch.batter_id === batterId) {
            allPitches.push(pitch)
          }
        })
      })
    })

    // Calculate plate appearances using unique combinations (same logic as games-log-table)
    const plateAppearances = new Set()
    allPitches.forEach((pitch: any) => {
      plateAppearances.add(`${pitch.game_id}-${pitch.inning}-${pitch.top_bottom}-${pitch.pa_of_inning}`)
    })
    const pa = plateAppearances.size

    // Calculate hit types
    const singles = allPitches.filter((p: any) => p.play_result === 'Single').length
    const doubles = allPitches.filter((p: any) => p.play_result === 'Double').length
    const triples = allPitches.filter((p: any) => p.play_result === 'Triple').length
    const hr = allPitches.filter((p: any) => p.play_result === 'HomeRun').length

    // Calculate other stats
    const bb = allPitches.filter((p: any) => p.kor_bb === 'Walk').length
    const k = allPitches.filter((p: any) => p.kor_bb === 'Strikeout').length
    const hbp = allPitches.filter((p: any) => p.pitch_call === 'HitByPitch').length

    return { pa, singles, doubles, triples, hr, bb, k, hbp }
  }

  // Helper function to calculate pitcher stats for a specific player
  const calculatePitcherStats = (pitcherId: string) => {
    if (!games.length || !currentGame) return { ip: 0, h: 0, bb: 0, k: 0, hr: 0 }

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

    if (!targetGame) return { ip: 0, h: 0, bb: 0, k: 0, hr: 0 }

    // Extract all pitches for this pitcher
    const allPitches: any[] = []
    targetGame.innings?.forEach((inning: any) => {
      inning.plate_appearances?.forEach((pa: any) => {
        pa.pitches?.forEach((pitch: any) => {
          if (pitch.pitcher_id === pitcherId) {
            allPitches.push(pitch)
          }
        })
      })
    })

    // Calculate IP (same logic as games-log-table)
    let ip = 0
    const innings = new Map()
    allPitches.forEach((pitch: any) => {
      const inningKey = `${pitch.inning}_${pitch.top_bottom}`
      if (!innings.has(inningKey)) {
        innings.set(inningKey, { maxOuts: pitch.outs, minOuts: pitch.outs, lastPitch: pitch })
      } else {
        const inning = innings.get(inningKey)
        inning.maxOuts = Math.max(inning.maxOuts, pitch.outs)
        inning.minOuts = Math.min(inning.minOuts, pitch.outs)
        inning.lastPitch = pitch
      }
    })

    innings.forEach((inning: any) => {
      let inningOuts = inning.maxOuts - inning.minOuts
      if (inning.lastPitch.kor_bb === 'Strikeout') {
        inningOuts += 1
      }
      if (inning.lastPitch.outs_on_play) {
        inningOuts += inning.lastPitch.outs_on_play
      }
      ip += inningOuts / 3
    })

    // Calculate other stats
    const h = allPitches.filter((p: any) => 
      ['Single', 'Double', 'Triple', 'HomeRun'].includes(p.play_result)
    ).length
    const bb = allPitches.filter((p: any) => p.kor_bb === 'Walk').length
    const k = allPitches.filter((p: any) => p.kor_bb === 'Strikeout').length
    const hr = allPitches.filter((p: any) => p.play_result === 'HomeRun').length

    return { ip, h, bb, k, hr }
  }

  // Helper function to calculate team totals for hitters
  const calculateTeamHitterTotals = (teamHitters: any[]) => {
    const totals = { pa: 0, singles: 0, doubles: 0, triples: 0, hr: 0, bb: 0, k: 0, hbp: 0 }
    
    teamHitters.forEach(player => {
      const stats = calculateHitterStats(player.batter_id)
      totals.pa += stats.pa
      totals.singles += stats.singles
      totals.doubles += stats.doubles
      totals.triples += stats.triples
      totals.hr += stats.hr
      totals.bb += stats.bb
      totals.k += stats.k
      totals.hbp += stats.hbp
    })
    
    return totals
  }

  // Helper function to calculate team totals for pitchers
  const calculateTeamPitcherTotals = (teamPitchers: any[]) => {
    const totals = { ip: 0, h: 0, bb: 0, k: 0, hr: 0 }
    
    teamPitchers.forEach(pitcher => {
      const stats = calculatePitcherStats(pitcher.pitcher_id)
      totals.ip += stats.ip
      totals.h += stats.h
      totals.bb += stats.bb
      totals.k += stats.k
      totals.hr += stats.hr
    })
    
    return totals
  }

  // Calculate team totals
  const homeTeamHitterTotals = calculateTeamHitterTotals(homeTeamHitters)
  const awayTeamHitterTotals = calculateTeamHitterTotals(awayTeamHitters)
  const homeTeamPitcherTotals = calculateTeamPitcherTotals(homeTeamPitchers)
  const awayTeamPitcherTotals = calculateTeamPitcherTotals(awayTeamPitchers)

// Reusable components to eliminate redundancy
const BattersTable = ({ 
  teamName, 
  hitters, 
  totals, 
  selectedHitter, 
  onPlayerClick 
}: {
  teamName: string
  hitters: any[]
  totals: any
  selectedHitter: string | null
  onPlayerClick: (name: string, id: string, isPitcher: boolean) => void
}) => (
  <div>
    <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
      Batters - {teamName}
    </h3>

    {/* Header Row */}
    <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
      <div className="col-span-2 pl-1">PLAYER</div>
      <div className="text-center"></div>
      <div className="text-center">PA</div>
      <div className="text-center">1B</div>
      <div className="text-center">2B</div>
      <div className="text-center">3B</div>
      <div className="text-center">HR</div>
      <div className="text-center">BB</div>
      <div className="text-center">K</div>
      <div className="text-center">HBP</div>
      <div className="text-center"></div>
    </div>

    {/* Player Rows */}
    {hitters.map((player) => {
      const stats = calculateHitterStats(player.batter_id)
      return (
        <div
          key={player.batter_id}
          className={`grid grid-cols-12 gap-1 text-xs py-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer rounded transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
            selectedHitter === player.batter_id ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          onClick={() => onPlayerClick(player.name, player.batter_id, false)}
        >
          <div className="col-span-3 font-medium pl-1">
            <span className="text-slate-900 dark:text-slate-100 font-semibold truncate block">
              {formatPlayerName(player.name)}
            </span>
          </div>
          
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.pa}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.singles}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.doubles}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.triples}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.hr}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.bb}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.k}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.hbp}</div>
          <div className="text-center"></div>
        </div>
      )
    })}

    {/* Totals Row */}
    <div className="grid grid-cols-12 gap-1 text-xs py-1 border-t-2 border-slate-300 dark:border-slate-600 mt-2 font-semibold bg-slate-50 dark:bg-slate-700/30 rounded">
      <div className="col-span-2 text-slate-900 dark:text-slate-100 pl-1">Totals</div>
      <div className="text-center"></div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.pa}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.singles}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.doubles}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.triples}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.hr}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.bb}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.k}</div>
      <div className="text-center text-slate-700 dark:text-slate-300">{totals.hbp}</div>
      <div className="text-center"></div>
    </div>
  </div>
)

const PitchersTable = ({ 
  teamName, 
  pitchers, 
  selectedPitcher, 
  onPlayerClick 
}: {
  teamName: string
  pitchers: any[]
  selectedPitcher: string | null
  onPlayerClick: (name: string, id: string, isPitcher: boolean) => void
}) => (
  <div>
    <h3 className="font-bold text-base mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
      Pitchers - {teamName}
    </h3>

    {/* Header Row */}
    <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 py-1 bg-slate-50 dark:bg-slate-700/30 rounded">
      <div className="col-span-2 pl-2">PITCHER</div>
      <div className="text-center">IP</div>
      <div className="text-center">H</div>
      <div className="text-center">BB</div>
      <div className="text-center">K</div>
      <div className="text-center">HR</div>
    </div>

    {/* Pitcher Rows */}
    {pitchers.map((pitcher) => {
      const stats = calculatePitcherStats(pitcher.pitcher_id)
      return (
        <div
          key={pitcher.pitcher_id}
          className={`grid grid-cols-7 gap-1 text-xs py-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer rounded transition-colors duration-150 ${
            selectedPitcher === pitcher.pitcher_id ? 'bg-gray-200 dark:bg-gray-700' : ''
          }`}
          onClick={() => onPlayerClick(pitcher.name, pitcher.pitcher_id, true)}
        >
          <div className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 pl-2">
            {formatPlayerName(pitcher.name)}
          </div>
          <div className="text-center text-slate-700 dark:text-slate-300">{displayInningsPitched(stats.ip)}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.h}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.bb}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.k}</div>
          <div className="text-center text-slate-700 dark:text-slate-300">{stats.hr}</div>
        </div>
      )
    })}
  </div>
)

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

  const handlePlayerClick = (playerName: string, playerType: "hitter" | "pitcher") => {
    console.log(`[v0] Player clicked: ${playerName} (${playerType})`)
    // User will edit this functionality later
  }

  const handleAtBatClick = (atBat: any) => {
    setSelectedPlateAppearance(atBat)
    setSelectedPitch(null)
    const key = getPAKey(atBat)
    setExpandedPAs(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
    // Switch camera to Catcher's View
    try {
      if (typeof window !== 'undefined' && (window as any).setCatcherView) {
        (window as any).setCatcherView()
      }
    } catch {}
  }

  const handleLineupPlayerClick = (playerName: string, playerId: string, isPitcher: boolean = false) => {
    if (isPitcher) {
      setSelectedPitcher(playerId)
      setSelectedHitter(null)
    } else {
      setSelectedHitter(playerId)
      setSelectedPitcher(null)
    }
    setSelectedPlateAppearance(null)
    setSelectedPitch(null)
    setExpandedPAs(new Set())
  }

  const getPAKey = (pa: any) => `${pa.top_bottom}${pa.inning}-pa${pa.pa_of_inning}`

  // Pitcher Reports Modal Component
  const PitcherReportsModal = () => {
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null)
    const [selectedPitcher, setSelectedPitcher] = useState<any>(null)
    const [showPitcherReport, setShowPitcherReport] = useState(false)

    const handleTeamSelect = (team: 'home' | 'away') => {
      setSelectedTeam(team)
      setSelectedPitcher(null)
      setShowPitcherReport(false)
    }

    const handlePitcherSelect = (pitcher: any) => {
      // Create a compatible pitcher object for PrintPitcherReport
      const compatiblePitcher = {
        ...pitcher,
        player_id: pitcher.pitcher_id, // Map pitcher_id to player_id for compatibility
        name: pitcher.name,
        throws: pitcher.throws // Include throws field for RHP/LHP display
      }
      setSelectedPitcher(compatiblePitcher)
      setShowPitcherReport(true)
    }

    const handleCloseReport = () => {
      setShowPitcherReport(false)
      setSelectedPitcher(null)
    }

    const handleCloseModal = () => {
      setShowPitcherReports(false)
      setSelectedTeam(null)
      setSelectedPitcher(null)
      setShowPitcherReport(false)
    }

    const getTeamPitchers = (team: 'home' | 'away') => {
      if (team === 'home') {
        return homeTeamPitchers
      } else {
        return awayTeamPitchers
      }
    }

    const getTeamName = (team: 'home' | 'away') => {
      if (team === 'home') {
        return homeTeamName
      } else {
        return awayTeamName
      }
    }

    if (!showPitcherReports) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Print Pitcher Reports
            </h2>
            <button
              onClick={handleCloseModal}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          {!selectedTeam ? (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Select a team to view available pitchers:
              </p>
              <button
                onClick={() => handleTeamSelect('home')}
                className="w-full p-3 text-left border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{homeTeamName}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Home Team</div>
              </button>
              <button
                onClick={() => handleTeamSelect('away')}
                className="w-full p-3 text-left border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{awayTeamName}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Away Team</div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ← Back
                </button>
                <span className="text-slate-600 dark:text-slate-400">|</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {getTeamName(selectedTeam)} Pitchers
                </span>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getTeamPitchers(selectedTeam).map((pitcher) => (
                  <button
                    key={pitcher.pitcher_id}
                    onClick={() => handlePitcherSelect(pitcher)}
                    className="w-full p-3 text-left border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {pitcher.name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      ID: {pitcher.pitcher_id}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show PrintPitcherReport when a pitcher is selected */}
          {showPitcherReport && selectedPitcher && (
            <PrintPitcherReport
              pitcher={selectedPitcher}
              games={games}
              onClose={handleCloseReport}
              skipGameSelection={true}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => router.push('/imported-games')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Back to View Games
            </button>
            <button 
              onClick={() => setShowPitcherReports(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Print Pitcher Reports
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

        <Tabs defaultValue="gameday" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-700 mb-6">
            <TabsTrigger value="gameday" className="text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              Gameday
            </TabsTrigger>
            <TabsTrigger value="pitcher-analysis" className="text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              Pitcher Trends
            </TabsTrigger>
            <TabsTrigger value="interactive-zone-analysis" className="text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600">
              Interactive Zone Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gameday">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
          <div className="xl:col-span-2 lg:col-span-3 md:col-span-4">
            <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-slate-100 text-lg font-semibold">
                  {selectedPitcher ? 'Pitcher Appearances' : 'Plate Appearances'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] lg:h-[500px] pr-4">
                  <div className="space-y-3">
                    {(selectedPitcher ? selectedPitcherAtBats : selectedHitterAtBats).map((atBat, index) => {
                      const key = getPAKey(atBat)
                      const isOpen = expandedPAs.has(key)
                      const sortedPitches = [...(atBat.allPitches || [])]
                        .sort((a, b) => (a?.pitch_of_pa || 0) - (b?.pitch_of_pa || 0))
                      return (
                        <div key={index} className={`p-3 lg:p-4 rounded-lg border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 ${
                          selectedPlateAppearance && getPAKey(selectedPlateAppearance) === key 
                            ? 'bg-gray-200 dark:bg-gray-700' 
                            : 'bg-slate-50 dark:bg-slate-700/50'
                        }`}>
                          <button
                            className="w-full text-left"
                        onClick={() => handleAtBatClick(atBat)}
                      >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                          >
                                  {atBat.top_bottom}{atBat.inning}
                          </Badge>
                              </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{atBat.count}</span>
                        </div>
                        <div className="text-sm mb-1 text-slate-900 dark:text-slate-100 space-y-1">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Batter:</span>{' '}
                            <span className="font-semibold">{selectedPitcher ? atBat.batterName : atBat.hitterName}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Pitcher:</span>{' '}
                            <span className="font-semibold">{atBat.pitcherName}</span>
                          </div>
                        </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Outs: {atBat.outs}</div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{atBat.result}</div>
                          </button>
                          {isOpen && (
                            <div className="mt-3 border-t border-slate-200 dark:border-slate-600 pt-3">
                              <div className="flex flex-col gap-2">
                                {sortedPitches.map((p: any) => (
                                  <button
                                    key={p.pitch_uid}
                                    className={`w-full text-left px-3 py-2 rounded-md border text-[10px] md:text-[11px] border-slate-200 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
                                      selectedPitch && selectedPitch.pitch_uid === p.pitch_uid
                                        ? 'bg-gray-300 dark:bg-gray-600'
                                        : 'bg-white/70 dark:bg-slate-800/70'
                                    }`}
                                    onClick={() => {
                                      // Placeholder click behavior for pitch box
                                      console.log('Pitch clicked:', {
                                        pitch_uid: p.pitch_uid,
                                        pitch_of_pa: p.pitch_of_pa,
                                        pitch_call: p.pitch_call,
                                        balls: p.balls,
                                        strikes: p.strikes,
                                        outs: p.outs,
                                      })
                                      // Keep selected plate appearance the same
                                      setSelectedPlateAppearance(atBat)
                                      // Set selected pitch for the 3D viewer to render trajectories
                                      setSelectedPitch(p)
                                      // Ensure camera is in Catcher's View for consistency
                                      try {
                                        if (typeof window !== 'undefined' && (window as any).setCatcherView) {
                                          (window as any).setCatcherView()
                                        }
                                      } catch {}
                                    }}
                                  >
                                    <div className="font-semibold text-[11px]">P{p.pitch_of_pa ?? '-'} · {p.pitch_call === 'FoulBallNotFieldable' ? 'Foul' : (p.pitch_call || 'Unknown')}</div>
                                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{(p.balls || 0)}-{(p.strikes || 0)} · Outs: {(p.outs || 0)}</div>
                                  </button>
                                ))}
                                {sortedPitches.length === 0 && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">No pitches found for this plate appearance</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {(selectedPitcher ? selectedPitcherAtBats : selectedHitterAtBats).length === 0 && (selectedHitter || selectedPitcher) && (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No {selectedPitcher ? 'appearances' : 'at-bats'} found for this {selectedPitcher ? 'pitcher' : 'player'}
                      </div>
                    )}
                    {!selectedHitter && !selectedPitcher && (
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
                    selectedPitch={selectedPitch}
                    onPitchSelect={setSelectedPitch}
                    selectedPlateAppearance={selectedPlateAppearance}
                    pitcherCache={pitcherCache}
                    pitcherCacheLoaded={pitcherCacheLoaded}
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
                        <BattersTable
                          teamName={homeTeamName}
                          hitters={homeTeamHitters}
                          totals={homeTeamHitterTotals}
                          selectedHitter={selectedHitter}
                          onPlayerClick={handleLineupPlayerClick}
                        />

                        <PitchersTable
                          teamName={homeTeamName}
                          pitchers={homeTeamPitchers}
                          selectedPitcher={selectedPitcher}
                          onPlayerClick={handleLineupPlayerClick}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                                     <TabsContent value="away" className="mt-6">
                     <ScrollArea className="h-[400px] lg:h-[500px]">
                      <div className="space-y-6 px-2">
                                                 {/* Batters Section */}
                         <BattersTable
                           teamName={awayTeamName}
                           hitters={awayTeamHitters}
                           totals={awayTeamHitterTotals}
                           selectedHitter={selectedHitter}
                           onPlayerClick={handleLineupPlayerClick}
                         />

                        {/* Pitchers Section */}
                        <PitchersTable
                          teamName={awayTeamName}
                          pitchers={awayTeamPitchers}
                          selectedPitcher={selectedPitcher}
                          onPlayerClick={handleLineupPlayerClick}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>
        </div>
          </TabsContent>

                    <TabsContent value="pitcher-analysis">
            <div className="min-h-[600px]">
              <GamedayGamesTrend 
                games={games} 
                selectedPitcher={selectedPitcher} 
                onPitcherSelect={handleLineupPlayerClick}
                homeTeamPlayers={homeTeamPlayers}
                awayTeamPlayers={awayTeamPlayers}
              />
            </div>
          </TabsContent>

          <TabsContent value="interactive-zone-analysis">
            <div className="min-h-[600px]">
              <GamedayInteractiveStrikezone 
                games={games} 
                selectedPitch={selectedZonePitch} 
                onPitchSelect={setSelectedZonePitch}
                homeTeamPlayers={homeTeamPlayers}
                awayTeamPlayers={awayTeamPlayers}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Pitcher Reports Modal */}
      <PitcherReportsModal />
    </div>
  )
}
