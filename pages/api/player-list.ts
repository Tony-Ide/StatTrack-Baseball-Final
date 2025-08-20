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
  
  // Use precise cookie extraction to avoid conflicts with similar cookie names
  const token = extractCookie(cookie, COOKIE_NAME)
  
  if (token) {
    console.log(`[PLAYER-LIST] Token extracted successfully. Length: ${token.length}, Preview: ${token.substring(0, 20)}...`)
    return token
  }
  
  // Fallback to Authorization header
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7)
    console.log(`[PLAYER-LIST] Bearer token extracted. Length: ${bearerToken.length}, Preview: ${bearerToken.substring(0, 20)}...`)
    return bearerToken
  }
  
  console.log(`[PLAYER-LIST] No token found in cookies or Authorization header`)
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }
  let team_id = ''
  let team_name = ''
  let userId: string
  try {
    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ error: true, message: 'Not authenticated' })
    }
    
    try {
    const payload: any = jwt.verify(token, JWT_SECRET!)
      console.log(`[PLAYER-LIST] Token verified successfully for user: ${payload.user_id}`)
    userId = payload.user_id
    // If opponent_team_id is provided, use that; otherwise use user's team_id from JWT
    team_id = typeof req.query.opponent_team_id === 'string' && req.query.opponent_team_id
      ? req.query.opponent_team_id
      : payload.team_id
    // Fetch team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('team_id', team_id)
      .single()
    team_name = team?.name || ''
    } catch (jwtError) {
      console.error(`[PLAYER-LIST] JWT verification failed:`, jwtError)
      return res.status(401).json({ error: true, message: 'Invalid or expired token.' })
    }
  } catch (err) {
    console.error(`[PLAYER-LIST] Unexpected error:`, err)
    return res.status(500).json({ error: true, message: 'Internal server error.' })
  }

  // First get all games imported by this user where the selected opponent team appears
  const { data: userGames } = await supabase
    .from('games')
    .select('game_id, home_team_foreign_id, away_team_foreign_id')
    .eq('user_id', userId)
    .or(`home_team_foreign_id.eq.${team_id},away_team_foreign_id.eq.${team_id}`)

  const userGameIds = (userGames || []).map(game => game.game_id)
  
  if (userGameIds.length === 0) {
    return res.status(200).json({
      team_id,
      team_name,
      pitchers: [],
      hitters: []
    })
  }

  // Get all player IDs that appear in pitches from games where the opponent team played
  const { data: pitchPlayers } = await supabase
    .from('pitches')
    .select('pitcher_id, batter_id')
    .in('game_id', userGameIds)

  const playerIds = new Set<string>()
  if (pitchPlayers) {
    pitchPlayers.forEach(pitch => {
      if (pitch.pitcher_id) playerIds.add(pitch.pitcher_id)
      if (pitch.batter_id) playerIds.add(pitch.batter_id)
    })
  }

  const playerIdArray = Array.from(playerIds)

  if (playerIdArray.length === 0) {
    return res.status(200).json({
      team_id,
      team_name,
      pitchers: [],
      hitters: []
    })
  }

  // Fetch pitchers (throws not null) - only players from the selected opponent team in user's games
  const { data: pitcherPlayers } = await supabase
    .from('players')
    .select('player_id, name')
    .eq('team_id', team_id)
    .not('throws', 'is', null)
    .in('player_id', playerIdArray)

  // Fetch hitters (side not null) - only players from the selected opponent team in user's games
  const { data: hitterPlayers } = await supabase
    .from('players')
    .select('player_id, name')
    .eq('team_id', team_id)
    .not('side', 'is', null)
    .in('player_id', playerIdArray)

  return res.status(200).json({
    team_id,
    team_name,
    pitchers: pitcherPlayers || [],
    hitters: hitterPlayers || []
  })
} 