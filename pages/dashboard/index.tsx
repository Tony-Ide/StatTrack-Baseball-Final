"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "@/components/Layout"
import WelcomeScreen from "@/components/WelcomeScreen"

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        }
        setLoading(false)
      })
  }, [router])

  const handleNavigate = (section: "games" | "players") => {
    if (section === "players") {
      router.push("/players")
    } else if (section === "games") {
      router.push("/imported-games")
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Layout showLogout>
      <WelcomeScreen userEmail={userEmail} onNavigate={handleNavigate} />
    </Layout>
  )
}
