import { useRouter } from "next/router"
import { useState } from "react"
import AuthForm from "@/components/AuthForm"
import Layout from "@/components/Layout"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async (email: string, password: string) => {
    setError(null)
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // ensure cookies are sent/received
    })
    
    if (res.status === 403) {
      // Email not verified - offer to resend verification
      const data = await res.json()
      setError(data.message)
      return
    }
    
    if (res.ok) {
      // Cache user games data in localStorage
      try {
        const cacheRes = await fetch("/api/cache-user-games", {
          method: "POST",
          credentials: "include",
        })
        if (cacheRes.ok) {
          const gamesData = await cacheRes.json()
          localStorage.setItem('cachedUserGames', JSON.stringify(gamesData))
          
          // Debug: Show cached data after login
          console.log('=== LOGIN CACHE DEBUG ===')
          console.log('User logged in:', email)
          console.log('Cached games data:', gamesData)
          console.log('Cache size:', JSON.stringify(gamesData).length, 'bytes')
          console.log('Number of seasons:', gamesData.length)
          console.log('Total games:', gamesData.reduce((total: number, season: any) => total + season.games.length, 0))
          console.log('Cache stored in localStorage as "cachedUserGames"')
          console.log('=== END LOGIN CACHE DEBUG ===')
        }
      } catch (error) {
        console.error('Error caching games:', error)
        // Continue with login even if caching fails
      }
      
      router.push("/dashboard")
      // Bypassing authcheck for now
      // const check = await fetch("/api/authcheck", { credentials: "include" })
      // if (check.ok) {
      //   router.push("/dashboard")
      // } else {
      //   setError("Login failed: could not verify session.")
      // }
    } else {
      const data = await res.json()
      setError(data.message || data.error || "Login failed")
    }
  }

  return (
    <Layout>
      <AuthForm onAuth={handleAuth} mode="login" error={error} />
      
      <div className="text-center mt-4 space-y-2">
        <div>
          <a href="/register" className="text-blue-600 hover:underline text-sm">Don't have an account? Sign up</a>
        </div>
        <div>
          <a href="/forgot-password" className="text-blue-600 hover:underline text-sm">Forgot your password?</a>
        </div>
      </div>
    </Layout>
  )
} 