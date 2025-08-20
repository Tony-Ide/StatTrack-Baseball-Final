import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import { extractCookie } from '@/lib/utils'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

function getToken(req: NextApiRequest): string | null {
  const cookie = req.headers.cookie || ''
  
  // Use precise cookie extraction to avoid conflicts with similar cookie names
  const token = extractCookie(cookie, COOKIE_NAME)
  
  if (token) {
    console.log(`[TEAMS] Token extracted successfully. Length: ${token.length}, Preview: ${token.substring(0, 20)}...`)
    return token
  }
  
  // Fallback to Authorization header
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7)
    console.log(`[TEAMS] Bearer token extracted. Length: ${bearerToken.length}, Preview: ${bearerToken.substring(0, 20)}...`)
    return bearerToken
  }
  
  console.log(`[TEAMS] No token found in cookies or Authorization header`)
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if user is authenticated
    const token = getToken(req)
    
    if (!token) {
      // No authentication - return all teams (for register page)
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('team_id, name')
        .order('name')

      if (teamsError) {
        return res.status(500).json({ error: teamsError.message })
  }

      return res.status(200).json({ teams: allTeams || [] })
    }

    // User is authenticated - return user-filtered teams
    try {
      const payload = jwt.verify(token, JWT_SECRET!) as any
      console.log(`[TEAMS] Token verified successfully for user: ${payload.user_id}`)
      
      if (!payload.user_id) {
        return res.status(401).json({ error: 'Invalid token format.' })
      }
      
      const userId = payload.user_id
      const userTeamId = payload.team_id

      // Get all games imported by this user
      const { data: userGames, error: userGamesError } = await supabase
        .from('games')
        .select('home_team_foreign_id, away_team_foreign_id')
        .eq('user_id', userId)

      if (userGamesError) {
        return res.status(500).json({ error: userGamesError.message })
      }

      // Extract unique team IDs from user's games, excluding user's own team
      const teamIds = new Set<string>()
      userGames?.forEach(game => {
        if (game.home_team_foreign_id && game.home_team_foreign_id !== userTeamId) {
          teamIds.add(game.home_team_foreign_id)
        }
        if (game.away_team_foreign_id && game.away_team_foreign_id !== userTeamId) {
          teamIds.add(game.away_team_foreign_id)
        }
      })

      const uniqueTeamIds = Array.from(teamIds)

      if (uniqueTeamIds.length === 0) {
        return res.status(200).json({ teams: [] })
      }

      // Fetch team details for the unique team IDs
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_id, name')
        .in('team_id', uniqueTeamIds)
        .order('name')

      if (teamsError) {
        return res.status(500).json({ error: teamsError.message })
      }

      return res.status(200).json({ teams: teams || [] })
    } catch (jwtError) {
      console.error(`[TEAMS] JWT verification failed:`, jwtError)
      return res.status(401).json({ error: 'Invalid or expired token.' })
    }
  } catch (err) {
    console.error(`[TEAMS] Unexpected error:`, err)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 