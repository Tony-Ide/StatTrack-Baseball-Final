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
}

export default function AuthForm({ onAuth, mode, teams = [] }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [team, setTeam] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "register" && (!email || !password || !team)) return
    if (mode === "login" && (!email || !password)) return
    onAuth(email, password, mode === "register" ? team : undefined)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{mode === "login" ? "Sign In" : "Sign Up"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Welcome back to UCI Baseball Stats"
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
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
