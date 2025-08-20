import type { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'csv-parse/sync'
import { supabase } from '@/lib/supabase'
import formidable, { File } from 'formidable'
import fs from 'fs'
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
    console.log(`[IMPORT-TRACKMAN] Token extracted successfully. Length: ${token.length}, Preview: ${token.substring(0, 20)}...`)
    return token
  }
  
  // Fallback to Authorization header
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7)
    console.log(`[IMPORT-TRACKMAN] Bearer token extracted. Length: ${bearerToken.length}, Preview: ${bearerToken.substring(0, 20)}...`)
    return bearerToken
  }
  
  console.log(`[IMPORT-TRACKMAN] No token found in cookies or Authorization header`)
  return null
}

export const config = {
  api: {
    bodyParser: false,
  },
}

type TrackmanRow = { [key: string]: any }

async function parseForm(req: NextApiRequest): Promise<{ file: File | null }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false })
    form.parse(req, (err, fields, files) => {
      // Debug log
      // eslint-disable-next-line no-console
      console.log('FIELDS:', fields)
      // eslint-disable-next-line no-console
      console.log('FILES:', files)
      if (err) return reject(err)
      let file: File | undefined | File[] = files.file as File | File[] | undefined
      if (Array.isArray(file)) file = file[0]
      resolve({ file: file || null })
    })
  })
}

// Helper to normalize numeric fields
function normalize(val: any) {
  return val === '' ? null : val;
}

// Helper to get a value from multiple possible column names
function getField(row: TrackmanRow, ...names: string[]): any {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name];
  }
  return null;
}

