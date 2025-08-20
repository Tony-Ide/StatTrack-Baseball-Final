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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: true, message: 'Method not allowed' })
  }

  try {
    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ error: true, message: 'Not authenticated' })
    }

    const payload: any = jwt.verify(token, JWT_SECRET!)
    const userId = payload.user_id
    const { game_id } = req.body

    if (!game_id) {
      return res.status(400).json({ error: true, message: 'Game ID is required' })
    }

    // Step 1: Get game info to identify teams before deletion
    const { data: gameInfo, error: gameInfoError } = await supabase
      .from('games')
      .select('home_team_foreign_id, away_team_foreign_id')
      .eq('game_id', game_id)
      .eq('user_id', userId)
      .single()

    if (gameInfoError) {
      console.error('Error fetching game info:', gameInfoError)
      return res.status(500).json({ error: true, message: 'Failed to fetch game info' })
    }

    if (!gameInfo) {
      return res.status(404).json({ error: true, message: 'Game not found' })
    }

    const homeTeamId = gameInfo.home_team_foreign_id
    const awayTeamId = gameInfo.away_team_foreign_id

    // Step 2: Delete the games row with game_id and user_id
    const { error: gameDeleteError } = await supabase
      .from('games')
      .delete()
      .eq('game_id', game_id)
      .eq('user_id', userId)

    if (gameDeleteError) {
      console.error('Error deleting game:', gameDeleteError)
      return res.status(500).json({ error: true, message: 'Failed to delete game' })
    }

    // Step 3: Check if game_id still exists in games table (global)
    const { data: remainingGames, error: checkError } = await supabase
      .from('games')
      .select('game_id')
      .eq('game_id', game_id)

    if (checkError) {
      console.error('Error checking remaining games:', checkError)
      return res.status(500).json({ error: true, message: 'Failed to check remaining games' })
    }

    // If no other users have this game, proceed with cascade deletion
    if (!remainingGames || remainingGames.length === 0) {
      // Step 4: Get all pitch_uids from this game's pitches before deleting
      const { data: gamePitches, error: pitchesError } = await supabase
        .from('pitches')
        .select('pitch_uid')
        .eq('game_id', game_id)

      if (pitchesError) {
        console.error('Error fetching game pitches:', pitchesError)
        return res.status(500).json({ error: true, message: 'Failed to fetch game pitches' })
      }

      const pitchUids: string[] = []
      if (gamePitches) {
        gamePitches.forEach(pitch => {
          if (pitch.pitch_uid) pitchUids.push(pitch.pitch_uid)
        })
      }

      // Step 5: Delete all related data in reverse dependency order
      if (pitchUids.length > 0) {
        // Delete hit_trajectory
        const { error: hitTrajectoryError } = await supabase
          .from('hit_trajectory')
          .delete()
          .in('pitch_uid', pitchUids)

        if (hitTrajectoryError) {
          console.error('Error deleting hit_trajectory:', hitTrajectoryError)
        }

        // Delete pitch_trajectory
        const { error: pitchTrajectoryError } = await supabase
          .from('pitch_trajectory')
          .delete()
          .in('pitch_uid', pitchUids)

        if (pitchTrajectoryError) {
          console.error('Error deleting pitch_trajectory:', pitchTrajectoryError)
        }

        // Delete hitting_metrics
        const { error: hittingMetricsError } = await supabase
          .from('hitting_metrics')
          .delete()
          .in('pitch_uid', pitchUids)

        if (hittingMetricsError) {
          console.error('Error deleting hitting_metrics:', hittingMetricsError)
        }

        // Delete pitching_metrics
        const { error: pitchingMetricsError } = await supabase
          .from('pitching_metrics')
          .delete()
          .in('pitch_uid', pitchUids)

        if (pitchingMetricsError) {
          console.error('Error deleting pitching_metrics:', pitchingMetricsError)
        }
      }

      // Delete pitches
      const { error: pitchesDeleteError } = await supabase
        .from('pitches')
        .delete()
        .eq('game_id', game_id)

      if (pitchesDeleteError) {
        console.error('Error deleting pitches:', pitchesDeleteError)
        return res.status(500).json({ error: true, message: 'Failed to delete pitches' })
      }

      // Step 6: Get all players from the deleted teams and check if they still exist in pitches table (global)
      const teamIds = [homeTeamId, awayTeamId].filter(Boolean)
      
      if (teamIds.length > 0) {
        // Get all players from the deleted teams
        const { data: teamPlayers, error: teamPlayersError } = await supabase
          .from('players')
          .select('player_id')
          .in('team_id', teamIds)

        if (teamPlayersError) {
          console.error('Error fetching team players:', teamPlayersError)
        } else if (teamPlayers && teamPlayers.length > 0) {
          const playerIds = teamPlayers.map(p => p.player_id)
          
          // Check each player from the deleted teams
          for (const playerId of playerIds) {
            const { data: playerPitches, error: playerCheckError } = await supabase
              .from('pitches')
              .select('pitch_uid')
              .or(`pitcher_id.eq.${playerId},batter_id.eq.${playerId}`)
              .limit(1)

            if (playerCheckError) {
              console.error('Error checking player pitches:', playerCheckError)
              continue
            }

            // If player has no remaining pitches, delete from players table
            if (!playerPitches || playerPitches.length === 0) {
              const { error: playerDeleteError } = await supabase
                .from('players')
                .delete()
                .eq('player_id', playerId)

              if (playerDeleteError) {
                console.error('Error deleting player:', playerDeleteError)
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Game deleted successfully' })

  } catch (err) {
    console.error('Error in delete-game:', err)
    return res.status(500).json({ error: true, message: 'Internal server error' })
  }
}
