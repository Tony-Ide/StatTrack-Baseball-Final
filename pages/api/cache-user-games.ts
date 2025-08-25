import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import jwt from 'jsonwebtoken'
import { extractCookie } from '@/lib/utils'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const COOKIE_NAME = process.env.NEXT_PUBLIC_COOKIE_NAME || 'token'

function getToken(req: NextApiRequest): string | null {
  const cookie = req.headers.cookie || ''
  const token = extractCookie(cookie, COOKIE_NAME)
  
  if (token) {
    return token
  }
  
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7)
  }
  
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  try {
    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ error: true, message: 'Not authenticated' })
    }

    const payload: any = jwt.verify(token, JWT_SECRET!)
    const userId = payload.user_id

    // Fetch user's games from the games table only
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        id,
        game_id,
        game_uid,
        date,
        stadium,
        level,
        league,
        home_team,
        away_team
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching games for cache:', error)
      return res.status(500).json({ error: true, message: 'Failed to fetch games' })
    }

    // Group games by season
    const gamesBySeason: { [key: string]: any[] } = {}
    
    games?.forEach((game) => {
      const year = new Date(game.date).getFullYear().toString()
      const season = `${year}`
      
      if (!gamesBySeason[season]) {
        gamesBySeason[season] = []
      }
      
      gamesBySeason[season].push(game)
    })

    // Convert to the expected format
    const seasonsData = Object.keys(gamesBySeason).map(season => ({
      season,
      games: gamesBySeason[season]
    }))

    return res.status(200).json(seasonsData)

  } catch (err) {
    console.error('Error in cache-user-games:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