// Helper to deduplicate an array of objects by a unique key
function deduplicateBatch<T>(batch: T[], uniqueKey: keyof T): T[] {
  const seen = new Set<any>()
  return batch.filter(row => {
    const key = row[uniqueKey]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Helper to parse integer columns or return null
function parseIntOrNull(val: any) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// Helper to convert player ID to clean integer string (removes .0)
function cleanPlayerId(val: any): string | null {
  if (val === '' || val === null || val === undefined) return null;
  // Convert to number first to handle any numeric format, then to clean integer string
  const num = Number(val);
  if (isNaN(num)) return null;
  return Math.floor(num).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authentication check
  let userId: string
  try {
    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Please login to access this resource.' })
    }
    
    try {
    const payload = jwt.verify(token, JWT_SECRET!) as any
      console.log(`[IMPORT-TRACKMAN] Token verified successfully for user: ${payload.user_id}`)
      
    if (!payload.user_id) {
      return res.status(401).json({ error: 'Invalid token format.' })
    }
    userId = payload.user_id
    } catch (jwtError) {
      console.error(`[IMPORT-TRACKMAN] JWT verification failed:`, jwtError)
      return res.status(401).json({ error: 'Invalid or expired token.' })
    }
  } catch (err) {
    console.error(`[IMPORT-TRACKMAN] Unexpected error:`, err)
    return res.status(500).json({ error: 'Internal server error.' })
  }

  let file: File | null = null
  try {
    const result = await parseForm(req)
    file = result.file
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse form data' })
  }
  if (!file || !file.filepath) {
    return res.status(400).json({ error: 'No file uploaded or file path missing' });
  }
  try {
    const csvString = fs.readFileSync(file.filepath, 'utf-8')
    const records = parse(csvString, { columns: true, skip_empty_lines: true }) as TrackmanRow[]
    let imported = {
      teams: 0,
      players: 0,
      games: 0,
      pitches: 0,
      pitching_metrics: 0,
      hitting_metrics: 0,
      pitch_trajectory: 0,
      hit_trajectory: 0
    }
    const debug: string[] = []

    debug.push(`Starting data import. Total records: ${records.length}`)

    // --- Collect data for each table ---
    const teamsToUpsert = new Set<string>()
    const playersToUpsert = new Set<string>()
    const gamesToUpsert = new Set<string>()
    const pitchesToUpsert: any[] = []
    const pitchingMetricsToUpsert: any[] = []
    const hittingMetricsToUpsert: any[] = []
    const pitchTrajectoryToUpsert: any[] = []
    const hitTrajectoryToUpsert: any[] = []

    let rowIndex = 0;
    // Build a mapping from team name to team_id (foreign ID) for this batch
    const teamNameToId: Record<string, string> = {};
    for (const row of records) {
      const homeTeamForeignId = getField(row, 'HomeTeamForeignID', 'home_team_foreign_id', 'homeTeamForeignId');
      const homeTeam = getField(row, 'HomeTeam', 'home_team', 'homeTeam');
      if (homeTeamForeignId && homeTeam) teamNameToId[homeTeam] = String(homeTeamForeignId);
      const awayTeamForeignId = getField(row, 'AwayTeamForeignID', 'away_team_foreign_id', 'awayTeamForeignId');
      const awayTeam = getField(row, 'AwayTeam', 'away_team', 'awayTeam');
      if (awayTeamForeignId && awayTeam) teamNameToId[awayTeam] = String(awayTeamForeignId);
    }
    for (const row of records) {
      rowIndex++;
      // --- TEAMS ---
      const homeTeamForeignId = getField(row, 'HomeTeamForeignID', 'home_team_foreign_id', 'homeTeamForeignId');
      const homeTeam = getField(row, 'HomeTeam', 'home_team', 'homeTeam');
      if (homeTeamForeignId && homeTeam) {
        teamsToUpsert.add(JSON.stringify({ team_id: String(homeTeamForeignId), name: homeTeam }))
      } else if (homeTeamForeignId || homeTeam) {
        debug.push(`Row ${rowIndex}: Skipped HomeTeam, missing HomeTeamForeignID or HomeTeam (values: ${homeTeamForeignId}, ${homeTeam})`)
      }
      const awayTeamForeignId = getField(row, 'AwayTeamForeignID', 'away_team_foreign_id', 'awayTeamForeignId');
      const awayTeam = getField(row, 'AwayTeam', 'away_team', 'awayTeam');
      if (awayTeamForeignId && awayTeam) {
        teamsToUpsert.add(JSON.stringify({ team_id: String(awayTeamForeignId), name: awayTeam }))
      } else if (awayTeamForeignId || awayTeam) {
        debug.push(`Row ${rowIndex}: Skipped AwayTeam, missing AwayTeamForeignID or AwayTeam (values: ${awayTeamForeignId}, ${awayTeam})`)
      }
      // --- PLAYERS ---
      const pitcherId = getField(row, 'PitcherId', 'PitcherID', 'pitcher_id', 'pitcherId');
      const pitcher = getField(row, 'Pitcher', 'pitcher');
      let pitcherTeam = getField(row, 'PitcherTeam', 'pitcher_team', 'pitcherTeam');
      // If pitcherTeam is a team name, map to team_id
      if (pitcherTeam && teamNameToId[pitcherTeam]) pitcherTeam = teamNameToId[pitcherTeam];
      const pitcherThrows = getField(row, 'PitcherThrows', 'pitcher_throws', 'pitcherThrows');
      if (pitcherId && pitcher && pitcherTeam) {
        const cleanPitcherId = cleanPlayerId(pitcherId);
        if (cleanPitcherId) {
          playersToUpsert.add(JSON.stringify({ player_id: cleanPitcherId, name: pitcher, throws: pitcherThrows, side: null, team_id: pitcherTeam }))
        } else {
          debug.push(`Row ${rowIndex}: Skipped Pitcher, invalid PitcherId (value: ${pitcherId})`)
        }
      } else if (pitcherId || pitcher) {
        debug.push(`Row ${rowIndex}: Skipped Pitcher, missing PitcherId, Pitcher, or PitcherTeam (values: ${pitcherId}, ${pitcher}, ${pitcherTeam})`)
      }
      const batterId = getField(row, 'BatterId', 'BatterID', 'batter_id', 'batterId');
      const batter = getField(row, 'Batter', 'batter');
      let batterTeam = getField(row, 'BatterTeam', 'batter_team', 'batterTeam');
      // If batterTeam is a team name, map to team_id
      if (batterTeam && teamNameToId[batterTeam]) batterTeam = teamNameToId[batterTeam];
      const batterSide = getField(row, 'BatterSide', 'batter_side', 'batterSide');
      if (batterId && batter && batterTeam) {
        const cleanBatterId = cleanPlayerId(batterId);
        if (cleanBatterId) {
          playersToUpsert.add(JSON.stringify({ player_id: cleanBatterId, name: batter, throws: null, side: batterSide, team_id: batterTeam }))
        } else {
          debug.push(`Row ${rowIndex}: Skipped Batter, invalid BatterId (value: ${batterId})`)
        }
      } else if (batterId || batter) {
        debug.push(`Row ${rowIndex}: Skipped Batter, missing BatterId, Batter, or BatterTeam (values: ${batterId}, ${batter}, ${batterTeam})`)
      }
      // --- GAMES ---
      const gameId = getField(row, 'GameID', 'game_id', 'gameId');
      const gameUID = getField(row, 'GameUID', 'game_uid', 'gameUid');
      const gameForeignID = getField(row, 'GameForeignID', 'game_foreign_id', 'gameForeignId');
      const rawDate = getField(row, 'Date', 'date');
      // Standardize the date to avoid timezone issues
      const date = rawDate && rawDate !== '' ? 
        new Date(rawDate + 'T00:00:00').toISOString().split('T')[0] : null;
      const stadium = getField(row, 'Stadium', 'stadium');
      const level = getField(row, 'Level', 'level');
      const league = getField(row, 'League', 'league');
      if (gameId) {
        gamesToUpsert.add(JSON.stringify({
          user_id: userId,
          game_id: String(gameId),
          game_uid: gameUID,
          game_foreign_id: gameForeignID,
          date: date && date !== '' ? date : null,
          stadium,
          level,
          league,
          home_team: homeTeam,
          away_team: awayTeam,
          home_team_foreign_id: String(homeTeamForeignId),
          away_team_foreign_id: String(awayTeamForeignId)
        }))
      } else {
        debug.push(`Row ${rowIndex}: Skipped Game, missing GameID (value: ${gameId})`)
      }
      // --- PITCHES ---
      const pitchUID = getField(row, 'PitchUID', 'pitch_uid', 'pitchUid');
      const pitchNo = getField(row, 'PitchNo', 'pitch_no', 'pitchNo');
      const inning = getField(row, 'Inning', 'inning');
      const topBottom = getField(row, 'Top/Bottom', 'TopBottom', 'top_bottom', 'topBottom');
      const outs = getField(row, 'Outs', 'outs');
      const balls = getField(row, 'Balls', 'balls');
      const strikes = getField(row, 'Strikes', 'strikes');
      const pitcherSet = getField(row, 'PitcherSet', 'pitcher_set', 'pitcherSet');
      const paOfInning = getField(row, 'PAofInning', 'pa_of_inning', 'paOfInning');
      const pitchOfPA = getField(row, 'PitchofPA', 'pitch_of_pa', 'pitchOfPA');
      const taggedPitchType = getField(row, 'TaggedPitchType', 'tagged_pitch_type', 'taggedPitchType');
      const autoPitchType = getField(row, 'AutoPitchType', 'auto_pitch_type', 'autoPitchType');
      const pitchCall = getField(row, 'PitchCall', 'pitch_call', 'pitchCall');
      const korBB = getField(row, 'KorBB', 'kor_bb', 'korBB');
      const taggedHitType = getField(row, 'TaggedHitType', 'tagged_hit_type', 'taggedHitType');
      const playResult = getField(row, 'PlayResult', 'play_result', 'playResult');
      const outsOnPlay = getField(row, 'OutsOnPlay', 'outs_on_play', 'outsOnPlay');
      const runsScored = getField(row, 'RunsScored', 'runs_scored', 'runsScored');
      const notes = getField(row, 'Notes', 'notes');
      if (pitchUID && gameId && pitcherId && batterId) {
        const cleanPitcherId = cleanPlayerId(pitcherId);
        const cleanBatterId = cleanPlayerId(batterId);
        if (cleanPitcherId && cleanBatterId) {
        pitchesToUpsert.push({
          pitch_uid: String(pitchUID),
          game_id: String(gameId),
          pitch_no: parseIntOrNull(pitchNo),
          date,
          time: getField(row, 'Time', 'time'),
          inning: parseIntOrNull(inning),
          top_bottom: topBottom,
          outs: parseIntOrNull(outs),
          balls: parseIntOrNull(balls),
          strikes: parseIntOrNull(strikes),
            pitcher_id: cleanPitcherId,
            batter_id: cleanBatterId,
          pitcher_set: pitcherSet,
          pa_of_inning: parseIntOrNull(paOfInning),
          pitch_of_pa: parseIntOrNull(pitchOfPA),
          tagged_pitch_type: taggedPitchType,
          auto_pitch_type: autoPitchType,
          pitch_call: pitchCall,
          kor_bb: korBB,
          tagged_hit_type: taggedHitType,
          play_result: playResult,
          outs_on_play: parseIntOrNull(outsOnPlay),
          runs_scored: parseIntOrNull(runsScored),
          notes
        })
      } else {
        debug.push(`Row ${rowIndex}: Skipped Pitch, missing PitchUID, GameID, PitcherId, or BatterId (values: ${pitchUID}, ${gameId}, ${pitcherId}, ${batterId})`)
      }
      } else {
        debug.push(`Row ${rowIndex}: Skipped Pitch, invalid player IDs (pitcher: ${pitcherId}, batter: ${batterId})`)
      }
      // --- PITCHING METRICS ---
      const pitchRelSpeed = getField(row, 'RelSpeed', 'rel_speed', 'relSpeed');
      const pitchVertRelAngle = getField(row, 'VertRelAngle', 'vert_rel_angle', 'vertRelAngle');
      const pitchHorzRelAngle = getField(row, 'HorzRelAngle', 'horz_rel_angle', 'horzRelAngle');
      const pitchSpinRate = getField(row, 'SpinRate', 'spin_rate', 'spinRate');
      const pitchSpinAxis = getField(row, 'SpinAxis', 'spin_axis', 'spinAxis');
      const pitchTilt = getField(row, 'Tilt', 'tilt');
      const pitchRelHeight = getField(row, 'RelHeight', 'rel_height', 'relHeight');
      const pitchRelSide = getField(row, 'RelSide', 'rel_side', 'relSide');
      const pitchExtension = getField(row, 'Extension', 'extension', 'extension');
      const pitchVertBreak = getField(row, 'VertBreak', 'vert_break', 'vertBreak');
      const pitchInducedVertBreak = getField(row, 'InducedVertBreak', 'induced_vert_break', 'inducedVertBreak');
      const pitchHorzBreak = getField(row, 'HorzBreak', 'horz_break', 'horzBreak');
      const pitchPlateLocHeight = getField(row, 'PlateLocHeight', 'plate_loc_height', 'plateLocHeight');
      const pitchPlateLocSide = getField(row, 'PlateLocSide', 'plate_loc_side', 'plateLocSide');
      const pitchZoneSpeed = getField(row, 'ZoneSpeed', 'zone_speed', 'zoneSpeed');
      const pitchVertApprAngle = getField(row, 'VertApprAngle', 'vert_appr_angle', 'vertApprAngle');
      const pitchHorzApprAngle = getField(row, 'HorzApprAngle', 'horz_appr_angle', 'horzApprAngle');
      const pitchZoneTime = getField(row, 'ZoneTime', 'zone_time', 'zoneTime');
      const pitchPfxx = getField(row, 'pfxx', 'pfxx');
      const pitchPfxz = getField(row, 'pfxz', 'pfxz');
      const pitchX0 = getField(row, 'x0', 'x0');
      const pitchY0 = getField(row, 'y0', 'y0');
      const pitchZ0 = getField(row, 'z0', 'z0');
      const pitchVx0 = getField(row, 'vx0', 'vx0');
      const pitchVy0 = getField(row, 'vy0', 'vy0');
      const pitchVz0 = getField(row, 'vz0', 'vz0');
      const pitchAx0 = getField(row, 'ax0', 'ax0');
      const pitchAy0 = getField(row, 'ay0', 'ay0');
      const pitchAz0 = getField(row, 'az0', 'az0');
      const pitchEffectiveVelo = getField(row, 'EffectiveVelo', 'effective_velo', 'effectiveVelo');
      const pitchMaxHeight = getField(row, 'MaxHeight', 'max_height', 'maxHeight');
      const pitchMeasuredDuration = getField(row, 'MeasuredDuration', 'measured_duration', 'measuredDuration');
      const pitchSpeedDrop = getField(row, 'SpeedDrop', 'speed_drop', 'speedDrop');
      const pitchPitchLastMeasuredX = getField(row, 'PitchLastMeasuredX', 'pitch_last_measured_x', 'pitchLastMeasuredX');
      const pitchPitchLastMeasuredY = getField(row, 'PitchLastMeasuredY', 'pitch_last_measured_y', 'pitchLastMeasuredY');
      const pitchPitchLastMeasuredZ = getField(row, 'PitchLastMeasuredZ', 'pitch_last_measured_z', 'pitchLastMeasuredZ');
      if (pitchUID && pitchRelSpeed !== undefined && pitchRelSpeed !== null && pitchRelSpeed !== '') {
        pitchingMetricsToUpsert.push({
          pitch_uid: String(pitchUID),
          rel_speed: normalize(pitchRelSpeed),
          vert_rel_angle: normalize(pitchVertRelAngle),
          horz_rel_angle: normalize(pitchHorzRelAngle),
          spin_rate: normalize(pitchSpinRate),
          spin_axis: normalize(pitchSpinAxis),
          tilt: pitchTilt,
          rel_height: normalize(pitchRelHeight),
          rel_side: normalize(pitchRelSide),
          extension: normalize(pitchExtension),
          vert_break: normalize(pitchVertBreak),
          induced_vert_break: normalize(pitchInducedVertBreak),
          horz_break: normalize(pitchHorzBreak),
          plate_loc_height: normalize(pitchPlateLocHeight),
          plate_loc_side: normalize(pitchPlateLocSide),
          zone_speed: normalize(pitchZoneSpeed),
          vert_appr_angle: normalize(pitchVertApprAngle),
          horz_appr_angle: normalize(pitchHorzApprAngle),
          zone_time: normalize(pitchZoneTime),
          pfxx: normalize(pitchPfxx),
          pfxz: normalize(pitchPfxz),
          x0: normalize(pitchX0),
          y0: normalize(pitchY0),
          z0: normalize(pitchZ0),
          vx0: normalize(pitchVx0),
          vy0: normalize(pitchVy0),
          vz0: normalize(pitchVz0),
          ax0: normalize(pitchAx0),
          ay0: normalize(pitchAy0),
          az0: normalize(pitchAz0),
          effective_velo: normalize(pitchEffectiveVelo),
          max_height: normalize(pitchMaxHeight),
          measured_duration: normalize(pitchMeasuredDuration),
          speed_drop: normalize(pitchSpeedDrop),
          pitch_last_measured_x: normalize(pitchPitchLastMeasuredX),
          pitch_last_measured_y: normalize(pitchPitchLastMeasuredY),
          pitch_last_measured_z: normalize(pitchPitchLastMeasuredZ)
        })
      } else if (pitchUID) {
        debug.push(`Row ${rowIndex}: Skipped Pitching Metrics for PitchUID ${pitchUID}, missing RelSpeed (values: ${pitchRelSpeed})`)
      }
      // --- HITTING METRICS ---
      const pitchExitSpeed = getField(row, 'ExitSpeed', 'exit_speed', 'exitSpeed');
      const pitchAngle = getField(row, 'Angle', 'angle');
      const pitchDirection = getField(row, 'Direction', 'direction');
      const pitchHitSpinRate = getField(row, 'HitSpinRate', 'hit_spin_rate', 'hitSpinRate');
      const pitchPositionAt110X = getField(row, 'PositionAt110X', 'position_at110x', 'positionAt110X');
      const pitchPositionAt110Y = getField(row, 'PositionAt110Y', 'position_at110y', 'positionAt110Y');
      const pitchPositionAt110Z = getField(row, 'PositionAt110Z', 'position_at110z', 'positionAt110Z');
      const pitchDistance = getField(row, 'Distance', 'distance');
      const pitchLastTrackedDistance = getField(row, 'LastTrackedDistance', 'last_tracked_distance', 'lastTrackedDistance');
      const pitchBearing = getField(row, 'Bearing', 'bearing');
      const pitchHangTime = getField(row, 'HangTime', 'hang_time', 'hangTime');
      const pitchContactPositionX = getField(row, 'ContactPositionX', 'contact_position_x', 'contactPositionX');
      const pitchContactPositionY = getField(row, 'ContactPositionY', 'contact_position_y', 'contactPositionY');
      const pitchContactPositionZ = getField(row, 'ContactPositionZ', 'contact_position_z', 'contactPositionZ');
      const pitchLocalDateTime = getField(row, 'LocalDateTime', 'local_date_time', 'localDateTime');
      const pitchUTCDateTime = getField(row, 'UTCDateTime', 'utc_date_time', 'utcDateTime');
      const pitchSystem = getField(row, 'System', 'system');
      if (pitchUID && pitchExitSpeed !== undefined && pitchExitSpeed !== null && pitchExitSpeed !== '') {
        hittingMetricsToUpsert.push({
          pitch_uid: String(pitchUID),
          exit_speed: normalize(pitchExitSpeed),
          angle: normalize(pitchAngle),
          direction: normalize(pitchDirection),
          hit_spin_rate: normalize(pitchHitSpinRate),
          position_at110x: normalize(pitchPositionAt110X),
          position_at110y: normalize(pitchPositionAt110Y),
          position_at110z: normalize(pitchPositionAt110Z),
          distance: normalize(pitchDistance),
          last_tracked_distance: normalize(pitchLastTrackedDistance),
          bearing: normalize(pitchBearing),
          hang_time: normalize(pitchHangTime),
          contact_position_x: normalize(pitchContactPositionX),
          contact_position_y: normalize(pitchContactPositionY),
          contact_position_z: normalize(pitchContactPositionZ),
          local_date_time: pitchLocalDateTime,
          utc_date_time: pitchUTCDateTime,
          system: pitchSystem
        })
      } else if (pitchUID) {
        debug.push(`Row ${rowIndex}: Skipped Hitting Metrics for PitchUID ${pitchUID}, missing ExitSpeed (values: ${pitchExitSpeed})`)
      }
      // --- PITCH TRAJECTORY ---
      const pitchPitchTrajectoryXc0 = getField(row, 'PitchTrajectoryXc0', 'pitch_trajectory_xc0', 'pitchTrajectoryXc0');
      const pitchPitchTrajectoryXc1 = getField(row, 'PitchTrajectoryXc1', 'pitch_trajectory_xc1', 'pitchTrajectoryXc1');
      const pitchPitchTrajectoryXc2 = getField(row, 'PitchTrajectoryXc2', 'pitch_trajectory_xc2', 'pitchTrajectoryXc2');
      const pitchPitchTrajectoryYc0 = getField(row, 'PitchTrajectoryYc0', 'pitch_trajectory_yc0', 'pitchTrajectoryYc0');
      const pitchPitchTrajectoryYc1 = getField(row, 'PitchTrajectoryYc1', 'pitch_trajectory_yc1', 'pitchTrajectoryYc1');
      const pitchPitchTrajectoryYc2 = getField(row, 'PitchTrajectoryYc2', 'pitch_trajectory_yc2', 'pitchTrajectoryYc2');
      const pitchPitchTrajectoryZc0 = getField(row, 'PitchTrajectoryZc0', 'pitch_trajectory_zc0', 'pitchTrajectoryZc0');
      const pitchPitchTrajectoryZc1 = getField(row, 'PitchTrajectoryZc1', 'pitch_trajectory_zc1', 'pitchTrajectoryZc1');
      const pitchPitchTrajectoryZc2 = getField(row, 'PitchTrajectoryZc2', 'pitch_trajectory_zc2', 'pitchTrajectoryZc2');
      if (pitchUID && pitchPitchTrajectoryXc0 !== undefined && pitchPitchTrajectoryXc0 !== null && pitchPitchTrajectoryXc0 !== '') {
        pitchTrajectoryToUpsert.push({
          pitch_uid: String(pitchUID),
          pitch_trajectory_xc0: normalize(pitchPitchTrajectoryXc0),
          pitch_trajectory_xc1: normalize(pitchPitchTrajectoryXc1),
          pitch_trajectory_xc2: normalize(pitchPitchTrajectoryXc2),
          pitch_trajectory_yc0: normalize(pitchPitchTrajectoryYc0),
          pitch_trajectory_yc1: normalize(pitchPitchTrajectoryYc1),
          pitch_trajectory_yc2: normalize(pitchPitchTrajectoryYc2),
          pitch_trajectory_zc0: normalize(pitchPitchTrajectoryZc0),
          pitch_trajectory_zc1: normalize(pitchPitchTrajectoryZc1),
          pitch_trajectory_zc2: normalize(pitchPitchTrajectoryZc2)
        })
      } else if (pitchUID) {
        debug.push(`Row ${rowIndex}: Skipped Pitch Trajectory for PitchUID ${pitchUID}, missing PitchTrajectoryXc0 (values: ${pitchPitchTrajectoryXc0})`)
      }
      // --- HIT TRAJECTORY ---
      const pitchHitSpinAxis = getField(row, 'HitSpinAxis', 'hit_spin_axis', 'hitSpinAxis');
      const pitchHitTrajectoryXc0 = getField(row, 'HitTrajectoryXc0', 'hit_trajectory_xc0', 'hitTrajectoryXc0');
      const pitchHitTrajectoryXc1 = getField(row, 'HitTrajectoryXc1', 'hit_trajectory_xc1', 'hitTrajectoryXc1');
      const pitchHitTrajectoryXc2 = getField(row, 'HitTrajectoryXc2', 'hit_trajectory_xc2', 'hitTrajectoryXc2');
      const pitchHitTrajectoryXc3 = getField(row, 'HitTrajectoryXc3', 'hit_trajectory_xc3', 'hitTrajectoryXc3');
      const pitchHitTrajectoryXc4 = getField(row, 'HitTrajectoryXc4', 'hit_trajectory_xc4', 'hitTrajectoryXc4');
      const pitchHitTrajectoryXc5 = getField(row, 'HitTrajectoryXc5', 'hit_trajectory_xc5', 'hitTrajectoryXc5');
      const pitchHitTrajectoryXc6 = getField(row, 'HitTrajectoryXc6', 'hit_trajectory_xc6', 'hitTrajectoryXc6');
      const pitchHitTrajectoryXc7 = getField(row, 'HitTrajectoryXc7', 'hit_trajectory_xc7', 'hitTrajectoryXc7');
      const pitchHitTrajectoryXc8 = getField(row, 'HitTrajectoryXc8', 'hit_trajectory_xc8', 'hitTrajectoryXc8');
      const pitchHitTrajectoryYc0 = getField(row, 'HitTrajectoryYc0', 'hit_trajectory_yc0', 'hitTrajectoryYc0');
      const pitchHitTrajectoryYc1 = getField(row, 'HitTrajectoryYc1', 'hit_trajectory_yc1', 'hitTrajectoryYc1');
      const pitchHitTrajectoryYc2 = getField(row, 'HitTrajectoryYc2', 'hit_trajectory_yc2', 'hitTrajectoryYc2');
      const pitchHitTrajectoryYc3 = getField(row, 'HitTrajectoryYc3', 'hit_trajectory_yc3', 'hitTrajectoryYc3');
      const pitchHitTrajectoryYc4 = getField(row, 'HitTrajectoryYc4', 'hit_trajectory_yc4', 'hitTrajectoryYc4');
      const pitchHitTrajectoryYc5 = getField(row, 'HitTrajectoryYc5', 'hit_trajectory_yc5', 'hitTrajectoryYc5');
      const pitchHitTrajectoryYc6 = getField(row, 'HitTrajectoryYc6', 'hit_trajectory_yc6', 'hitTrajectoryYc6');
      const pitchHitTrajectoryYc7 = getField(row, 'HitTrajectoryYc7', 'hit_trajectory_yc7', 'hitTrajectoryYc7');
      const pitchHitTrajectoryYc8 = getField(row, 'HitTrajectoryYc8', 'hit_trajectory_yc8', 'hitTrajectoryYc8');
      const pitchHitTrajectoryZc0 = getField(row, 'HitTrajectoryZc0', 'hit_trajectory_zc0', 'hitTrajectoryZc0');
      const pitchHitTrajectoryZc1 = getField(row, 'HitTrajectoryZc1', 'hit_trajectory_zc1', 'hitTrajectoryZc1');
      const pitchHitTrajectoryZc2 = getField(row, 'HitTrajectoryZc2', 'hit_trajectory_zc2', 'hitTrajectoryZc2');
      const pitchHitTrajectoryZc3 = getField(row, 'HitTrajectoryZc3', 'hit_trajectory_zc3', 'hitTrajectoryZc3');
      const pitchHitTrajectoryZc4 = getField(row, 'HitTrajectoryZc4', 'hit_trajectory_zc4', 'hitTrajectoryZc4');
      const pitchHitTrajectoryZc5 = getField(row, 'HitTrajectoryZc5', 'hit_trajectory_zc5', 'hitTrajectoryZc5');
      const pitchHitTrajectoryZc6 = getField(row, 'HitTrajectoryZc6', 'hit_trajectory_zc6', 'hitTrajectoryZc6');
      const pitchHitTrajectoryZc7 = getField(row, 'HitTrajectoryZc7', 'hit_trajectory_zc7', 'hitTrajectoryZc7');
      const pitchHitTrajectoryZc8 = getField(row, 'HitTrajectoryZc8', 'hit_trajectory_zc8', 'hitTrajectoryZc8');
      
      if (pitchUID && pitchHitTrajectoryXc0 !== undefined && pitchHitTrajectoryXc0 !== null && pitchHitTrajectoryXc0 !== '') {
        hitTrajectoryToUpsert.push({
          pitch_uid: String(pitchUID),
          hit_spin_axis: normalize(pitchHitSpinAxis),
          hit_trajectory_xc0: normalize(pitchHitTrajectoryXc0),
          hit_trajectory_xc1: normalize(pitchHitTrajectoryXc1),
          hit_trajectory_xc2: normalize(pitchHitTrajectoryXc2),
          hit_trajectory_xc3: normalize(pitchHitTrajectoryXc3),
          hit_trajectory_xc4: normalize(pitchHitTrajectoryXc4),
          hit_trajectory_xc5: normalize(pitchHitTrajectoryXc5),
          hit_trajectory_xc6: normalize(pitchHitTrajectoryXc6),
          hit_trajectory_xc7: normalize(pitchHitTrajectoryXc7),
          hit_trajectory_xc8: normalize(pitchHitTrajectoryXc8),
          hit_trajectory_yc0: normalize(pitchHitTrajectoryYc0),
          hit_trajectory_yc1: normalize(pitchHitTrajectoryYc1),
          hit_trajectory_yc2: normalize(pitchHitTrajectoryYc2),
          hit_trajectory_yc3: normalize(pitchHitTrajectoryYc3),
          hit_trajectory_yc4: normalize(pitchHitTrajectoryYc4),
          hit_trajectory_yc5: normalize(pitchHitTrajectoryYc5),
          hit_trajectory_yc6: normalize(pitchHitTrajectoryYc6),
          hit_trajectory_yc7: normalize(pitchHitTrajectoryYc7),
          hit_trajectory_yc8: normalize(pitchHitTrajectoryYc8),
          hit_trajectory_zc0: normalize(pitchHitTrajectoryZc0),
          hit_trajectory_zc1: normalize(pitchHitTrajectoryZc1),
          hit_trajectory_zc2: normalize(pitchHitTrajectoryZc2),
          hit_trajectory_zc3: normalize(pitchHitTrajectoryZc3),
          hit_trajectory_zc4: normalize(pitchHitTrajectoryZc4),
          hit_trajectory_zc5: normalize(pitchHitTrajectoryZc5),
          hit_trajectory_zc6: normalize(pitchHitTrajectoryZc6),
          hit_trajectory_zc7: normalize(pitchHitTrajectoryZc7),
          hit_trajectory_zc8: normalize(pitchHitTrajectoryZc8)
        })
      } else if (pitchUID) {
        debug.push(`Row ${rowIndex}: Skipped Hit Trajectory for PitchUID ${pitchUID}, missing HitTrajectoryXc0 (values: ${pitchHitTrajectoryXc0})`)
      }
    }
    // --- IMPORTANT: The following upsert order is required to avoid foreign key errors ---
    // 1. teams -> 2. players -> 3. games -> 4. pitches -> 5. metrics/trajectories
    // --- Perform batch upserts ---

    // Teams
    debug.push(`Batch upserting teams: ${teamsToUpsert.size}`)
    let teamsArray = Array.from(teamsToUpsert).map(item => JSON.parse(item));
    teamsArray = deduplicateBatch(teamsArray, 'team_id');
    let upsertedTeamIds = new Set<string>();
    if (teamsArray.length > 0) {
      const { error } = await supabase.from('teams').upsert(teamsArray, { onConflict: 'team_id', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Teams: ${error.message}`)
      }
      upsertedTeamIds = new Set(teamsArray.map(t => t.team_id));
    }
    imported.teams = teamsArray.length
    debug.push(`Teams imported: ${imported.teams}`)

    // Players (filter by upserted teams)
    debug.push(`Batch upserting players: ${playersToUpsert.size}`)
    let filteredPlayersArray: any[] = [];
    for (const item of playersToUpsert) {
      const player = JSON.parse(item);
      if (player.team_id && upsertedTeamIds.has(player.team_id)) {
        filteredPlayersArray.push(player);
      } else {
        debug.push(`Skipped player ${player.player_id}: missing or invalid team_id ${player.team_id}`);
      }
    }
    filteredPlayersArray = deduplicateBatch(filteredPlayersArray, 'player_id');
    let upsertedPlayerIds = new Set<string>();
    if (filteredPlayersArray.length > 0) {
      const { error } = await supabase.from('players').upsert(filteredPlayersArray, { onConflict: 'player_id', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Players: ${error.message}`)
      }
      upsertedPlayerIds = new Set(filteredPlayersArray.map(p => p.player_id));
    }
    imported.players = filteredPlayersArray.length
    debug.push(`Players imported: ${imported.players}`)

    // Games (filter by upserted teams)
    debug.push(`Batch upserting games: ${gamesToUpsert.size}`)
    let filteredGamesArray: any[] = [];
    for (const item of gamesToUpsert) {
      const game = JSON.parse(item);
      if (
        (!game.home_team_foreign_id || upsertedTeamIds.has(game.home_team_foreign_id)) &&
        (!game.away_team_foreign_id || upsertedTeamIds.has(game.away_team_foreign_id))
      ) {
        filteredGamesArray.push(game);
      } else {
        debug.push(`Skipped game ${game.game_id}: missing or invalid team foreign keys (home: ${game.home_team_foreign_id}, away: ${game.away_team_foreign_id})`);
      }
    }
    // Use composite key for deduplication based on the unique constraint
    // Create a composite key for deduplication
    const gamesWithCompositeKey = filteredGamesArray.map(game => ({
      ...game,
      compositeKey: `${game.user_id}-${game.game_id}-${game.game_uid}`
    }));
    const deduplicatedGames = deduplicateBatch(gamesWithCompositeKey, 'compositeKey');
    filteredGamesArray = deduplicatedGames.map(({ compositeKey, ...game }) => game);
    let upsertedGameIds = new Set<string>();
    if (filteredGamesArray.length > 0) {
      const { error } = await supabase.from('games').upsert(filteredGamesArray, { 
        onConflict: 'user_id,game_id,game_uid', 
        ignoreDuplicates: true 
      })
      if (error) {
        debug.push(`Error batch upserting Games: ${error.message}`)
      }
      upsertedGameIds = new Set(filteredGamesArray.map(g => g.game_id));
    }
    imported.games = filteredGamesArray.length
    debug.push(`Games imported: ${imported.games}`)

    // Pitches (filter by upserted games and players)
    debug.push(`Batch upserting pitches: ${pitchesToUpsert.length}`)
    let filteredPitchesArray: any[] = [];
    for (const pitch of pitchesToUpsert) {
      if (
        upsertedGameIds.has(pitch.game_id) &&
        upsertedPlayerIds.has(pitch.pitcher_id) &&
        upsertedPlayerIds.has(pitch.batter_id)
      ) {
        filteredPitchesArray.push(pitch);
      } else {
        debug.push(`Skipped pitch ${pitch.pitch_uid}: missing or invalid game_id/pitcher_id/batter_id (game: ${pitch.game_id}, pitcher: ${pitch.pitcher_id}, batter: ${pitch.batter_id})`);
      }
    }
    filteredPitchesArray = deduplicateBatch(filteredPitchesArray, 'pitch_uid');
    let upsertedPitchUids = new Set<string>();
    if (filteredPitchesArray.length > 0) {
      const { error } = await supabase.from('pitches').upsert(filteredPitchesArray, { onConflict: 'pitch_uid', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Pitches: ${error.message}`)
      }
      upsertedPitchUids = new Set(filteredPitchesArray.map(p => p.pitch_uid));
    }
    imported.pitches = filteredPitchesArray.length
    debug.push(`Pitches imported: ${imported.pitches}`)

    // Pitching Metrics (filter by upserted pitches)
    debug.push(`Batch upserting pitching metrics: ${pitchingMetricsToUpsert.length}`)
    let filteredPitchingMetrics: any[] = [];
    for (const metric of pitchingMetricsToUpsert) {
      if (upsertedPitchUids.has(metric.pitch_uid)) {
        filteredPitchingMetrics.push(metric);
      } else {
        debug.push(`Skipped pitching metric for pitch_uid ${metric.pitch_uid}: missing pitch`);
      }
    }
    filteredPitchingMetrics = deduplicateBatch(filteredPitchingMetrics, 'pitch_uid');
    if (filteredPitchingMetrics.length > 0) {
      const { error } = await supabase.from('pitching_metrics').upsert(filteredPitchingMetrics, { onConflict: 'pitch_uid', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Pitching Metrics: ${error.message}`)
      }
    }
    imported.pitching_metrics = filteredPitchingMetrics.length
    debug.push(`Pitching metrics imported: ${imported.pitching_metrics}`)

    // Hitting Metrics (filter by upserted pitches)
    debug.push(`Batch upserting hitting metrics: ${hittingMetricsToUpsert.length}`)
    let filteredHittingMetrics: any[] = [];
    for (const metric of hittingMetricsToUpsert) {
      if (upsertedPitchUids.has(metric.pitch_uid)) {
        filteredHittingMetrics.push(metric);
      } else {
        debug.push(`Skipped hitting metric for pitch_uid ${metric.pitch_uid}: missing pitch`);
      }
    }
    filteredHittingMetrics = deduplicateBatch(filteredHittingMetrics, 'pitch_uid');
    if (filteredHittingMetrics.length > 0) {
      const { error } = await supabase.from('hitting_metrics').upsert(filteredHittingMetrics, { onConflict: 'pitch_uid', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Hitting Metrics: ${error.message}`)
      }
    }
    imported.hitting_metrics = filteredHittingMetrics.length
    debug.push(`Hitting metrics imported: ${imported.hitting_metrics}`)

    // Pitch Trajectory (filter by upserted pitches)
    debug.push(`Batch upserting pitch trajectory: ${pitchTrajectoryToUpsert.length}`)
    let filteredPitchTrajectory: any[] = [];
    for (const traj of pitchTrajectoryToUpsert) {
      if (upsertedPitchUids.has(traj.pitch_uid)) {
        filteredPitchTrajectory.push(traj);
      } else {
        debug.push(`Skipped pitch trajectory for pitch_uid ${traj.pitch_uid}: missing pitch`);
      }
    }
    filteredPitchTrajectory = deduplicateBatch(filteredPitchTrajectory, 'pitch_uid');
    if (filteredPitchTrajectory.length > 0) {
      const { error } = await supabase.from('pitch_trajectory').upsert(filteredPitchTrajectory, { onConflict: 'pitch_uid', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Pitch Trajectory: ${error.message}`)
      }
    }
    imported.pitch_trajectory = filteredPitchTrajectory.length
    debug.push(`Pitch trajectory imported: ${imported.pitch_trajectory}`)

    // Hit Trajectory (filter by upserted pitches)
    debug.push(`Batch upserting hit trajectory: ${hitTrajectoryToUpsert.length}`)
    let filteredHitTrajectory: any[] = [];
    for (const traj of hitTrajectoryToUpsert) {
      if (upsertedPitchUids.has(traj.pitch_uid)) {
        filteredHitTrajectory.push(traj);
      } else {
        debug.push(`Skipped hit trajectory for pitch_uid ${traj.pitch_uid}: missing pitch`);
      }
    }
    filteredHitTrajectory = deduplicateBatch(filteredHitTrajectory, 'pitch_uid');
    if (filteredHitTrajectory.length > 0) {
      const { error } = await supabase.from('hit_trajectory').upsert(filteredHitTrajectory, { onConflict: 'pitch_uid', ignoreDuplicates: true })
      if (error) {
        debug.push(`Error batch upserting Hit Trajectory: ${error.message}`)
      }
    }
    imported.hit_trajectory = filteredHitTrajectory.length
    debug.push(`Hit trajectory imported: ${imported.hit_trajectory}`)
    res.status(200).json({ success: true, imported, debug })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, debug: [(err as Error).message] })
  }
} 