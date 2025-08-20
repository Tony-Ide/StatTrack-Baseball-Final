"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { displayInningsPitched, parseGameDate } from "@/lib/utils"

interface StatsTableProps {
  player: any
  games: any[]
  playerType: 'pitcher' | 'hitter'
  filters: {
    season: string
    month: string
    batterSide: string
    pitchType: string
    outs: string
    balls: string
    strikes: string
  }
  className?: string
}

interface CalculatedStats {
  // Standard Stats
  games: number
  plateAppearances: number
  inningsPitched?: number // Only for pitchers
  hits: number
  singles: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  hitByPitch: number
  strikeouts: number
  
  // Advanced Stats
  kPercent: string
  bbPercent: string
  kbbPercent: string
  battingAverage: string
  onBasePercentage?: string // Only for hitters
  sluggingPercentage?: string // Only for hitters
  onBasePlusSlugging?: string // Only for hitters
  whip?: string // Only for pitchers
  babip: string
  
  // Batted Ball Stats
  gbFbRatio: string
  ldPercent: string
  gbPercent: string
  fbPercent: string
  hrPerFb: string
  pullPercent: string
  centPercent: string
  oppoPercent: string
  
  // Plate Discipline Stats
  strikePercent: string
  ballPercent: string
  chasePercent: string
  zSwingPercent: string
  swingPercent: string
  oContactPercent: string
  zContactPercent: string
  contactPercent: string
  zonePercent: string
  whiffPercent: string
}

