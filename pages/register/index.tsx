import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import AuthForm from "@/components/AuthForm"
import Layout from "@/components/Layout"

export default function RegisterPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<{ team_id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data.teams || []))
      .catch(() => setTeams([]))
  }, [])

  const handleAuth = async (email: string, password: string, team?: string) => {
    setError(null)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, team_id: team }),
    })
    const data = await res.json()
    
    if (res.ok) {
      // Show success message with verification info
      alert(`Registration successful! ${data.message}\n\nFor development: Check the server console for the verification URL.`)
      router.push("/login")
    } else {
      setError(data.error || "Registration failed")
    }
  }

  return (
    <Layout>
      <AuthForm onAuth={handleAuth} mode="register" teams={teams} />
      {error && <div className="text-red-600 text-center mt-2">{error}</div>}
      <div className="text-center mt-4">
        <a href="/login" className="text-blue-600 hover:underline text-sm">Already have an account? Sign in</a>
      </div>
    </Layout>
  )
} 