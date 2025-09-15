"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AuthFormProps {
  onAuth: (email: string, password: string, team?: string) => void
  mode: "login" | "register"
  teams?: { team_id: string; name: string }[]
  error?: string | null
}

export default function AuthForm({ onAuth, mode, teams = [], error }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [team, setTeam] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (mode === "register" && (!email || !password || !team)) return
    if (mode === "login" && (!email || !password)) return
    
    // Only allow .edu email addresses for registration
    if (mode === "register") {
      const emailDomain = email.split('@')[1]?.toLowerCase()
      if (!emailDomain || !emailDomain.endsWith('.edu')) {
        alert('Only .edu email addresses are allowed for registration. Please use your educational institution email.')
        return
      }
    }
    
    onAuth(email, password, mode === "register" ? team : undefined)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{mode === "login" ? "Sign In" : "Sign Up"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Welcome back to StatTrack Baseball"
              : "Create your account to access baseball stats"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              {mode === "register" && (
                <p className="text-xs text-gray-500 mt-1">
                  .edu email addresses are not allowed for registration
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {mode === "register" && (
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                Team
              </label>
              <Select value={team} onValueChange={setTeam} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.team_id} value={t.team_id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            )}

            <Button type="submit" className="w-full">
              {mode === "login" ? "Sign In" : "Sign Up"}
            </Button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
                {mode === "login" && typeof error === 'string' && error.includes("verify your email") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/start-verify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email })
                        })
                        if (res.ok) {
                          alert('Verification email sent! Check your inbox and the server console for the verification URL.')
                        } else {
                          alert('Failed to send verification email. Please try again.')
                        }
                      } catch (err) {
                        alert('Error sending verification email. Please try again.')
                      }
                    }}
                  >
                    Resend Verification Email
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
