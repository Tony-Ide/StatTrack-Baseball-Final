"use client"

import { useEffect } from "react"
import { useRouter } from "next/router"

export default function StatsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to players page since we now use [id] routing
      router.replace("/players")
  }, [router])
  
  return <div>Redirecting to players...</div>
}
