"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { standardizeGameDate, parseGameDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, RotateCcw, Move, Zap, Target, ArrowDown, Calendar, Gamepad2 } from "lucide-react"
import { CIcon } from '@coreui/icons-react'
import { cilBaseball, cilGraph } from '@coreui/icons'

interface TrendsViewProps {
  games?: any[] // This is now seasons array
}

export default function TrendsView({ games = [] }: TrendsViewProps) {
  const [trendType, setTrendType] = useState<"games" | "season" | "cumulative">("games")
  const [selectedMetric, setSelectedMetric] = useState("rel_speed")
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedGame, setSelectedGame] = useState("all")
  const [pitchCallFilter, setPitchCallFilter] = useState("all")
  const [outsFilter, setOutsFilter] = useState("all")
  const [ballsFilter, setBallsFilter] = useState("all")
  const [strikesFilter, setStrikesFilter] = useState("all")
  const [filterByPitchType, setFilterByPitchType] = useState(false)
  
  // Initialize with first game selected by default
  useEffect(() => {
    if (games.length > 0) {
      const firstGame = games[0]?.games?.[0]
      if (firstGame) {
        setSelectedGame(firstGame.game_id)
      }
    }
  }, [games])

  // Extract unique values for filters
  const uniqueSeasons = useMemo(() => {
    const seasons = new Set<string>()
    games.forEach((season: any) => {
      if (season.season) {
        seasons.add(season.season)
      }
    })
    return Array.from(seasons).sort()
  }, [games])

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>()
    games.forEach((season: any) => {
      // If season is selected, only include months from that season
      if (selectedSeason !== "all" && season.season !== selectedSeason) return
      
      season.games?.forEach((game: any) => {
      if (game.date) {
        const month = parseGameDate(game.date).getMonth() + 1
        months.add(month.toString().padStart(2, '0'))
      }
      })
    })
    return Array.from(months).sort()
  }, [games, selectedSeason])

  const filteredGames = useMemo(() => {
    const allGames: any[] = []
    games.forEach((season: any) => {
      if (selectedSeason !== "all" && season.season !== selectedSeason) return
      season.games?.forEach((game: any) => {
      if (selectedMonth !== "all") {
        const gameMonth = (parseGameDate(game.date).getMonth() + 1).toString().padStart(2, '0')
          if (gameMonth !== selectedMonth) return
      }
        allGames.push(game)
      })
    })
    return allGames
  }, [games, selectedSeason, selectedMonth])

  const uniqueGames = useMemo(() => {
    return filteredGames.map(game => ({
      game_id: game.game_id,
              name: `${game.stadium || game.game_id} - ${parseGameDate(game.date).toLocaleDateString()}`
    }))
  }, [filteredGames])



  // Helper to get all pitches from the new hierarchical seasons structure
  const getAllPitches = (seasons: any[]): any[] => {
    const allPitches: any[] = [];
    seasons.forEach((season: any) => {
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

  const uniquePitchCalls = useMemo(() => {
    const calls = new Set<string>()
    const allPitches = getAllPitches(games)
    console.log('=== TRENDS VIEW DEBUG ===')
    console.log('Games (seasons):', games)
    console.log('Total pitches from getAllPitches:', allPitches.length)
    console.log('=== END DEBUG ===')
    allPitches.forEach(pitch => {
      if (pitch.pitch_call) calls.add(pitch.pitch_call)
    })
    return Array.from(calls).sort()
  }, [games])

  // Get unique pitch types for legend
  const uniquePitchTypes = useMemo(() => {
    const types = new Set<string>()
    getAllPitches(games).forEach((pitch: any) => {
      if (pitch.auto_pitch_type) types.add(pitch.auto_pitch_type)
    })
    return Array.from(types).sort()
  }, [games])

  // Pitch type colors
  const pitchTypeColors = {
    "Fastball": "#ff6b35",
    "Sinker": "#4ecdc4", 
    "Slider": "#45b7d1",
    "Curveball": "#96ceb4",
    "Changeup": "#feca57",
    "Cutter": "#ff9ff3",
    "Splitter": "#54a0ff",
    "Knuckleball": "#5f27cd",
    "Other": "#95a5a6"
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // unit source stays the same
    const unit = config?.unit || cumulativeConfig?.unit || "";

    if (trendType === "games") {
      // For games, X = sequential_no (number). Keep only entries whose point exists at this X and has a value.
      const xVal = label; // numeric pitch number
      const validEntries = payload.filter((entry: any) => {
        const hasValue = entry?.value != null && !Number.isNaN(entry.value);
        const sameX =
          entry?.payload?.sequential_no === xVal ||
          entry?.payload?.pitch_no === xVal; // fallback if needed
        return hasValue && sameX;
      });

      if (validEntries.length === 0) return null;

      const data = validEntries[0].payload;

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="mb-2">
            <span className="text-sm text-gray-600">Pitch #{data.sequential_no}:</span>
          </div>
          {validEntries.map((entry: any, i: number) => {
            const pitchType = entry.payload.pitch_type;
            const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6";
            const value = entry.value;

            return (
              <div key={i} className="flex items-center justify-between space-x-3 py-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-900">{pitchType}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{value}{unit}</span>
                  <div className="text-xs text-gray-500">
                    {entry.payload.pitch_call}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      // For season/cumulative, X = date (string). Keep only entries with non-null value.
      const validEntries = payload.filter((entry: any) => entry?.value != null && !Number.isNaN(entry.value));
      if (validEntries.length === 0) return null;

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="mb-2">
            <span className="text-sm text-gray-600">Date: {parseGameDate(label).toLocaleDateString()}</span>
          </div>
          {validEntries.map((entry: any, i: number) => {
            const pitchType = entry.dataKey;
            const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6";
            const value = entry.value;

            return (
              <div key={i} className="flex items-center justify-between space-x-3 py-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-900">{pitchType}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{value}{unit}</span>
              </div>
            );
          })}
        </div>
      );
    }
  };

  // Process data based on trend type
  const trendData: any = useMemo(() => {
    if (trendType === "games") {
      // Single game analysis - show individual pitch metrics (no averages)
      if (selectedGame === "all") return {}
      
      // Find the selected game across all seasons
      let selectedGameData: any = null
      games.forEach((season: any) => {
        season.games?.forEach((game: any) => {
          if (game.game_id === selectedGame) {
            selectedGameData = game
          }
        })
      })
      if (!selectedGameData) return {}

      const pitches = getAllPitches([{ games: [selectedGameData] }])
      const filteredPitches = pitches.filter((pitch: any) => {
        if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
        if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
        if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
        if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
        return pitch.pitching_metrics && pitch.pitching_metrics[selectedMetric] != null
      })

      // Step 1: Get all unique pitch numbers from filtered pitches, sorted in ascending order
      const allPitchNumbers = [...new Set(filteredPitches.map((pitch: any) => pitch.pitch_no || 0))]
        .sort((a: any, b: any) => a - b)

      // Step 2: Group by pitch type and assign sequential numbers
      const groupedByPitchType: { [key: string]: any[] } = {}
      const sortedPitches = filteredPitches.sort((a: any, b: any) => a.pitch_no - b.pitch_no)
      
      sortedPitches.forEach((pitch: any, index: number) => {
        const pitchType = pitch.auto_pitch_type || "Other"
        if (!groupedByPitchType[pitchType]) {
          groupedByPitchType[pitchType] = []
        }
        groupedByPitchType[pitchType].push({
          pitch_no: pitch.pitch_no || 0,
          sequential_no: index + 1, // Sequential number for this pitcher's pitches
          value: pitch.pitching_metrics[selectedMetric],
          pitch_type: pitchType,
          pitch_call: pitch.pitch_call
        })
      })

      // Step 3: Sort each group by sequential number
      Object.keys(groupedByPitchType).forEach(pitchType => {
        groupedByPitchType[pitchType].sort((a: any, b: any) => a.sequential_no - b.sequential_no)
      })

      return { 
        ...groupedByPitchType, 
        allPitchNumbers // Include the sorted pitch numbers for X-axis
      }
    } else {
      // Season trend analysis - create standardized x-axis with all dates and proper y-axis scaling
      
      // Step 1: Get all unique dates from filtered games, sorted from earliest to latest
      const allDates = filteredGames
        .map(game => parseGameDate(game.date))
        .sort((a, b) => a.getTime() - b.getTime())
        .map(date => date.toISOString().split('T')[0]) // Format as YYYY-MM-DD
      
      // Special case: pitch usage (percentage per pitch type per game)
      if (selectedMetric === "pitch_usage") {
        // Step 2a: Build data points with usage % by pitch type for each game date
        const allPitchTypes = new Set<string>()
        getAllPitches(games).forEach((pitch: any) => {
          if (pitch.auto_pitch_type) allPitchTypes.add(pitch.auto_pitch_type)
        })

        const combinedData = allDates.map(dateKey => {
          const game = filteredGames.find(g => parseGameDate(g.date).toISOString().split('T')[0] === dateKey)
          const dataPoint: any = {
            date: dateKey,
            displayDate: parseGameDate(dateKey).toLocaleDateString()
          }

          if (game) {
            const gamePitches = getAllPitches([{ games: [game] }])
            // Apply filters except metric presence
            const filtered = gamePitches.filter((pitch: any) => {
              if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
              if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
              if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
              if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
              return true
            })
            const total = filtered.length || 1 // avoid divide by zero
            const counts: Record<string, number> = {}
            filtered.forEach((p: any) => {
              const pt = p.auto_pitch_type || "Other"
              counts[pt] = (counts[pt] || 0) + 1
            })
            allPitchTypes.forEach(pt => {
              const pct = (counts[pt] ? (counts[pt] / total) * 100 : 0)
              dataPoint[pt] = Math.round(pct * 100) / 100
              dataPoint[`${pt}_count`] = counts[pt] || 0
              dataPoint[`${pt}_hasData`] = (counts[pt] || 0) > 0
            })
          } else {
            allPitchTypes.forEach(pt => {
              dataPoint[pt] = null
              dataPoint[`${pt}_count`] = 0
              dataPoint[`${pt}_hasData`] = false
            })
          }
          return dataPoint
        })

        // Compute dynamic min/max like other metrics
        const usageValues: number[] = []
        combinedData.forEach((dp: any) => {
          Array.from(allPitchTypes).forEach((pt: any) => {
            const v = dp[pt]
            if (v != null && !isNaN(v)) usageValues.push(v)
          })
        })
        const minValue = usageValues.length > 0 ? Math.min(...usageValues) : 0
        const maxValue = usageValues.length > 0 ? Math.max(...usageValues) : 100

        return {
          combinedData,
          allPitchTypes: Array.from(allPitchTypes),
          yDomain: [minValue, maxValue],
          minValue,
          maxValue,
        }
      }

      // Special case: cumulative stats
      if (trendType === "cumulative") {
        // Helper function to calculate stats for a given set of pitches (like stats-table)
        const calculateStats = (pitches: any[]) => {
          // Get final pitches of each PA for PA-level stats
          const finalPitches = new Map()
          
          // Group pitches by PA and keep the last pitch of each PA
          pitches.forEach(pitch => {
            const paKey = `${pitch.game_id}-${pitch.inning}-${pitch.top_bottom}-${pitch.pa_of_inning}`
            // Always update to keep the last pitch of the PA
            finalPitches.set(paKey, pitch)
          })

          const finalPitchesArray = Array.from(finalPitches.values())
          const totalPA = finalPitchesArray.length

          // Calculate basic stats using final pitches (PA-level)
          const hits = finalPitchesArray.filter(pitch => 
            ['Single', 'Double', 'Triple', 'HomeRun'].includes(pitch.play_result)
          ).length

          const homeRuns = finalPitchesArray.filter(pitch => pitch.play_result === 'HomeRun').length
          const walks = finalPitchesArray.filter(pitch => pitch.kor_bb === 'Walk').length
          const hitByPitch = finalPitchesArray.filter(pitch => pitch.pitch_call === 'HitByPitch').length
          const strikeouts = finalPitchesArray.filter(pitch => pitch.kor_bb === 'Strikeout').length

          const sacrifices = finalPitchesArray.filter(pitch => 
            pitch.play_result === 'Sacrifice' || pitch.play_result === 'Sacrifice Fly'
          ).length

          const atBats = finalPitchesArray.length - walks - hitByPitch - sacrifices
          const battingAverage = atBats > 0 ? (hits / atBats) : 0

          // Calculate innings pitched for WHIP (only for pitchers) - match stats-table exactly
          let inningsPitched = 0
          if (finalPitchesArray.length > 0) {
            // Filter final pitches to only include those that resulted in outs (like stats-table)
            const finalPitchesWithOuts = finalPitchesArray.filter(pitch => {
              return pitch.kor_bb === 'Strikeout' || 
                     pitch.pitch_call === 'InPlay' || 
                     pitch.play_result === 'Sacrifice' ||
                     pitch.play_result === 'Sacrifice Fly' ||
                     pitch.pitch_call === 'StrikeCalled' ||
                     pitch.pitch_call === 'FoulBallNotFieldable' ||
                     pitch.pitch_call === 'FoulBallFieldable';
            });
            
            // Check if any filter is active that requires plate appearance-based tracking
            const hasFilter = pitchCallFilter !== "all" || 
                             outsFilter !== "all" || 
                             ballsFilter !== "all" || 
                             strikesFilter !== "all" ||
                             filterByPitchType; // Pitch type filter counts as a filter
            
            let totalOuts = 0;
            
            if (hasFilter) {
              // When any filter is active, track by plate appearance (like stats-table)
              const plateAppearances = new Map();
              
              finalPitchesWithOuts.forEach((pitch: any) => {
                const paKey = `${pitch.game_id}_${pitch.inning}_${pitch.top_bottom}_${pitch.pa_of_inning}`;
                
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
              // For no filters, group by inning (like stats-table)
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

          const whip = inningsPitched > 0 ? ((hits + walks) / inningsPitched) : 0

          // Calculate BABIP correctly - match stats-table exactly
          const babipHits = hits - homeRuns
          const babipDenominator = finalPitchesArray.length - strikeouts - homeRuns - walks - hitByPitch
          const babip = babipDenominator > 0 ? (babipHits / babipDenominator) : 0

          // Calculate batted ball stats using all pitches (not just final pitches)
          const groundBalls = pitches.filter(pitch => 
            pitch.tagged_hit_type === 'GroundBall' && pitch.pitch_call === 'InPlay'
          ).length
          const flyBalls = pitches.filter(pitch => 
            pitch.tagged_hit_type === 'FlyBall' && pitch.pitch_call === 'InPlay'
          ).length
          const lineDrives = pitches.filter(pitch => 
            pitch.tagged_hit_type === 'LineDrive' && pitch.pitch_call === 'InPlay'
          ).length

          const totalBattedBalls = groundBalls + flyBalls + lineDrives
          const gbPercent = totalBattedBalls > 0 ? (groundBalls / totalBattedBalls * 100) : 0
          const fbPercent = totalBattedBalls > 0 ? (flyBalls / totalBattedBalls * 100) : 0
          const ldPercent = totalBattedBalls > 0 ? (lineDrives / totalBattedBalls * 100) : 0
          const hrPerFb = flyBalls > 0 ? (homeRuns / flyBalls) : 0
          const gbFbRatio = flyBalls > 0 ? (groundBalls / flyBalls) : 0

          // Calculate Pull%, Cent%, Oppo%
          const inPlayPitches = pitches.filter(pitch => pitch.pitch_call === 'InPlay')
          let pullCount = 0
          let centCount = 0
          let oppoCount = 0

          inPlayPitches.forEach(pitch => {
            const bearing = pitch.hitting_metrics?.bearing
            const batterSide = pitch.batter?.side

            if (bearing != null && batterSide) {
              if (batterSide === 'Right') {
                if (bearing >= -45 && bearing <= -15) {
                  pullCount++
                } else if (bearing >= -15 && bearing <= 15) {
                  centCount++
                } else if (bearing >= 15 && bearing <= 45) {
                  oppoCount++
                }
              } else if (batterSide === 'Left') {
                if (bearing >= 15 && bearing <= 45) {
                  pullCount++
                } else if (bearing >= -15 && bearing <= 15) {
                  centCount++
                } else if (bearing >= -45 && bearing <= -15) {
                  oppoCount++
                }
              }
            }
          })

          const totalDirectional = pullCount + centCount + oppoCount
          const pullPercent = totalDirectional > 0 ? (pullCount / totalDirectional * 100) : 0
          const centPercent = totalDirectional > 0 ? (centCount / totalDirectional * 100) : 0
          const oppoPercent = totalDirectional > 0 ? (oppoCount / totalDirectional * 100) : 0

          // Calculate plate discipline stats using all pitches
          const totalPitches = pitches.length
          const swingCalls = ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable']
          const contactCalls = ['InPlay', 'FoulBallNotFieldable', 'FoulBallFieldable']

          const isInZone = (pitch: any) => {
            const side = pitch.pitching_metrics?.plate_loc_side
            const height = pitch.pitching_metrics?.plate_loc_height
            if (side == null || height == null) return false
            return side >= -0.83 && side <= 0.83 && height >= 1.5 && height <= 3.5
          }

          const zonePitches = pitches.filter(isInZone)
          const outsideZonePitches = pitches.filter(pitch => !isInZone(pitch))

          const totalSwings = pitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length
          const zoneSwings = zonePitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length
          const outsideZoneSwings = outsideZonePitches.filter(pitch => swingCalls.includes(pitch.pitch_call)).length

          const totalContacts = pitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length
          const zoneContacts = zonePitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length
          const outsideZoneContacts = outsideZonePitches.filter(pitch => contactCalls.includes(pitch.pitch_call)).length

          const strikeCalls = ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable', 'StrikeCalled']
          const ballCalls = ['BallCalled', 'HitByPitch', 'BallinDirt', 'BallIntentional']

          const totalStrikes = pitches.filter(pitch => strikeCalls.includes(pitch.pitch_call)).length
          const totalBalls = pitches.filter(pitch => ballCalls.includes(pitch.pitch_call)).length

          const strikePercent = totalPitches > 0 ? (totalStrikes / totalPitches * 100) : 0
          const ballPercent = totalPitches > 0 ? (totalBalls / totalPitches * 100) : 0
          const chasePercent = outsideZonePitches.length > 0 ? (outsideZoneSwings / outsideZonePitches.length * 100) : 0
          const zSwingPercent = zonePitches.length > 0 ? (zoneSwings / zonePitches.length * 100) : 0
          const swingPercent = totalPitches > 0 ? (totalSwings / totalPitches * 100) : 0
          const oContactPercent = outsideZoneSwings > 0 ? (outsideZoneContacts / outsideZoneSwings * 100) : 0
          const zContactPercent = zoneSwings > 0 ? (zoneContacts / zoneSwings * 100) : 0
          const contactPercent = totalSwings > 0 ? (totalContacts / totalSwings * 100) : 0
          const zonePercent = totalPitches > 0 ? (zonePitches.length / totalPitches * 100) : 0

          const swings = pitches.filter(pitch => 
            ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable'].includes(pitch.pitch_call)
          ).length
          const whiffs = pitches.filter(pitch => pitch.pitch_call === 'StrikeSwinging').length
          const whiffPercent = swings > 0 ? (whiffs / swings * 100) : 0

          return {
            k_percent: totalPA > 0 ? (strikeouts / totalPA * 100) : 0,
            bb_percent: totalPA > 0 ? (walks / totalPA * 100) : 0,
            k_bb_percent: totalPA > 0 ? ((strikeouts - walks) / totalPA * 100) : 0,
            batting_average: battingAverage,
            whip: whip,
            babip: babip,
            gb_fb_ratio: gbFbRatio,
            ld_percent: ldPercent,
            gb_percent: gbPercent,
            fb_percent: fbPercent,
            hr_per_fb: hrPerFb,
            pull_percent: pullPercent,
            cent_percent: centPercent,
            oppo_percent: oppoPercent,
            strike_percent: strikePercent,
            ball_percent: ballPercent,
            chase_percent: chasePercent,
            z_swing_percent: zSwingPercent,
            swing_percent: swingPercent,
            o_contact_percent: oContactPercent,
            z_contact_percent: zContactPercent,
            contact_percent: contactPercent,
            zone_percent: zonePercent,
            whiff_percent: whiffPercent
          }
        }

        // Build cumulative data
        const combinedData = allDates.map(dateKey => {
          const dataPoint: any = {
            date: dateKey,
            displayDate: parseGameDate(dateKey).toLocaleDateString()
          }

          // Get all games up to this date
          const gamesUpToDate = filteredGames.filter(game => {
            const gameDate = parseGameDate(game.date).toISOString().split('T')[0]
            return gameDate <= dateKey
          })

          if (gamesUpToDate.length > 0) {
            // Get all pitches from games up to this date
            const allPitchesUpToDate = getAllPitches(gamesUpToDate.map(game => ({ games: [game] })))
            
            if (filterByPitchType) {
              // Calculate stats by pitch type - match stats-table logic exactly
              const allPitchTypes = new Set<string>()
              getAllPitches(games).forEach((pitch: any) => {
                if (pitch.auto_pitch_type) allPitchTypes.add(pitch.auto_pitch_type)
              })

              allPitchTypes.forEach(pitchType => {
                // First get all final pitches of each PA (like stats-table does)
                const finalPitches = new Map()
                allPitchesUpToDate.forEach(pitch => {
                  const paKey = `${pitch.game_id}-${pitch.inning}-${pitch.top_bottom}-${pitch.pa_of_inning}`
                  finalPitches.set(paKey, pitch) // Always update to keep last pitch
                })
                
                // Then apply filters to final pitches (like stats-table does)
                const filteredFinalPitches = Array.from(finalPitches.values()).filter((pitch: any) => {
                  if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
                  if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
                  if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
                  if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
                  if (pitch.auto_pitch_type !== pitchType) return false // Apply pitch type filter to final pitches
                  return true
                })
                
                // For PA-level stats, use filtered final pitches
                // For pitch-level stats, filter all pitches by pitch type and other filters
                const pitchTypePitches = allPitchesUpToDate.filter((pitch: any) => {
                  if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
                  if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
                  if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
                  if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
                  if (pitch.auto_pitch_type !== pitchType) return false
                  return true
                })
                
                // Calculate stats using the appropriate data source
                const isPAStat = ['k_percent', 'bb_percent', 'k_bb_percent', 'batting_average', 'whip', 'babip'].includes(selectedMetric)
                const stats = isPAStat ? calculateStats(filteredFinalPitches) : calculateStats(pitchTypePitches)
                
                dataPoint[pitchType] = stats[selectedMetric as keyof typeof stats] || 0
                dataPoint[`${pitchType}_hasData`] = isPAStat ? filteredFinalPitches.length > 0 : pitchTypePitches.length > 0
              })
            } else {
              // Calculate overall stats - apply filters to all pitches first
              const filteredPitches = allPitchesUpToDate.filter((pitch: any) => {
                if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
                if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
                if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
                if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
                return true
              })

              const stats = calculateStats(filteredPitches)
              dataPoint.overall = stats[selectedMetric as keyof typeof stats] || 0
              dataPoint.hasData = filteredPitches.length > 0
            }
          } else {
            if (filterByPitchType) {
              const allPitchTypes = new Set<string>()
              getAllPitches(games).forEach((pitch: any) => {
                if (pitch.auto_pitch_type) allPitchTypes.add(pitch.auto_pitch_type)
              })
              allPitchTypes.forEach(pitchType => {
                dataPoint[pitchType] = null
                dataPoint[`${pitchType}_hasData`] = false
              })
            } else {
              dataPoint.overall = null
              dataPoint.hasData = false
            }
          }

          return dataPoint
        })

        // Calculate min/max for Y-axis
        const allValues: number[] = []
        combinedData.forEach((dp: any) => {
          if (filterByPitchType) {
            Object.keys(dp).forEach(key => {
              if (key !== 'date' && key !== 'displayDate' && !key.includes('_hasData') && dp[key] != null) {
                allValues.push(dp[key])
              }
            })
          } else {
            if (dp.overall != null) {
              allValues.push(dp.overall)
            }
          }
        })

        const minValue = allValues.length > 0 ? Math.min(...allValues) : 0
        const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100

        console.log("Cumulative stats data:", {
          filterByPitchType,
          allPitchTypes: filterByPitchType ? Array.from(new Set(getAllPitches(games).map(p => p.auto_pitch_type).filter(Boolean))) : ['overall'],
          sampleDataPoint: combinedData[0],
          dataLength: combinedData.length
        });

        return {
          combinedData,
          allPitchTypes: filterByPitchType ? Array.from(new Set(getAllPitches(games).map(p => p.auto_pitch_type).filter(Boolean))) : ['overall'],
          yDomain: [minValue, maxValue],
          minValue,
          maxValue,
        }
      }

      // Step 2: Collect all metric values across all pitch types to calculate min/max (default numeric metrics)
      const allMetricValues: number[] = []
      const allPitches = getAllPitches(filteredGames)
      const filteredPitches = allPitches.filter((pitch: any) => {
          if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
          if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
          if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
          if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
          return pitch.pitching_metrics && pitch.pitching_metrics[selectedMetric] != null
        })
        filteredPitches.forEach((pitch: any) => {
          const value = pitch.pitching_metrics[selectedMetric]
          if (value != null && !isNaN(value)) {
            allMetricValues.push(value)
          }
      })
      
      // Step 3: Calculate min/max for Y-axis scaling
      const minValue = allMetricValues.length > 0 ? Math.min(...allMetricValues) : 0
      const maxValue = allMetricValues.length > 0 ? Math.max(...allMetricValues) : 100
      const valueRange = maxValue - minValue
      const padding = valueRange * 0.1 // 10% padding
      const yMin = minValue - padding
      const yMax = maxValue + padding
      
      // Step 4: Create a map of game data by date for quick lookup
      const gameDataByDate = new Map()
      filteredGames.forEach(game => {
        const dateKey = parseGameDate(game.date).toISOString().split('T')[0]
        gameDataByDate.set(dateKey, game)
      })
      
      // Step 5: Get all unique pitch types
      const allPitchTypes = new Set<string>()
      getAllPitches(games).forEach((pitch: any) => {
          if (pitch.auto_pitch_type) {
            allPitchTypes.add(pitch.auto_pitch_type)
          }
      })
      
      // Step 6: Create standardized data array with all dates and all pitch types
      const combinedData = allDates.map(dateKey => {
        const game = gameDataByDate.get(dateKey)
        const dataPoint: any = {
          date: dateKey,
          displayDate: parseGameDate(dateKey).toLocaleDateString()
        }
        
        if (game) {
          // Get pitches for this specific game using new structure
          const gamePitches = getAllPitches([{ games: [game] }])
          const filteredPitches = gamePitches.filter((pitch: any) => {
            if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false
            if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
            if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
            if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
            return pitch.pitching_metrics && pitch.pitching_metrics[selectedMetric] != null
          })

          // Group by pitch type within this game
          const gameGroupedByPitchType: { [key: string]: any[] } = {}
          filteredPitches.forEach((pitch: any) => {
            const pitchType = pitch.auto_pitch_type || "Other"
            if (!gameGroupedByPitchType[pitchType]) {
              gameGroupedByPitchType[pitchType] = []
            }
            gameGroupedByPitchType[pitchType].push(pitch.pitching_metrics[selectedMetric])
          })

          // Calculate average for each pitch type
          allPitchTypes.forEach(pitchType => {
            const values = gameGroupedByPitchType[pitchType] || []
            const average = values.length > 0 
              ? Math.round((values.reduce((sum: any, val: any) => sum + val, 0) / values.length) * 100) / 100
              : null
            
            dataPoint[pitchType] = average
            dataPoint[`${pitchType}_count`] = values.length
            dataPoint[`${pitchType}_hasData`] = values.length > 0
          })
        } else {
          // No game data for this date
          allPitchTypes.forEach(pitchType => {
            dataPoint[pitchType] = null
            dataPoint[`${pitchType}_count`] = 0
            dataPoint[`${pitchType}_hasData`] = false
          })
        }
        
        return dataPoint
      })
      
      // Return the combined data array with Y-axis domain information
      return { 
        combinedData, 
        allPitchTypes: Array.from(allPitchTypes),
        yDomain: [yMin, yMax],
        minValue,
        maxValue
      }
    }
  }, [trendType, selectedGame, selectedMetric, pitchCallFilter, outsFilter, ballsFilter, strikesFilter, games, filteredGames, filterByPitchType]) as any

  const metricConfigs = {
    rel_speed: {
      title: "Velocity",
    icon: Zap,
    color: "#ff6b35",
    unit: "mph",
    yDomain: ["dataMin - 1", "dataMax + 1"],
  },
    spin_rate: {
      title: "Spin Rate",
    icon: RotateCcw,
    color: "#4ecdc4",
    unit: "rpm",
    yDomain: ["dataMin - 50", "dataMax + 50"],
  },
    extension: {
      title: "Extension",
    icon: Move,
    color: "#45b7d1",
    unit: "ft",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
  },
    induced_vert_break: {
      title: "Induced Vertical Break",
      icon: ArrowDown,
      color: "#96ceb4",
    unit: "in",
    yDomain: ["dataMin - 1", "dataMax + 1"],
  },
    horz_break: {
      title: "Horizontal Break",
    icon: Target,
      color: "#feca57",
    unit: "in",
    yDomain: ["dataMin - 1", "dataMax + 1"],
  },
    vert_appr_angle: {
      title: "Vertical Approach Angle",
      icon: ArrowDown,
      color: "#9b59b6",
      unit: "°",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    horz_appr_angle: {
      title: "Horizontal Approach Angle",
      icon: Target,
      color: "#e67e22",
      unit: "°",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    spin_axis: {
      title: "Spin Axis",
      icon: RotateCcw,
      color: "#3498db",
      unit: "°",
      yDomain: ["dataMin - 5", "dataMax + 5"],
    },
    rel_height: {
      title: "Release Height",
      icon: Move,
      color: "#2ecc71",
      unit: "ft",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    rel_side: {
      title: "Release Side",
      icon: Target,
      color: "#e74c3c",
      unit: "ft",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    pitch_usage: {
      title: "Pitch Usage",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
    yDomain: ["dataMin - 1", "dataMax + 1"],
  },
  }

  const cumulativeMetricConfigs = {
    k_percent: {
      title: "K%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    bb_percent: {
      title: "BB%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    k_bb_percent: {
      title: "K-BB%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    batting_average: {
      title: "BA",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    whip: {
      title: "WHIP",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    babip: {
      title: "BABIP",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    gb_fb_ratio: {
      title: "GB/FB",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    ld_percent: {
      title: "LD%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    gb_percent: {
      title: "GB%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    fb_percent: {
      title: "FB%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    hr_per_fb: {
      title: "HR/FB",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    pull_percent: {
      title: "Pull%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    cent_percent: {
      title: "Cent%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    oppo_percent: {
      title: "Oppo%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    strike_percent: {
      title: "Strike%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    ball_percent: {
      title: "Ball%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    chase_percent: {
      title: "Chase%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    z_swing_percent: {
      title: "Z-Swing%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    swing_percent: {
      title: "Swing%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    o_contact_percent: {
      title: "O-Contact%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    z_contact_percent: {
      title: "Z-Contact%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    contact_percent: {
      title: "Contact%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    zone_percent: {
      title: "Zone%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
      yDomain: ["dataMin - 1", "dataMax + 1"],
    },
    whiff_percent: {
      title: "Whiff%",
      icon: TrendingUp,
      color: "#2d98da",
      unit: "%",
    yDomain: ["dataMin - 1", "dataMax + 1"],
  },
  }

  const config = metricConfigs[selectedMetric as keyof typeof metricConfigs]
  const cumulativeConfig = cumulativeMetricConfigs[selectedMetric as keyof typeof cumulativeMetricConfigs]
  const IconComponent = config?.icon || cumulativeConfig?.icon || TrendingUp

  return (
    <div className="space-y-6">
      {/* Trend Type Selection */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant={trendType === "games" ? "default" : "outline"}
          onClick={() => {
            // Reset to a valid games metric if coming from cumulative or if current metric is not valid for games
            if (trendType === "cumulative" || !metricConfigs[selectedMetric as keyof typeof metricConfigs]) {
              setSelectedMetric("rel_speed")
            }
            // If switching to games while on pitch_usage, revert to rel_speed
            if (selectedMetric === "pitch_usage") {
              setSelectedMetric("rel_speed")
            }
            setTrendType("games")
          }}
          className="flex items-center space-x-2"
        >
          <CIcon icon={cilBaseball} className="w-4 h-4" />
          <span>Games Trend</span>
        </Button>
        <Button
          variant={trendType === "season" ? "default" : "outline"}
          onClick={() => {
            // Reset to a valid season metric if coming from cumulative
            if (trendType === "cumulative") {
              setSelectedMetric("rel_speed")
            }
            setTrendType("season")
          }}
          className="flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Season Trend</span>
        </Button>
        <Button
          variant={trendType === "cumulative" ? "default" : "outline"}
          onClick={() => {
            // Reset to a valid cumulative metric if coming from other trend types
            if (trendType !== "cumulative") {
              setSelectedMetric("k_percent")
            }
            setTrendType("cumulative")
          }}
          className="flex items-center space-x-2"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Cumulative Stats</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-orange-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Season Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Season:</span>
              <Select value={selectedSeason} onValueChange={(value) => {
                setSelectedSeason(value);
                // Reset month filter when season changes
                setSelectedMonth("all");
              }}>
                <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {uniqueSeasons.map(season => (
                    <SelectItem key={season} value={season}>{season}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Month:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-24 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {uniqueMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(2024, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Game Filter (only for Games trend) */}
            {trendType === "games" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-orange-700 text-sm">Game:</span>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select a Game</SelectItem>
                    {uniqueGames.map(game => (
                      <SelectItem key={game.game_id} value={game.game_id}>{game.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Metric Selection */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">
                {trendType === "cumulative" ? "Stat:" : "Metric:"}
              </span>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trendType === "cumulative" ? (
                    <>
                      {/* Standard Stats */}
                      <SelectItem value="k_percent">K%</SelectItem>
                      <SelectItem value="bb_percent">BB%</SelectItem>
                      <SelectItem value="k_bb_percent">K-BB%</SelectItem>
                      <SelectItem value="batting_average">BA</SelectItem>
                      <SelectItem value="whip">WHIP</SelectItem>
                      <SelectItem value="babip">BABIP</SelectItem>
                      
                      {/* Batted Ball Stats */}
                      <SelectItem value="gb_fb_ratio">GB/FB</SelectItem>
                      <SelectItem value="ld_percent">LD%</SelectItem>
                      <SelectItem value="gb_percent">GB%</SelectItem>
                      <SelectItem value="fb_percent">FB%</SelectItem>
                      <SelectItem value="hr_per_fb">HR/FB</SelectItem>
                      <SelectItem value="pull_percent">Pull%</SelectItem>
                      <SelectItem value="cent_percent">Cent%</SelectItem>
                      <SelectItem value="oppo_percent">Oppo%</SelectItem>
                      
                      {/* Plate Discipline */}
                      <SelectItem value="strike_percent">Strike%</SelectItem>
                      <SelectItem value="ball_percent">Ball%</SelectItem>
                      <SelectItem value="chase_percent">Chase%</SelectItem>
                      <SelectItem value="z_swing_percent">Z-Swing%</SelectItem>
                      <SelectItem value="swing_percent">Swing%</SelectItem>
                      <SelectItem value="o_contact_percent">O-Contact%</SelectItem>
                      <SelectItem value="z_contact_percent">Z-Contact%</SelectItem>
                      <SelectItem value="contact_percent">Contact%</SelectItem>
                      <SelectItem value="zone_percent">Zone%</SelectItem>
                      <SelectItem value="whiff_percent">Whiff%</SelectItem>
                    </>
                  ) : (
                    Object.entries(metricConfigs)
                      .filter(([key]) => trendType === "season" || key !== "pitch_usage")
                      .map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.title}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Pitch Call Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Pitch Call:</span>
              <Select value={pitchCallFilter} onValueChange={setPitchCallFilter}>
                <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calls</SelectItem>
                  {uniquePitchCalls.map(call => (
                    <SelectItem key={call} value={call}>{call}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Outs Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Outs:</span>
              <Select value={outsFilter} onValueChange={setOutsFilter}>
                <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Balls Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Balls:</span>
              <Select value={ballsFilter} onValueChange={setBallsFilter}>
                <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strikes Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Strikes:</span>
              <Select value={strikesFilter} onValueChange={setStrikesFilter}>
                <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Pitch Type (only for Cumulative) */}
            {trendType === "cumulative" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filterByPitchType"
                  checked={filterByPitchType}
                  onChange={(e) => {
                    setFilterByPitchType(e.target.checked);
                    console.log("filterByPitchType changed to:", e.target.checked);
                  }}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-orange-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="filterByPitchType" className="text-sm font-semibold text-orange-700">
                  Filter by Pitch Type
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      {Object.keys(trendData).length > 0 && (
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
            {trendType !== "games" && 'allPitchTypes' in trendData 
              ? trendData.allPitchTypes.length 
              : Object.keys(trendData).length
            } pitch types
          </Badge>
          <span className="text-sm text-gray-600">
            {trendType === "games" 
              ? `Game: ${games.find(g => g.game_id === selectedGame)?.stadium || selectedGame}`
              : (trendType === "season" 
                  ? `Season: ${selectedSeason === "all" ? "All" : selectedSeason}`
                  : "Cumulative")
            }
          </span>
          {trendType !== "games" && 'minValue' in trendData && 'maxValue' in trendData && (
            <span className="text-sm text-gray-600">
              Range: {(trendData as any).minValue.toFixed(1)} - {(trendData as any).maxValue.toFixed(1)} {config?.unit || cumulativeConfig?.unit}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      {Object.keys(trendData).length > 0 ? (
        <Card className="bg-white border-orange-200">
        <CardHeader>
            <CardTitle className="text-gray-900 flex items-center">
            <IconComponent className="w-5 h-5 mr-2" style={{ color: config?.color || cumulativeConfig?.color }} />
              {trendType === "cumulative" 
                ? `${selectedMetric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} by ${filterByPitchType ? 'Pitch Type' : 'Overall'}`
                : `${config?.title || cumulativeConfig?.title} by Pitch Type`
              }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendType !== "games" && 'combinedData' in trendData ? trendData.combinedData : undefined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey={trendType === "games" ? "sequential_no" : "date"}
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                    label={{ 
                      value: trendType === "games" ? "Pitch Number" : "Date", 
                      position: "insideBottom", 
                      offset: -5, 
                      fill: "#6b7280" 
                    }}
                    type={trendType === "games" ? "number" : "category"}
                    scale={trendType !== "games" ? "point" : undefined}
                    domain={trendType === "games" && 'allPitchNumbers' in trendData ? [1, trendData.allPitchNumbers.length] : undefined}
                    allowDataOverflow={false}
                    allowDuplicatedCategory={false}
                    tickFormatter={(value) => {
                      if (trendType !== "games") {
                        const date = parseGameDate(value);
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${month}/${day}`;
                      }
                      return value
                    }}
                />
                <YAxis
                  domain={config?.yDomain || cumulativeConfig?.yDomain}
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ 
                      value: config?.unit || cumulativeConfig?.unit, 
                      angle: -90, 
                      position: "insideLeft", 
                      fill: "#6b7280" 
                    }}
                />
                <Tooltip content={<CustomTooltip />} filterNull />
                  {trendType !== "games" && 'allPitchTypes' in trendData ? (
                    // Season/cumulative trend with combined data
                    trendData.allPitchTypes.map((pitchType: string) => {
                      const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                      return (
                        <Line
                          key={pitchType}
                          type="monotone"
                          dataKey={pitchType}
                          name={pitchType}
                          stroke={color}
                          strokeWidth={3}
                          dot={{ fill: color, strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, stroke: color, strokeWidth: 2 }}
                          connectNulls={false}
                        />
                      )
                    })
                  ) : (
                    // Games trend with separate data arrays
                    Object.keys(trendData).map((pitchType) => {
                      const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                      const series = Array.isArray((trendData as any)[pitchType]) ? (trendData as any)[pitchType] : []
                      return (
                <Line
                          key={pitchType}
                  type="monotone"
                          data={series}
                          dataKey="value"
                          name={pitchType}
                          stroke={color}
                  strokeWidth={3}
                          dot={{ fill: color, strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, stroke: color, strokeWidth: 2 }}
                          connectNulls={false}
                />
                      )
                    })
                  )}
              </LineChart>
            </ResponsiveContainer>
          </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {trendType !== "games" && 'allPitchTypes' in trendData ? (
                // Season/cumulative trend legend
                trendData.allPitchTypes.map((pitchType: string) => {
                  const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                  const dataCount = trendData.combinedData.filter((item: any) => 
                    trendType === "cumulative" 
                      ? item[`${pitchType}_hasData`] 
                      : item[`${pitchType}_hasData`]
                  ).length
                  return (
                    <div key={pitchType} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {pitchType === 'overall' ? 'Overall' : pitchType} ({dataCount})
                      </span>
                    </div>
                  )
                })
              ) : (
                // Games trend legend
                Object.keys(trendData).map((pitchType) => {
                  const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                  const dataCount = Array.isArray((trendData as any)[pitchType]) ? (trendData as any)[pitchType].length : 0
                  return (
                    <div key={pitchType} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {pitchType} ({dataCount})
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-orange-200">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Data Available</p>
            <p className="text-gray-600">
              {trendType === "games" 
                ? "Please select a game and adjust filters to view pitch trends."
                : "Please select a season and adjust filters to view game averages."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats by Pitch Type */}
      {Object.keys(trendData).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Summary Statistics by Pitch Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendType !== "games" && 'allPitchTypes' in trendData ? (
              // Season/cumulative trend summary stats
              trendData.allPitchTypes.map((pitchType: string) => {
                const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                const pitchData = trendData.combinedData
                  .filter((item: any) => 
                    trendType === "cumulative" 
                      ? item[`${pitchType}_hasData`] && item[pitchType] !== null
                      : item[`${pitchType}_hasData`] && item[pitchType] !== null
                  )
                  .map((item: any) => item[pitchType])
                const max = pitchData.length ? Math.max(...pitchData) : 0
                const min = pitchData.length ? Math.min(...pitchData) : 0
                const avg = pitchData.length ? (pitchData.reduce((sum: any, val: any) => sum + val, 0) / pitchData.length) : 0
                const latest = pitchData.length ? pitchData[pitchData.length - 1] : undefined
                
                return (
                  <Card key={pitchType} className="bg-white border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: color }}
                        />
                        {trendType === "cumulative" 
                          ? `${pitchType === 'overall' ? 'Overall' : pitchType} ${selectedMetric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                          : `${pitchType}`
                        } ({pitchData.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{max.toFixed(1)}</div>
                          <div className="text-gray-500">Max</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{min.toFixed(1)}</div>
                          <div className="text-gray-500">Min</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{avg.toFixed(1)}</div>
                          <div className="text-gray-500">Avg</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{latest?.toFixed(1) || "N/A"}</div>
                          <div className="text-gray-500">Latest</div>
                        </div>
            </div>
          </CardContent>
        </Card>
                )
              })
            ) : (
              // Games trend summary stats
              Object.keys(trendData).map((pitchType) => {
                const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                const pitchData = (trendData as any)[pitchType]
                const values = Array.isArray(pitchData) ? pitchData.map((d: any) => d.value) : []
                const max = values.length ? Math.max(...values) : 0
                const min = values.length ? Math.min(...values) : 0
                const avg = values.length ? (values.reduce((sum: any, val: any) => sum + val, 0) / values.length) : 0
                const latest = values.length ? values[values.length - 1] : undefined
                
                return (
                  <Card key={pitchType} className="bg-white border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-900 flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: color }}
                        />
                        {pitchType} ({pitchData.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{max.toFixed(1)}</div>
                          <div className="text-gray-500">Max</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{min.toFixed(1)}</div>
                          <div className="text-gray-500">Min</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{avg.toFixed(1)}</div>
                          <div className="text-gray-500">Avg</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{latest?.toFixed(1) || "N/A"}</div>
                          <div className="text-gray-500">Latest</div>
                        </div>
            </div>
          </CardContent>
        </Card>
                )
              })
            )}
            </div>
      </div>
      )}
    </div>
  )
}