export default function StatsTable({ player, games, playerType, filters, className = "" }: StatsTableProps) {
  
  const calculatedStats = useMemo((): CalculatedStats => {
    // Helper to get all pitches from the hierarchical seasons structure
    const getAllPitches = (): any[] => {
      const allPitches: any[] = [];
      games.forEach((season: any) => {
        season.games?.forEach((game: any) => {
          game.innings?.forEach((inning: any) => {
            inning.plate_appearances?.forEach((pa: any) => {
              pa.pitches?.forEach((pitch: any) => {
                allPitches.push(pitch);
              });
            });
          });
        });
      });
      return allPitches;
    };

    const allPitches = getAllPitches();
    
    // Filter pitches based on selected filters
    const filteredPitches = allPitches.filter(pitch => {
      // Filter by player (pitcher_id for pitchers, batter_id for hitters)
      const playerIdField = playerType === 'pitcher' ? 'pitcher_id' : 'batter_id';
      if (pitch[playerIdField] !== player?.player_id) return false;
      
      // Filter by season
      if (filters.season !== "all") {
        const pitchSeason = games.find((season: any) => 
          season.games?.some((game: any) => game.game_id === pitch.game_id)
        )?.season;
        if (pitchSeason !== filters.season) return false;
      }
      
      // Filter by month
      if (filters.month !== "all") {
        const pitchDate = parseGameDate(pitch.date);
        if (pitchDate.getMonth() + 1 !== parseInt(filters.month)) return false;
      }
      
      // Filter by batter/pitcher side
      if (filters.batterSide !== "all") {
        if (playerType === 'pitcher') {
          // For pitchers, filter by batter side
          if (pitch.batter?.side !== filters.batterSide) return false;
        } else {
          // For hitters, filter by pitcher side (throws)
          if (pitch.pitcher?.throws !== filters.batterSide) return false;
        }
      }
      
      // Filter by pitch type
      if (filters.pitchType !== "all" && pitch.auto_pitch_type !== filters.pitchType) return false;
      
      // Filter by outs
      if (filters.outs !== "all" && pitch.outs !== parseInt(filters.outs)) return false;
      
      // Filter by balls
      if (filters.balls !== "all" && pitch.balls !== parseInt(filters.balls)) return false;
      
      // Filter by strikes
      if (filters.strikes !== "all" && pitch.strikes !== parseInt(filters.strikes)) return false;
      
      return true;
    });

    // Get final pitches of each PA for PA-level stats
    const finalPitches = new Map();
    games.forEach((season: any) => {
      season.games?.forEach((game: any) => {
        game.innings?.forEach((inning: any) => {
          inning.plate_appearances?.forEach((pa: any) => {
            const playerIdField = playerType === 'pitcher' ? 'pitcher_id' : 'batter_id';
            const paPitches = pa.pitches?.filter((pitch: any) => pitch[playerIdField] === player?.player_id) || [];
            if (paPitches.length > 0) {
              const finalPitch = paPitches[paPitches.length - 1]; // Last pitch of PA
              const paKey = `${game.game_id}-${inning.inning}-${inning.top_bottom}-${pa.pa_of_inning}`;
              finalPitches.set(paKey, finalPitch);
            }
          });
        });
      });
    });

    // Apply filters to final pitches
    const filteredFinalPitches = Array.from(finalPitches.values()).filter(pitch => {
      // Filter by month
      if (filters.month !== "all") {
        const pitchDate = parseGameDate(pitch.date);
        if (pitchDate.getMonth() + 1 !== parseInt(filters.month)) return false;
      }
      
      // Filter by batter/pitcher side
      if (filters.batterSide !== "all") {
        if (playerType === 'pitcher') {
          // For pitchers, filter by batter side
          if (pitch.batter?.side !== filters.batterSide) return false;
        } else {
          // For hitters, filter by pitcher side (throws)
          if (pitch.pitcher?.throws !== filters.batterSide) return false;
        }
      }
      
      // Filter by pitch type
      if (filters.pitchType !== "all" && pitch.auto_pitch_type !== filters.pitchType) return false;
      
      // Filter by outs
      if (filters.outs !== "all" && pitch.outs !== parseInt(filters.outs)) return false;
      
      // Filter by balls
      if (filters.balls !== "all" && pitch.balls !== parseInt(filters.balls)) return false;
      
      // Filter by strikes
      if (filters.strikes !== "all" && pitch.strikes !== parseInt(filters.strikes)) return false;
      
      return true;
    });

    // Calculate plate appearances
    const filteredPlateAppearances = new Set();
    filteredFinalPitches.forEach(pitch => {
      const paKey = `${pitch.game_id}-${pitch.inning}-${pitch.top_bottom}-${pitch.pa_of_inning}`;
      filteredPlateAppearances.add(paKey);
    });
    const totalPA = filteredPlateAppearances.size;

    // Calculate innings pitched (only for pitchers)
    let inningsPitched: number | undefined;
    if (playerType === 'pitcher') {
      let totalOuts = 0;
      
      // Filter final pitches to only include those that resulted in outs
      const finalPitchesWithOuts = filteredFinalPitches.filter(pitch => {
        return pitch.kor_bb === 'Strikeout' || 
               pitch.pitch_call === 'InPlay' || 
               pitch.play_result === 'Sacrifice' ||
               pitch.play_result === 'Sacrifice Fly' ||
               pitch.pitch_call === 'StrikeCalled' ||
               pitch.pitch_call === 'FoulBallNotFieldable' ||
               pitch.pitch_call === 'FoulBallFieldable';
      });
      
      // Check if any filter is active that requires inning-based tracking
      const hasFilter = filters.batterSide !== "all" || 
                       filters.pitchType !== "all" || 
                       filters.outs !== "all" || 
                       filters.balls !== "all" || 
                       filters.strikes !== "all";
      
      if (hasFilter) {
        // When any filter is active, track by plate appearance
        const plateAppearances = new Map();
        
        finalPitchesWithOuts.forEach((pitch: any) => {
          const paKey = filters.batterSide !== "all" 
            ? `${pitch.game_id}_${pitch.inning}_${pitch.top_bottom}_${pitch.pa_of_inning}_${pitch.batter?.side}`
            : `${pitch.game_id}_${pitch.inning}_${pitch.top_bottom}_${pitch.pa_of_inning}`;
          
          if (!plateAppearances.has(paKey)) {
            plateAppearances.set(paKey, { 
              maxOuts: pitch.outs || 0, 
              minOuts: pitch.outs || 0, 
              lastPitch: pitch
            });
          } else {
            const pa = plateAppearances.get(paKey);
            pa.maxOuts = Math.max(pa.maxOuts, pitch.outs || 0);
            pa.minOuts = Math.min(pa.minOuts, pitch.outs || 0);
            pa.lastPitch = pitch;
          }
        });
        
        // Calculate outs for each plate appearance
        plateAppearances.forEach((pa: any) => {
          let paOuts = pa.maxOuts - pa.minOuts;
          
          // If last pitch is a strikeout, add +1
          if (pa.lastPitch.kor_bb === 'Strikeout') {
            paOuts += 1;
          }
          
          // Add outs_on_play from the last pitch
          paOuts += (pa.lastPitch.outs_on_play || 0);
          
          totalOuts += paOuts;
        });
      } else {
        // For no filters, group by inning
        const innings = new Map();
        
        finalPitchesWithOuts.forEach((pitch: any) => {
          const inningKey = `${pitch.game_id}_${pitch.inning}_${pitch.top_bottom}`;
          if (!innings.has(inningKey)) {
            innings.set(inningKey, { maxOuts: pitch.outs || 0, minOuts: pitch.outs || 0, lastPitch: pitch });
          } else {
            const inning = innings.get(inningKey);
            inning.maxOuts = Math.max(inning.maxOuts, pitch.outs || 0);
            inning.minOuts = Math.min(inning.minOuts, pitch.outs || 0);
            inning.lastPitch = pitch;
          }
        });
        
        // Calculate outs for each inning
        innings.forEach((inning: any) => {
          let inningOuts = inning.maxOuts - inning.minOuts;
          
          // If last pitch is a strikeout, add +1
          if (inning.lastPitch.kor_bb === 'Strikeout') {
            inningOuts += 1;
          }
          
          // Add outs_on_play from the last pitch
          inningOuts += (inning.lastPitch.outs_on_play || 0);
          
          totalOuts += inningOuts;
        });
      }
      
      inningsPitched = totalOuts / 3;
    }

    // Calculate PA-level stats using final pitches
    const hits = filteredFinalPitches.filter(pitch => 
      ['Single', 'Double', 'Triple', 'HomeRun'].includes(pitch.play_result)
    ).length;

    const homeRuns = filteredFinalPitches.filter(pitch => pitch.play_result === 'HomeRun').length;
    const walks = filteredFinalPitches.filter(pitch => pitch.kor_bb === 'Walk').length;
    const hitByPitch = filteredFinalPitches.filter(pitch => pitch.pitch_call === 'HitByPitch').length;
    const strikeouts = filteredFinalPitches.filter(pitch => pitch.kor_bb === 'Strikeout').length;

    // Calculate advanced stats
    const kPercent = totalPA > 0 ? (strikeouts / totalPA * 100).toFixed(1) : '0.0';
    const bbPercent = totalPA > 0 ? (walks / totalPA * 100).toFixed(1) : '0.0';
    const kbbPercent = totalPA > 0 ? ((strikeouts - walks) / totalPA * 100).toFixed(1) : '0.0';
    
    const sacrifices = filteredFinalPitches.filter(pitch => 
      pitch.play_result === 'Sacrifice' || pitch.play_result === 'Sacrifice Fly'
    ).length;
    
    const atBats = filteredFinalPitches.length - walks - hitByPitch - sacrifices;
    const battingAverage = atBats > 0 ? (hits / atBats).toFixed(3) : '0.000';
    
    // Calculate OBP (only for hitters)
    const onBasePercentage = totalPA > 0 ? ((hits + walks + hitByPitch) / totalPA).toFixed(3) : '0.000';
    
    // Calculate SLG (only for hitters)
    const singles = filteredFinalPitches.filter(pitch => pitch.play_result === 'Single').length;
    const doubles = filteredFinalPitches.filter(pitch => pitch.play_result === 'Double').length;
    const triples = filteredFinalPitches.filter(pitch => pitch.play_result === 'Triple').length;
    const sluggingPercentage = atBats > 0 ? ((singles + 2 * doubles + 3 * triples + 4 * homeRuns) / atBats).toFixed(3) : '0.000';
    
    // Calculate OPS (only for hitters)
    const onBasePlusSlugging = (parseFloat(onBasePercentage) + parseFloat(sluggingPercentage)).toFixed(3);
    
    // Calculate WHIP (only for pitchers)
    let whip: string | undefined;
    if (playerType === 'pitcher' && inningsPitched !== undefined) {
      whip = inningsPitched > 0 ? ((hits + walks) / inningsPitched).toFixed(2) : '0.00';
    }
    
    const babipHits = hits - homeRuns;
    const babipDenominator = filteredFinalPitches.length - strikeouts - homeRuns - walks - hitByPitch;
    const babip = babipDenominator > 0 ? (babipHits / babipDenominator).toFixed(3) : '0.000';

    // Calculate batted ball stats
    const groundBalls = filteredPitches.filter(pitch => 
      pitch.tagged_hit_type === 'GroundBall' && pitch.pitch_call === 'InPlay'
    ).length;
    const flyBalls = filteredPitches.filter(pitch => 
      pitch.tagged_hit_type === 'FlyBall' && pitch.pitch_call === 'InPlay'
    ).length;
    const lineDrives = filteredPitches.filter(pitch => 
      pitch.tagged_hit_type === 'LineDrive' && pitch.pitch_call === 'InPlay'
    ).length;
    
    const totalBattedBalls = groundBalls + flyBalls + lineDrives;
    const gbPercent = totalBattedBalls > 0 ? (groundBalls / totalBattedBalls * 100).toFixed(1) : '0.0';
    const fbPercent = totalBattedBalls > 0 ? (flyBalls / totalBattedBalls * 100).toFixed(1) : '0.0';
    const ldPercent = totalBattedBalls > 0 ? (lineDrives / totalBattedBalls * 100).toFixed(1) : '0.0';
    const hrPerFb = flyBalls > 0 ? (homeRuns / flyBalls).toFixed(3) : '0.000';
    const gbFbRatio = flyBalls > 0 ? (groundBalls / flyBalls).toFixed(2) : '0.00';
    
    // Calculate Pull%, Cent%, Oppo%
    const inPlayPitches = filteredPitches.filter(pitch => pitch.pitch_call === 'InPlay');
    let pullCount = 0;
    let centCount = 0;
    let oppoCount = 0;
    
    inPlayPitches.forEach(pitch => {
      const bearing = pitch.hitting_metrics?.bearing;
      const batterSide = pitch.batter?.side;
      
      if (bearing != null && batterSide) {
        if (batterSide === 'Right') {
          if (bearing >= -45 && bearing <= -15) {
            pullCount++;
          } else if (bearing >= -15 && bearing <= 15) {
            centCount++;
          } else if (bearing >= 15 && bearing <= 45) {
            oppoCount++;
          }
        } else if (batterSide === 'Left') {
          if (bearing >= 15 && bearing <= 45) {
            pullCount++;
          } else if (bearing >= -15 && bearing <= 15) {
            centCount++;
          } else if (bearing >= -45 && bearing <= -15) {
            oppoCount++;
          }
        }
      }
    });
    
    const totalDirectionalBalls = pullCount + centCount + oppoCount;
    const pullPercent = totalDirectionalBalls > 0 ? (pullCount / totalDirectionalBalls * 100).toFixed(1) : '0.0';
    const centPercent = totalDirectionalBalls > 0 ? (centCount / totalDirectionalBalls * 100).toFixed(1) : '0.0';
    const oppoPercent = totalDirectionalBalls > 0 ? (oppoCount / totalDirectionalBalls * 100).toFixed(1) : '0.0';

    // Calculate plate discipline stats
    const totalPitches = filteredPitches.length;
    
    const swingCalls = ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable'];
    const contactCalls = ['InPlay', 'FoulBallNotFieldable', 'FoulBallFieldable'];
    
    const isInZone = (pitch: any) => {
      const side = pitch.pitching_metrics?.plate_loc_side;
      const height = pitch.pitching_metrics?.plate_loc_height;
      
      if (side == null || height == null) return false;
      
      return side >= -0.83 && side <= 0.83 && height >= 1.5 && height <= 3.5;
    };
    
    const zonePitches = filteredPitches.filter(isInZone);
    const outsideZonePitches = filteredPitches.filter(pitch => !isInZone(pitch));
    
    const totalSwings = filteredPitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length;
    const zoneSwings = zonePitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length;
    const outsideZoneSwings = outsideZonePitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length;
    
    const totalContacts = filteredPitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length;
    const zoneContacts = zonePitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length;
    const outsideZoneContacts = outsideZonePitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length;
    
    const strikeCalls = ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable', 'StrikeCalled'];
    const ballCalls = ['BallCalled', 'HitByPitch', 'BallinDirt', 'BallIntentional'];
    
    const totalStrikes = filteredPitches.filter(pitch => strikeCalls.includes(pitch.pitch_call)).length;
    const totalBalls = filteredPitches.filter(pitch => ballCalls.includes(pitch.pitch_call)).length;
    
    const strikePercent = totalPitches > 0 ? (totalStrikes / totalPitches * 100).toFixed(1) : '0.0';
    const ballPercent = totalPitches > 0 ? (totalBalls / totalPitches * 100).toFixed(1) : '0.0';
    const chasePercent = outsideZonePitches.length > 0 ? (outsideZoneSwings / outsideZonePitches.length * 100).toFixed(1) : '0.0';
    const zSwingPercent = zonePitches.length > 0 ? (zoneSwings / zonePitches.length * 100).toFixed(1) : '0.0';
    const swingPercent = totalPitches > 0 ? (totalSwings / totalPitches * 100).toFixed(1) : '0.0';
    const oContactPercent = outsideZoneSwings > 0 ? (outsideZoneContacts / outsideZoneSwings * 100).toFixed(1) : '0.0';
    const zContactPercent = zoneSwings > 0 ? (zoneContacts / zoneSwings * 100).toFixed(1) : '0.0';
    const contactPercent = totalSwings > 0 ? (totalContacts / totalSwings * 100).toFixed(1) : '0.0';
    const zonePercent = totalPitches > 0 ? (zonePitches.length / totalPitches * 100).toFixed(1) : '0.0';
    
    const swings = filteredPitches.filter(pitch => 
      ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable'].includes(pitch.pitch_call)
    ).length;
    const whiffs = filteredPitches.filter(pitch => pitch.pitch_call === 'StrikeSwinging').length;
    const whiffPercent = swings > 0 ? (whiffs / swings * 100).toFixed(1) : '0.0';

    return {
      games: games.reduce((total: number, season: any) => total + (season.games?.length || 0), 0),
      plateAppearances: totalPA,
      inningsPitched,
      hits,
      singles,
      doubles,
      triples,
      homeRuns,
      walks,
      hitByPitch,
      strikeouts,
      kPercent,
      bbPercent,
      kbbPercent,
      battingAverage,
      onBasePercentage,
      sluggingPercentage,
      onBasePlusSlugging,
      whip,
      babip,
      gbFbRatio,
      ldPercent,
      gbPercent,
      fbPercent,
      hrPerFb,
      pullPercent,
      centPercent,
      oppoPercent,
      strikePercent,
      ballPercent,
      chasePercent,
      zSwingPercent,
      swingPercent,
      oContactPercent,
      zContactPercent,
      contactPercent,
      zonePercent,
      whiffPercent
    };
  }, [player, games, playerType, filters]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Standard Stats */}
      <Card className="bg-white border-orange-100">
        <CardHeader>
          <CardTitle className="text-gray-900">Standard Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">G</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">PA</th>
                  {playerType === 'pitcher' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">IP</th>
                  )}
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">H</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">1B</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">2B</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">3B</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">HR</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">BB</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">HBP</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">SO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.games}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.plateAppearances}</td>
                  {playerType === 'pitcher' && calculatedStats.inningsPitched !== undefined && (
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">
                      {displayInningsPitched(calculatedStats.inningsPitched)}
                    </td>
                  )}
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.hits}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.singles}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.doubles}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.triples}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.homeRuns}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.walks}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.hitByPitch}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.strikeouts}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Stats */}
      <Card className="bg-white border-orange-100">
        <CardHeader>
          <CardTitle className="text-gray-900">Advanced Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">K%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">BB%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">K-BB%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">BA</th>
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">OBP</th>
                  )}
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">SLG</th>
                  )}
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">OPS</th>
                  )}
                  {playerType === 'pitcher' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">WHIP</th>
                  )}
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">BABIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.kPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.bbPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.kbbPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.battingAverage}</td>
                  {playerType === 'hitter' && calculatedStats.onBasePercentage && (
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.onBasePercentage}</td>
                  )}
                  {playerType === 'hitter' && calculatedStats.sluggingPercentage && (
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.sluggingPercentage}</td>
                  )}
                  {playerType === 'hitter' && calculatedStats.onBasePlusSlugging && (
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.onBasePlusSlugging}</td>
                  )}
                  {playerType === 'pitcher' && calculatedStats.whip && (
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.whip}</td>
                  )}
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.babip}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Batted Ball Stats */}
      <Card className="bg-white border-orange-100">
        <CardHeader>
          <CardTitle className="text-gray-900">Batted Ball Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">GB/FB</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">LD%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">GB%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">FB%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">HR/FB</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Pull%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Cent%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Oppo%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.gbFbRatio}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.ldPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.gbPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.fbPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.hrPerFb}</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.pullPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.centPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.oppoPercent}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plate Discipline Stats */}
      <Card className="bg-white border-orange-100">
        <CardHeader>
          <CardTitle className="text-gray-900">Plate Discipline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Strike%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Ball%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Chase%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Z-Swing%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Swing%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">O-Contact%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Z-Contact%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Contact%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Zone%</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">Whiff%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.strikePercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.ballPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.chasePercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.zSwingPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.swingPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.oContactPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.zContactPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.contactPercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.zonePercent}%</td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">{calculatedStats.whiffPercent}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
