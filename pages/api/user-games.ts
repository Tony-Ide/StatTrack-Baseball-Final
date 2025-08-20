import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import jwt from 'jsonwebtoken'
import { extractCookie, parseGameDate } from '@/lib/utils'

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
    console.log(`[USER-GAMES] Token extracted successfully. Length: ${token.length}, Preview: ${token.substring(0, 20)}...`)
    return token
  }
  
  // Fallback to Authorization header
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7)
    console.log(`[USER-GAMES] Bearer token extracted. Length: ${bearerToken.length}, Preview: ${bearerToken.substring(0, 20)}...`)
    return bearerToken
  }
  
  console.log(`[USER-GAMES] No token found in cookies or Authorization header`)
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  // Authentication check
  let userId: string
  try {
    const token = getToken(req)
    if (!token) {
      console.log('[USER-GAMES] No token provided')
      return res.status(401).json({ error: true, message: 'Authentication required' })
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as any
    console.log(`[USER-GAMES] Token verified successfully for user: ${decoded.user_id}`)
    
    if (!decoded.user_id) {
      return res.status(401).json({ error: true, message: 'Invalid token format.' })
    }
    userId = decoded.user_id
  } catch (error) {
    console.error('[USER-GAMES] Token verification failed:', error)
    return res.status(401).json({ error: true, message: 'Invalid token' })
  }

  try {
    // Fetch all games for the authenticated user
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (gamesError) {
      console.error('[USER-GAMES] Database error:', gamesError)
      return res.status(500).json({ error: true, message: 'Failed to fetch games' })
    }

    if (!games || games.length === 0) {
      console.log(`[USER-GAMES] No games found for user ${userId}`)
      return res.status(200).json([])
    }

    // Helper function to determine season from game date
    function getSeasonFromDate(dateString: string): string {
      if (!dateString) return 'Unknown Season';
      
      const date = parseGameDate(dateString);
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const year = date.getFullYear();
      
      // Pre-season: August 1 to February 12
      if ((month >= 8) || (month <= 2 && date.getDate() <= 12)) {
        const seasonYear = month >= 8 ? year : year - 1;
        return `${seasonYear}-${seasonYear + 1} Pre-season`;
      }
      // Regular season: February 14 to July 1
      else if (month >= 2 && date.getDate() >= 14 || month <= 7) {
        return `${year} Regular Season`;
      }
      // Fallback
      else {
        return `${year} Regular Season`;
      }
    }

    // For each game, fetch all pitches with complete hierarchical structure
    const gamesBySeason = new Map<string, any[]>();
    
    for (const game of games) {
      const { data: pitches, error: pitchesError } = await supabase
        .from('pitches')
        .select(`*,
          pitching_metrics(*),
          pitch_trajectory(*),
          hitting_metrics(*),
          hit_trajectory(*),
          batter:players!batter_id(side),
          pitcher:players!pitcher_id(throws)
        `)
        .eq('game_id', game.game_id)
        .order('inning', { ascending: true })
        .order('top_bottom', { ascending: true })
        .order('pa_of_inning', { ascending: true })
        .order('pitch_of_pa', { ascending: true })

      if (pitchesError) {
        console.error(`[USER-GAMES] Error fetching pitches for game ${game.game_id}:`, pitchesError)
        continue
      }

      // Organize pitches into hierarchical structure: Game -> Innings -> Plate Appearances -> Pitches
      const organizedGame = {
        ...game,
        innings: []
      }

      // Group pitches by inning and top/bottom
      const inningGroups = new Map()
      pitches?.forEach(pitch => {
        const inningKey = `${pitch.inning}-${pitch.top_bottom}`
        if (!inningGroups.has(inningKey)) {
          inningGroups.set(inningKey, {
            inning: pitch.inning,
            top_bottom: pitch.top_bottom,
            plate_appearances: new Map()
          })
        }
        
        const inning = inningGroups.get(inningKey)
        const paKey = pitch.pa_of_inning
        if (!inning.plate_appearances.has(paKey)) {
          inning.plate_appearances.set(paKey, {
            pa_of_inning: pitch.pa_of_inning,
            pitches: []
          })
        }
        
        inning.plate_appearances.get(paKey).pitches.push(pitch)
      })

      // Convert to arrays and sort
      for (const [inningKey, inningData] of inningGroups) {
        const plateAppearances = []
        for (const [paKey, paData] of inningData.plate_appearances) {
          // Sort pitches within plate appearance by pitch_of_pa
          paData.pitches.sort((a: any, b: any) => a.pitch_of_pa - b.pitch_of_pa)
          plateAppearances.push(paData)
        }
        // Sort plate appearances by pa_of_inning
        plateAppearances.sort((a: any, b: any) => a.pa_of_inning - b.pa_of_inning)
        
        organizedGame.innings.push({
          inning: inningData.inning,
          top_bottom: inningData.top_bottom,
          plate_appearances: plateAppearances
        })
      }

      // Sort innings by inning number and top/bottom
      organizedGame.innings.sort((a: any, b: any) => {
        if (a.inning !== b.inning) return a.inning - b.inning
        return a.top_bottom === 'Top' ? -1 : 1
      })

      // Group by season
      const season = getSeasonFromDate(game.date);
      if (!gamesBySeason.has(season)) {
        gamesBySeason.set(season, []);
      }
      gamesBySeason.get(season)!.push(organizedGame);
    }

    // Convert to final structure: Seasons -> Games -> Innings -> Plate Appearances -> Pitches
    // Sort seasons by most recent first, then games within each season by most recent first
    const result = Array.from(gamesBySeason.entries())
      .map(([seasonName, seasonGames]) => ({
        season: seasonName,
        games: seasonGames.sort((a, b) => parseGameDate(b.date).getTime() - parseGameDate(a.date).getTime())
      }))
      .sort((a, b) => {
        // Sort seasons by year (extract year from season name)
        const yearA = parseInt(a.season.match(/\d{4}/)?.[0] || '0')
        const yearB = parseInt(b.season.match(/\d{4}/)?.[0] || '0')
        return yearB - yearA
      });

    console.log(`[USER-GAMES] Found ${games.length} games across ${result.length} seasons for user ${userId}`)
    
    return res.status(200).json(result)

  } catch (error) {
    console.error('[USER-GAMES] Unexpected error:', error)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}