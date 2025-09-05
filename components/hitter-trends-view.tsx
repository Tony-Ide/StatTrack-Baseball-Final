"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { standardizeGameDate, parseGameDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, RotateCcw, Move, Zap, Target, ArrowDown, Calendar } from "lucide-react"
import { CIcon } from '@coreui/icons-react'
import { cilBaseball, cilGraph } from '@coreui/icons'

interface HitterTrendsViewProps {
  games?: any[] // This is now seasons array
}

export default function HitterTrendsView({ games = [] }: HitterTrendsViewProps) {
  const [trendType, setTrendType] = useState<"cumulative">("cumulative")
  const [selectedStat, setSelectedStat] = useState("k_percent")
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [pitcherSideFilter, setPitcherSideFilter] = useState("all")
  const [outsFilter, setOutsFilter] = useState("all")
  const [ballsFilter, setBallsFilter] = useState("all")
  const [strikesFilter, setStrikesFilter] = useState("all")
  const [filterByPitchType, setFilterByPitchType] = useState(false)

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
  }

  // Hitter cumulative stats configuration
  const hitterCumulativeStatsConfigs = {
    // Standard Stats
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
    obp: {
      title: "OBP",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    slg: {
      title: "SLG",
      icon: TrendingUp,
      color: "#2d98da",
      unit: ".",
      yDomain: ["dataMin - 0.1", "dataMax + 0.1"],
    },
    ops: {
      title: "OPS",
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
    // Batted Ball Stats
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
    // Plate Discipline Stats
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

  // Process data based on trend type
  const trendData: any = useMemo(() => {
    // Helper function to calculate hitter stats for a given set of pitches (like stats-table)
    const calculateHitterStats = (pitches: any[]) => {
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

      const singles = finalPitchesArray.filter(pitch => pitch.play_result === 'Single').length
      const doubles = finalPitchesArray.filter(pitch => pitch.play_result === 'Double').length
      const triples = finalPitchesArray.filter(pitch => pitch.play_result === 'Triple').length
      const homeRuns = finalPitchesArray.filter(pitch => pitch.play_result === 'HomeRun').length
      const walks = finalPitchesArray.filter(pitch => pitch.kor_bb === 'Walk').length
      const hitByPitch = finalPitchesArray.filter(pitch => pitch.pitch_call === 'HitByPitch').length
      const strikeouts = finalPitchesArray.filter(pitch => pitch.kor_bb === 'Strikeout').length

      const sacrifices = finalPitchesArray.filter(pitch => 
        pitch.play_result === 'Sacrifice' || pitch.play_result === 'Sacrifice Fly'
      ).length

      const atBats = finalPitchesArray.length - walks - hitByPitch - sacrifices
      const battingAverage = atBats > 0 ? (hits / atBats) : 0

      // Calculate OBP and SLG
      const onBase = hits + walks + hitByPitch
      const obp = totalPA > 0 ? (onBase / totalPA) : 0

      const totalBases = singles + (doubles * 2) + (triples * 3) + (homeRuns * 4)
      const slg = atBats > 0 ? (totalBases / atBats) : 0
      const ops = obp + slg

      // Calculate BABIP
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
        obp: obp,
        slg: slg,
        ops: ops,
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

    // Step 1: Get all unique dates from filtered games, sorted from earliest to latest
    const allDates = filteredGames
      .map(game => parseGameDate(game.date))
      .sort((a, b) => a.getTime() - b.getTime())
      .map(date => date.toISOString().split('T')[0]) // Format as YYYY-MM-DD

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
               if (pitcherSideFilter !== "all" && pitch.pitcher?.throws !== pitcherSideFilter) return false
               if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
               if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
               if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
               if (pitch.auto_pitch_type !== pitchType) return false // Apply pitch type filter to final pitches
               return true
             })
            
                         // For PA-level stats, use filtered final pitches
             // For pitch-level stats, filter all pitches by pitch type and other filters
             const pitchTypePitches = allPitchesUpToDate.filter((pitch: any) => {
               if (pitcherSideFilter !== "all" && pitch.pitcher?.throws !== pitcherSideFilter) return false
               if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
               if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
               if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
               if (pitch.auto_pitch_type !== pitchType) return false
               return true
             })
            
            // Calculate stats using the appropriate data source
            const isPAStat = ['k_percent', 'bb_percent', 'k_bb_percent', 'batting_average', 'obp', 'slg', 'ops', 'babip'].includes(selectedStat)
            const stats = isPAStat ? calculateHitterStats(filteredFinalPitches) : calculateHitterStats(pitchTypePitches)
            
            dataPoint[pitchType] = stats[selectedStat as keyof typeof stats] || 0
            dataPoint[`${pitchType}_hasData`] = isPAStat ? filteredFinalPitches.length > 0 : pitchTypePitches.length > 0
          })
        } else {
                     // Calculate overall stats - apply filters to all pitches first
           const filteredPitches = allPitchesUpToDate.filter((pitch: any) => {
             if (pitcherSideFilter !== "all" && pitch.pitcher?.throws !== pitcherSideFilter) return false
             if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false
             if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false
             if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false
             return true
           })

          const stats = calculateHitterStats(filteredPitches)
          dataPoint.overall = stats[selectedStat as keyof typeof stats] || 0
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

    return {
      combinedData,
      allPitchTypes: filterByPitchType ? Array.from(new Set(getAllPitches(games).map(p => p.auto_pitch_type).filter(Boolean))) : ['overall'],
      yDomain: [minValue, maxValue],
      minValue,
      maxValue,
    }
     }, [selectedStat, selectedSeason, selectedMonth, pitcherSideFilter, outsFilter, ballsFilter, strikesFilter, games, filteredGames, filterByPitchType])

  const config = hitterCumulativeStatsConfigs[selectedStat as keyof typeof hitterCumulativeStatsConfigs]
  const IconComponent = config?.icon || TrendingUp

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!trendData.combinedData || trendData.combinedData.length === 0) {
      return {}
    }

    const allValues: number[] = []
    trendData.combinedData.forEach((dp: any) => {
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

    if (allValues.length === 0) {
      return {}
    }

    const max = Math.max(...allValues)
    const min = Math.min(...allValues)
    const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    const latest = trendData.combinedData[trendData.combinedData.length - 1]?.overall || 
                   trendData.combinedData[trendData.combinedData.length - 1]?.[trendData.allPitchTypes[0]] || 0

    return {
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      count: allValues.length
    }
  }, [trendData, filterByPitchType])

  // Pitch type colors for chart
  const pitchTypeColors = {
    "Fastball": "#ff6b6b",
    "Slider": "#4ecdc4",
    "Curveball": "#45b7d1",
    "Changeup": "#96ceb4",
    "Cutter": "#feca57",
    "Splitter": "#ff9ff3",
    "Sinker": "#54a0ff",
    "overall": "#2d98da",
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // unit source stays the same
    const unit = config?.unit || "";

    // For hitter trends, X = date (string). Keep only entries with non-null value.
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
                <span className="text-sm font-medium text-gray-900">{pitchType === 'overall' ? 'Overall' : pitchType}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{value}{unit}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trend Type Selection */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="default"
          className="flex items-center space-x-2"
        >
          <CIcon icon={cilGraph} className="w-4 h-4" />
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

            {/* Stat Selection */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Stat:</span>
              <Select value={selectedStat} onValueChange={setSelectedStat}>
                <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Standard Stats */}
                  <SelectItem value="k_percent">K%</SelectItem>
                  <SelectItem value="bb_percent">BB%</SelectItem>
                  <SelectItem value="k_bb_percent">K-BB%</SelectItem>
                  <SelectItem value="batting_average">BA</SelectItem>
                  <SelectItem value="obp">OBP</SelectItem>
                  <SelectItem value="slg">SLG</SelectItem>
                  <SelectItem value="ops">OPS</SelectItem>
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
                </SelectContent>
              </Select>
            </div>

                         {/* Pitcher Side Filter */}
             <div className="flex items-center gap-2">
               <span className="font-semibold text-orange-700 text-sm">Pitcher Side:</span>
               <Select value={pitcherSideFilter} onValueChange={setPitcherSideFilter}>
                 <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All</SelectItem>
                   <SelectItem value="Right">vs RHP</SelectItem>
                   <SelectItem value="Left">vs LHP</SelectItem>
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

            {/* Filter by Pitch Type */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="filterByPitchType"
                checked={filterByPitchType}
                onChange={(e) => setFilterByPitchType(e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-orange-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="filterByPitchType" className="text-sm font-semibold text-orange-700">
                Filter by Pitch Type
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="bg-white border-orange-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center">
            <IconComponent className="w-5 h-5 mr-2" style={{ color: config?.color }} />
            {config?.title} by {filterByPitchType ? 'Pitch Type' : 'Overall'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.combinedData && trendData.combinedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData.combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  allowDuplicatedCategory={false}
                />
                <YAxis 
                  domain={trendData.yDomain}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${Math.round(value * 100) / 100}${config?.unit || ''}`}
                />
                <Tooltip content={<CustomTooltip />} filterNull />
                {filterByPitchType ? (
                  trendData.allPitchTypes.map((pitchType: string) => (
                    <Line
                      key={pitchType}
                      type="monotone"
                      dataKey={pitchType}
                      stroke={pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                      name={pitchType}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke={config?.color || "#2d98da"}
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    connectNulls={false}
                    name="Overall"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-96 flex items-center justify-center">
              <div className="text-center">
                <CIcon icon={cilGraph} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900 mb-2">No Data Available</p>
                <p className="text-gray-600">
                  No data matches the current filters.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Summary Statistics by {filterByPitchType ? 'Pitch Type' : 'Overall'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterByPitchType ? (
            trendData.allPitchTypes.map((pitchType: string) => {
              const pitchTypeData = trendData.combinedData
                .map((dp: any) => dp[pitchType])
                .filter((val: any) => val != null)
              
              if (pitchTypeData.length === 0) return null

              const max = Math.max(...pitchTypeData)
              const min = Math.min(...pitchTypeData)
              const avg = pitchTypeData.reduce((sum: number, val: number) => sum + val, 0) / pitchTypeData.length
              const latest = trendData.combinedData[trendData.combinedData.length - 1]?.[pitchType] || 0

              return (
                <Card key={pitchType} className="bg-white border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      {pitchType} {config?.title} ({pitchTypeData.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-green-600">{Math.round(max * 100) / 100}</div>
                        <div className="text-gray-500">Max</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-red-600">{Math.round(min * 100) / 100}</div>
                        <div className="text-gray-500">Min</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{Math.round(avg * 100) / 100}</div>
                        <div className="text-gray-500">Avg</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-600">{Math.round(latest * 100) / 100}</div>
                        <div className="text-gray-500">Latest</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="bg-white border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Overall {config?.title} ({summaryStats.count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-green-600">{summaryStats.max || 0}</div>
                    <div className="text-gray-500">Max</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">{summaryStats.min || 0}</div>
                    <div className="text-gray-500">Min</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{summaryStats.avg || 0}</div>
                    <div className="text-gray-500">Avg</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{summaryStats.latest || 0}</div>
                    <div className="text-gray-500">Latest</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
