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
    if (res.ok) {
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
      setError(data.error || "Login failed")
    }
  }

  return (
    <Layout>
      <AuthForm onAuth={handleAuth} mode="login" />
      {error && <div className="text-red-600 text-center mt-2">{error}</div>}
      <div className="text-center mt-4">
        <a href="/register" className="text-blue-600 hover:underline text-sm">Don't have an account? Sign up</a>
      </div>
    </Layout>
  )
} 