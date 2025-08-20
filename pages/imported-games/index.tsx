"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parseGameDate } from "@/lib/utils"
import { ArrowLeft, Calendar, MapPin, Users, Clock, Filter, Trash2, AlertTriangle, TrendingUp } from "lucide-react"

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

export default function ImportedGamesPage() {
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
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
          console.log('=== IMPORTED GAMES DEBUG ===')
          console.log('Games prop:', data)
          console.log('=== END DEBUG ===')
          setSeasons(data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching games:", err)
        setLoading(false)
      })
  }, [router])

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

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    setGameToDelete({ id: gameId, name: gameName })
    setShowDeleteConfirm(true)
  }

  const confirmDeleteGame = async () => {
    if (!gameToDelete) return

    setDeletingGameId(gameToDelete.id)
    setShowDeleteConfirm(false)

    try {
      const response = await fetch('/api/delete-game', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ game_id: gameToDelete.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete game')
      }

      // Refresh the games list
      const gamesResponse = await fetch("/api/user-games", { credentials: "include" })
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json()
        if (Array.isArray(gamesData)) {
          setSeasons(gamesData)
        }
      }

      // Show success toast
      showToast('Game deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting game:', error)
      showToast('Failed to delete game. Please try again.', 'error')
    } finally {
      setDeletingGameId(null)
      setGameToDelete(null)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-full ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`
    toast.textContent = message

    // Add to DOM
    document.body.appendChild(toast)

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full')
    }, 100)

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full')
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  // Filter seasons based on selected season
  const filteredSeasons = selectedSeason === "all" 
    ? seasons 
    : seasons.filter(season => season.season === selectedSeason)

  const totalGames = seasons.reduce((total, season) => total + season.games.length, 0)
  const filteredTotalGames = filteredSeasons.reduce((total, season) => total + season.games.length, 0)

  if (loading) {
    return (
      <Layout showLogout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your imported games...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showLogout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            
            {/* Season Filter */}
            {seasons.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Season:</span>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.season} value={season.season}>
                        {season.season} ({season.games.length} game{season.games.length === 1 ? '' : 's'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Imported Games</h1>
            <p className="text-gray-600">
              {selectedSeason === "all" 
                ? (totalGames > 0 
                    ? `${totalGames} game${totalGames === 1 ? '' : 's'} across ${seasons.length} season${seasons.length === 1 ? '' : 's'} imported by ${userEmail}`
                    : `No games imported yet by ${userEmail}`
                  )
                : `Showing ${filteredTotalGames} game${filteredTotalGames === 1 ? '' : 's'} from ${selectedSeason}`
              }
            </p>
          </div>
        </div>

        {/* Games List */}
        {totalGames === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No games imported yet</h3>
              <p className="text-gray-600 mb-6">
                Upload TrackMan CSV files from the dashboard to see your games here.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : filteredTotalGames === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No games found</h3>
              <p className="text-gray-600 mb-6">
                No games found for the selected season. Try selecting a different season.
              </p>
              <Button onClick={() => setSelectedSeason("all")} variant="outline">
                Show All Seasons
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredSeasons.map((season) => (
              <div key={season.season}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  {season.season} ({season.games.length} game{season.games.length === 1 ? '' : 's'})
                </h2>
                <div className="grid gap-4">
                  {season.games.map((game) => (
                    <Card key={game.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                              {game.away_team} @ {game.home_team}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(game.date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {game.stadium}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {game.league}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getLevelColor(game.level)}>
                                {game.level}
                              </Badge>
                                                             <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleDeleteGame(game.game_id, `${game.away_team} @ ${game.home_team}`)}
                                 disabled={deletingGameId === game.game_id}
                                 className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                                 title="Delete game"
                               >
                                 {deletingGameId === game.game_id ? (
                                   <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                 ) : (
                                   <Trash2 className="w-4 h-4" />
                                 )}
                               </Button>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {getPitchCount(game)} pitches
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Game ID: {game.game_id}
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => {
                              router.push(`/imported-games/games/${game.game_uid}`)
                            }}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Analyze
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
                 )}

         {/* Delete Confirmation Modal */}
         {showDeleteConfirm && gameToDelete && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                   <AlertTriangle className="w-5 h-5 text-red-600" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-gray-900">Delete Game</h3>
                   <p className="text-sm text-gray-600">This action cannot be undone</p>
                 </div>
               </div>
               
               <p className="text-gray-700 mb-6">
                 Are you sure you want to delete <span className="font-semibold">"{gameToDelete.name}"</span>? 
                 This will permanently remove the game and all associated data.
               </p>
               
               <div className="flex gap-3 justify-end">
                 <Button
                   variant="outline"
                   onClick={() => {
                     setShowDeleteConfirm(false)
                     setGameToDelete(null)
                   }}
                   disabled={deletingGameId === gameToDelete.id}
                 >
                   Cancel
                 </Button>
                 <Button
                   variant="destructive"
                   onClick={confirmDeleteGame}
                   disabled={deletingGameId === gameToDelete.id}
                 >
                   {deletingGameId === gameToDelete.id ? (
                     <div className="flex items-center gap-2">
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                       Deleting...
                     </div>
                   ) : (
                     'Delete Game'
                   )}
                 </Button>
               </div>
             </div>
           </div>
         )}
       </div>
     </Layout>
   )
 }