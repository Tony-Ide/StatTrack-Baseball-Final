"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Users, Clock } from "lucide-react"
import { parseGameDate } from "@/lib/utils"

interface Game {
  id: number
  game_id: string
  game_uid: string
  date: string
  stadium: string
  level: string
  league: string
  home_team: string
  away_team: string
  innings?: any[]
}

interface Season {
  season: string
  games: Game[]
}

export default function GameDetailPage() {
  const router = useRouter()
  const { id: gameUid } = router.query
  const [game, setGame] = useState<Game | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [filteredGamesProp, setFilteredGamesProp] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    if (!gameUid) return

    // Authentication check
    fetch("/api/authcheck", { credentials: "include" })
      .then(res => {
        if (!res.ok) {
          router.push("/login")
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data && data.user && data.user.email) {
          setUserEmail(data.user.email)
          // Fetch user's games
          return fetch("/api/user-games", { credentials: "include" })
        }
        return null
      })
      .then(res => {
        if (!res) return null
        if (!res.ok) {
          throw new Error("Failed to fetch games")
        }
        return res.json()
      })
             .then(data => {
         if (data && Array.isArray(data)) {
           // Find the specific game by game_uid
           let foundGame: Game | null = null
           let foundSeason: Season | null = null
          
          for (const seasonData of data) {
            const gameInSeason = seasonData.games?.find((g: Game) => g.game_uid === gameUid)
            if (gameInSeason) {
              foundGame = gameInSeason
              foundSeason = seasonData
              break
            }
          }
          
                     if (foundGame && foundSeason) {
             // Create filtered games prop structure with only the selected game
             const filteredGamesProp = [{
               season: foundSeason.season,
               games: [foundGame]  // Only the selected game
             }]
             
             console.log('=== GAMES PROP PASSED TO [ID] PAGE ===')
             console.log('Filtered games prop (only selected game):', filteredGamesProp)
             console.log('=== END DEBUG ===')
             
             setGame(foundGame)
             setSeason(foundSeason)
             setFilteredGamesProp(filteredGamesProp)
           } else {
             // Game not found, redirect back to imported games
             router.push("/imported-games")
           }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching games:", err)
        setLoading(false)
      })
  }, [gameUid, router])

  const formatDate = (dateString: string) => {
    const date = parseGameDate(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'd1': return 'bg-blue-100 text-blue-800'
      case 'd2': return 'bg-green-100 text-green-800'
      case 'd3': return 'bg-yellow-100 text-yellow-800'
      case 'professional': return 'bg-purple-100 text-purple-800'
      case 'high school': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPitchCount = (game: Game) => {
    if (!game.innings) return 0
    return game.innings.reduce((total, inning) => {
      return total + inning.plate_appearances.reduce((inningTotal: number, pa: any) => {
        return inningTotal + (pa.pitches?.length || 0)
      }, 0)
    }, 0)
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading game details...</div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!game || !season) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Game not found</div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/imported-games")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Games
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Game Analysis</h1>
              <p className="text-gray-600">{season.season}</p>
            </div>
          </div>
        </div>

        {/* Game Info Card */}
        <Card className="bg-white border-blue-100">
          <CardHeader>
            <CardTitle className="text-gray-900">Game Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold">{formatDate(game.date)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Teams</p>
                  <p className="font-semibold">{game.away_team} @ {game.home_team}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Stadium</p>
                  <p className="font-semibold">{game.stadium}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Pitches</p>
                  <p className="font-semibold">{getPitchCount(game)}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className={getLevelColor(game.level)}>
                {game.level}
              </Badge>
              <Badge variant="outline">
                {game.league}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Game Analysis Content */}
        <Card className="bg-white border-blue-100">
          <CardHeader>
            <CardTitle className="text-gray-900">Game Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Game analysis features coming soon...</p>
              <p className="text-sm text-gray-500 mt-2">
                This page will contain detailed analysis of the selected game.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
