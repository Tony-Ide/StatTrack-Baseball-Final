"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, UploadCloud } from "lucide-react"

interface WelcomeScreenProps {
  userEmail: string
  onNavigate: (section: "games" | "players") => void
}

export default function WelcomeScreen({ userEmail, onNavigate }: WelcomeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [debug, setDebug] = useState<string[] | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setDebug(null)
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setMessage("Please select a CSV file.")
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/import-trackman", {
      method: "POST",
      body: formData,
      credentials: "include"
    })
    let data: any = null
    try {
      data = await res.json()
    } catch (err) {
      setMessage("Failed to parse server response.")
      setUploading(false)
      return
    }
    if (res.ok) {
      setMessage("File imported successfully!")
      // Refresh the games cache after successful import
      try {
        const cacheRes = await fetch("/api/cache-user-games", {
          method: "POST",
          credentials: "include",
        })
        if (cacheRes.ok) {
          const gamesData = await cacheRes.json()
          localStorage.setItem('cachedUserGames', JSON.stringify(gamesData))
          
          // Debug: Show cache update after import
          console.log('=== IMPORT CACHE DEBUG ===')
          console.log('Game imported successfully!')
          console.log('Cache refreshed after import')
          console.log('Updated cached games data:', gamesData)
          console.log('Cache size:', JSON.stringify(gamesData).length, 'bytes')
          console.log('Number of seasons:', gamesData.length)
          console.log('Total games:', gamesData.reduce((total: number, season: any) => total + season.games.length, 0))
          console.log('Cache updated in localStorage as "cachedUserGames"')
          console.log('=== END IMPORT CACHE DEBUG ===')
        }
      } catch (error) {
        console.error('Error refreshing games cache:', error)
        // Continue even if cache refresh fails
      }
    } else {
      setMessage(data?.error || "Failed to import file.")
    }
    setDebug(data?.debug || null)
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600">Signed in as {userEmail}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>View Past Games Stats</CardTitle>
            <CardDescription>Analyze performance data from previous games and matches</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onNavigate("games")} className="w-full">
              View Games
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>View Players Stats</CardTitle>
            <CardDescription>Browse individual player statistics and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onNavigate("players")} className="w-full">
              View Stats
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/80 rounded-xl shadow-sm p-6 flex flex-col items-center">
          <CardHeader className="flex flex-col items-center">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
              <UploadCloud className="w-7 h-7 text-gray-500" />
            </div>
            <CardTitle className="text-lg font-semibold text-gray-800 mb-1">Import Trackman Data</CardTitle>
            <CardDescription className="text-gray-500 mb-2">Upload a Trackman CSV file to import new data.</CardDescription>
          </CardHeader>
          <CardContent className="w-full flex flex-col items-center">
            <form onSubmit={handleImport} className="flex flex-col items-center w-full gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={uploading}
              >
                {uploading ? "Importing..." : "Import"}
              </Button>
              {message && <div className={`text-center text-sm mt-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
              {debug && debug.length > 0 && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left max-h-64 overflow-y-auto border border-gray-200">
                  <div className="font-semibold mb-1 text-gray-700">Debug Info:</div>
                  <ul className="list-disc pl-5">
                    {debug.map((msg, idx) => (
                      <li key={idx} className="mb-1 whitespace-pre-line">{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
