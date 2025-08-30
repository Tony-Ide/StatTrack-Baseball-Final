"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"

interface ZoneAnalysisProps {
  games?: any[]
  pitcherId?: string
  hitterId?: string
  playerType?: 'pitcher' | 'hitter'
  filteredPitches?: any[]
  zoneFilters?: {
    season: string
    month: string
    batterSide: string
    pitchType: string
    outs: string
    balls: string
    strikes: string
  }
}

// Reusable Zone Chart Component
function ZoneChart({ title, games, pitcherId, hitterId, playerType, filteredPitches, zoneFilters }: { 
  title: string; 
  games?: any[]; 
  pitcherId?: string;
  hitterId?: string;
  playerType?: 'pitcher' | 'hitter';
  filteredPitches?: any[];
  zoneFilters?: {
    season: string
    month: string
    batterSide: string
    pitchType: string
    outs: string
    balls: string
    strikes: string
  }
}) {
  // Strike zone bounds (expanded by 0.17 in all directions)
  const zoneBounds = {
    x: { min: -1.00, max: 1.00 },
    y: { min: 1.33, max: 3.67 }
  }

  // Plot bounds
  const plotBounds = {
    x: { min: -2, max: 2 },
    y: { min: 0, max: 5 }
  }

  // Convert coordinates to SVG coordinates
  const toSVG = (x: number, y: number, width = 200, height = 250) => {
    // Convert from plot coordinates to SVG coordinates
    const svgX = ((x - plotBounds.x.min) / (plotBounds.x.max - plotBounds.x.min)) * width
    const svgY = height - ((y - plotBounds.y.min) / (plotBounds.y.max - plotBounds.y.min)) * height
    
    return { x: svgX, y: svgY }
  }

  // Define the 9 inner zones (3x3 grid) - expanded strike zone with equal divisions
  const innerZones = [
    // Top row (left to right)
    { id: 1, bounds: { x: { min: -1.00, max: -0.333 }, y: { min: 2.89, max: 3.67 } } },
    { id: 2, bounds: { x: { min: -0.333, max: 0.333 }, y: { min: 2.89, max: 3.67 } } },
    { id: 3, bounds: { x: { min: 0.333, max: 1.00 }, y: { min: 2.89, max: 3.67 } } },
    // Middle row (left to right)
    { id: 4, bounds: { x: { min: -1.00, max: -0.333 }, y: { min: 2.11, max: 2.89 } } },
    { id: 5, bounds: { x: { min: -0.333, max: 0.333 }, y: { min: 2.11, max: 2.89 } } },
    { id: 6, bounds: { x: { min: 0.333, max: 1.00 }, y: { min: 2.11, max: 2.89 } } },
    // Bottom row (left to right)
    { id: 7, bounds: { x: { min: -1.00, max: -0.333 }, y: { min: 1.33, max: 2.11 } } },
    { id: 8, bounds: { x: { min: -0.333, max: 0.333 }, y: { min: 1.33, max: 2.11 } } },
    { id: 9, bounds: { x: { min: 0.333, max: 1.00 }, y: { min: 1.33, max: 2.11 } } }
  ]

  // Define the 4 outside zones (updated for expanded strike zone)
  const outsideZones = [
    // Bottom-Left Outside Zone
    {
      id: "bl",
      points: [
        { x: 1.00, y: 1.33 },
        { x: 0, y: 1.33 },
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2.5 },
        { x: 1.00, y: 2.5 }
      ]
    },
    // Top-Left Outside Zone
    {
      id: "tl",
      points: [
        { x: 1.00, y: 3.67 },
        { x: 0, y: 3.67 },
        { x: 0, y: 5 },
        { x: 2, y: 5 },
        { x: 2, y: 2.5 },
        { x: 1.00, y: 2.5 }
      ]
    },
    // Top-Right Outside Zone
    {
      id: "tr",
      points: [
        { x: -1.00, y: 3.67 },
        { x: 0, y: 3.67 },
        { x: 0, y: 5 },
        { x: -2, y: 5 },
        { x: -2, y: 2.5 },
        { x: -1.00, y: 2.5 }
      ]
    },
    // Bottom-Right Outside Zone
    {
      id: "br",
      points: [
        { x: -1.00, y: 1.33 },
        { x: 0, y: 1.33 },
        { x: 0, y: 0 },
        { x: -2, y: 0 },
        { x: -2, y: 2.5 },
        { x: -1.00, y: 2.5 }
      ]
    }
  ]

  // Convert polygon points to SVG path
  const pointsToPath = (points: { x: number, y: number }[], width = 200, height = 250) => {
    const svgPoints = points.map(point => toSVG(point.x, point.y, width, height))
    return svgPoints.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ') + ' Z'
  }

  // Helper function to get all pitches
  const getAllPitches = () => {
    // If filtered pitches are provided, use them
    if (filteredPitches && filteredPitches.length > 0) {
      return filteredPitches
    }
    
    // Otherwise, get all pitches from games
    const allPitches: any[] = []
    games?.forEach((season: any) => {
      season.games?.forEach((game: any) => {
        game.innings?.forEach((inning: any) => {
          inning.plate_appearances?.forEach((pa: any) => {
            pa.pitches?.forEach((pitch: any) => {
              allPitches.push(pitch)
            })
          })
        })
      })
    })
    return allPitches
  }

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (point: { x: number, y: number }, polygon: { x: number, y: number }[]) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside
      }
    }
    return inside
  }

  // Helper function to check if a pitch is in a specific zone
  const isPitchInZone = (pitch: any, zone: any) => {
    const side = pitch.pitching_metrics?.plate_loc_side
    const height = pitch.pitching_metrics?.plate_loc_height
    
    if (side == null || height == null) return false

    // Transform pitch coordinates to match our zone coordinate system
    // TrackMan plate_loc_side: negative = left side, positive = right side
    // Our zone system: x=2 = left side, x=-2 = right side
    // So we need to flip the sign: side = -side
    const transformedSide = -side
    const transformedHeight = height

    // For inner zones (rectangular)
    if (zone.bounds) {
      return transformedSide >= zone.bounds.x.min && transformedSide <= zone.bounds.x.max &&
             transformedHeight >= zone.bounds.y.min && transformedHeight <= zone.bounds.y.max
    }
    
    // For outside zones (polygon)
    if (zone.points) {
      return isPointInPolygon({ x: transformedSide, y: transformedHeight }, zone.points)
    }
    
    return false
  }

  // Calculate statistics for each zone
  const calculateZoneStats = () => {
    const allPitches = getAllPitches()
    
    // Filter pitches based on player type
    let playerPitches: any[]
    if (playerType === 'hitter') {
      playerPitches = allPitches.filter(pitch => pitch.batter_id === hitterId)
    } else {
      playerPitches = allPitches.filter(pitch => pitch.pitcher_id === pitcherId)
    }
    
    // Apply zone filters to playerPitches for all metrics except Batting Average
    const filteredPlayerPitches = playerPitches.filter(pitch => {
      // Filter by month (if zoneFilters has month)
      if (zoneFilters?.month && zoneFilters.month !== "all") {
        const pitchDate = new Date(pitch.date)
        if (pitchDate.getMonth() + 1 !== parseInt(zoneFilters.month)) return false
      }
      
      // Filter by batter/pitcher side
      if (zoneFilters?.batterSide && zoneFilters.batterSide !== "all") {
        if (playerType === 'hitter') {
          // For hitters, filter by pitcher side (throws)
          if (pitch.pitcher?.throws !== zoneFilters.batterSide) return false
        } else {
          // For pitchers, filter by batter side
          if (pitch.batter?.side !== zoneFilters.batterSide) return false
        }
      }
      
      // Filter by pitch type
      if (zoneFilters?.pitchType && zoneFilters.pitchType !== "all" && pitch.auto_pitch_type !== zoneFilters.pitchType) return false
      
      // Filter by outs
      if (zoneFilters?.outs && zoneFilters.outs !== "all" && pitch.outs !== parseInt(zoneFilters.outs)) return false
      
      // Filter by balls
      if (zoneFilters?.balls && zoneFilters.balls !== "all" && pitch.balls !== parseInt(zoneFilters.balls)) return false
      
      // Filter by strikes
      if (zoneFilters?.strikes && zoneFilters.strikes !== "all" && pitch.strikes !== parseInt(zoneFilters.strikes)) return false
      
      return true
    })
    
    const zoneStats: { [key: string]: any } = {}

    // Calculate stats for inner zones
    innerZones.forEach(zone => {
      const zonePitches = filteredPlayerPitches.filter((pitch: any) => isPitchInZone(pitch, zone))
      const totalPitches = filteredPlayerPitches.length
      
      if (title === "Location%") {
        zoneStats[zone.id] = totalPitches > 0 ? ((zonePitches.length / totalPitches) * 100).toFixed(1) : '0.0'
      } else if (title === "Whiff%") {
        const swings = zonePitches.filter((pitch: any) => 
          ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable'].includes(pitch.pitch_call)
        ).length
        const whiffs = zonePitches.filter((pitch: any) => pitch.pitch_call === 'StrikeSwinging').length
        zoneStats[zone.id] = swings > 0 ? ((whiffs / swings) * 100).toFixed(1) : '0.0'
      } else if (title === "Batting Average") {
        // For batting average, we need to get final pitches from plate appearances
        // Use the same approach as stats-table: get all final pitches, then apply filters
        const finalPitches = new Map()
        
        // Get all final pitches from all games first
        games?.forEach((season: any) => {
          season.games?.forEach((game: any) => {
            game.innings?.forEach((inning: any) => {
              inning.plate_appearances?.forEach((pa: any) => {
                // Filter pitches based on player type
                let paPitches: any[]
                if (playerType === 'hitter') {
                  paPitches = pa.pitches?.filter((p: any) => p.batter_id === hitterId) || []
                } else {
                  paPitches = pa.pitches?.filter((p: any) => p.pitcher_id === pitcherId) || []
                }
                if (paPitches.length > 0) {
                  const finalPitch = paPitches[paPitches.length - 1]
                  const paKey = `${game.game_id}-${inning.inning}-${inning.top_bottom}-${pa.pa_of_inning}`
                  finalPitches.set(paKey, finalPitch)
                }
              })
            })
          })
        })
        
        // Now apply the same filters that are used in the zone filters
        const filteredFinalPitches = Array.from(finalPitches.values()).filter(pitch => {
          // Filter by month (if zoneFilters has month)
          if (zoneFilters?.month && zoneFilters.month !== "all") {
            const pitchDate = new Date(pitch.date)
            if (pitchDate.getMonth() + 1 !== parseInt(zoneFilters.month)) return false
          }
          
          // Filter by batter/pitcher side
          if (zoneFilters?.batterSide && zoneFilters.batterSide !== "all") {
            if (playerType === 'hitter') {
              // For hitters, filter by pitcher side (throws)
              if (pitch.pitcher?.throws !== zoneFilters.batterSide) return false
            } else {
              // For pitchers, filter by batter side
              if (pitch.batter?.side !== zoneFilters.batterSide) return false
            }
          }
          
          // Filter by pitch type
          if (zoneFilters?.pitchType && zoneFilters.pitchType !== "all" && pitch.auto_pitch_type !== zoneFilters.pitchType) return false
          
          // Filter by outs
          if (zoneFilters?.outs && zoneFilters.outs !== "all" && pitch.outs !== parseInt(zoneFilters.outs)) return false
          
          // Filter by balls
          if (zoneFilters?.balls && zoneFilters.balls !== "all" && pitch.balls !== parseInt(zoneFilters.balls)) return false
          
          // Filter by strikes
          if (zoneFilters?.strikes && zoneFilters.strikes !== "all" && pitch.strikes !== parseInt(zoneFilters.strikes)) return false
          
          return true
        })
        
        // Now filter by zone and calculate batting average
        const zoneFinalPitches = filteredFinalPitches.filter(pitch => isPitchInZone(pitch, zone))
        
        const hits = zoneFinalPitches.filter(pitch => 
          ['Single', 'Double', 'Triple', 'HomeRun'].includes(pitch.play_result)
        ).length
        const walks = zoneFinalPitches.filter(pitch => pitch.kor_bb === 'Walk').length
        const hitByPitch = zoneFinalPitches.filter(pitch => pitch.pitch_call === 'HitByPitch').length
        const sacrifices = zoneFinalPitches.filter(pitch => 
          pitch.play_result === 'Sacrifice' || pitch.play_result === 'Sacrifice Fly'
        ).length
        
        const atBats = zoneFinalPitches.length - walks - hitByPitch - sacrifices
        zoneStats[zone.id] = atBats > 0 ? (hits / atBats).toFixed(3) : '0.000'
      } else if (title === "GB%" || title === "FB%" || title === "LD%") {
        const groundBalls = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'GroundBall' && pitch.pitch_call === 'InPlay'
        ).length
        const flyBalls = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'FlyBall' && pitch.pitch_call === 'InPlay'
        ).length
        const lineDrives = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'LineDrive' && pitch.pitch_call === 'InPlay'
        ).length
        
        const totalBattedBalls = groundBalls + flyBalls + lineDrives
        
        if (title === "GB%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((groundBalls / totalBattedBalls) * 100).toFixed(1) : '0.0'
        } else if (title === "FB%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((flyBalls / totalBattedBalls) * 100).toFixed(1) : '0.0'
        } else if (title === "LD%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((lineDrives / totalBattedBalls) * 100).toFixed(1) : '0.0'
        }
      }
    })

    // Calculate stats for outside zones
    outsideZones.forEach(zone => {
      const zonePitches = filteredPlayerPitches.filter((pitch: any) => isPitchInZone(pitch, zone))
      const totalPitches = filteredPlayerPitches.length
      
      if (title === "Location%") {
        zoneStats[zone.id] = totalPitches > 0 ? ((zonePitches.length / totalPitches) * 100).toFixed(1) : '0.0'
      } else if (title === "Whiff%") {
        const swings = zonePitches.filter((pitch: any) => 
          ['InPlay', 'StrikeSwinging', 'FoulBallNotFieldable', 'FoulBallFieldable'].includes(pitch.pitch_call)
        ).length
        const whiffs = zonePitches.filter((pitch: any) => pitch.pitch_call === 'StrikeSwinging').length
        zoneStats[zone.id] = swings > 0 ? ((whiffs / swings) * 100).toFixed(1) : '0.0'
      } else if (title === "Batting Average") {
        // For batting average, we need to get final pitches from plate appearances
        // Use the same approach as stats-table: get all final pitches, then apply filters
        const finalPitches = new Map()
        
        // Get all final pitches from all games first
        games?.forEach((season: any) => {
          season.games?.forEach((game: any) => {
            game.innings?.forEach((inning: any) => {
              inning.plate_appearances?.forEach((pa: any) => {
                // Filter pitches based on player type
                let paPitches: any[]
                if (playerType === 'hitter') {
                  paPitches = pa.pitches?.filter((p: any) => p.batter_id === hitterId) || []
                } else {
                  paPitches = pa.pitches?.filter((p: any) => p.pitcher_id === pitcherId) || []
                }
                if (paPitches.length > 0) {
                  const finalPitch = paPitches[paPitches.length - 1]
                  const paKey = `${game.game_id}-${inning.inning}-${inning.top_bottom}-${pa.pa_of_inning}`
                  finalPitches.set(paKey, finalPitch)
                }
              })
            })
          })
        })
        
        // Now apply the same filters that are used in the zone filters
        const filteredFinalPitches = Array.from(finalPitches.values()).filter(pitch => {
          // Filter by month (if zoneFilters has month)
          if (zoneFilters?.month && zoneFilters.month !== "all") {
            const pitchDate = new Date(pitch.date)
            if (pitchDate.getMonth() + 1 !== parseInt(zoneFilters.month)) return false
          }
          
          // Filter by batter/pitcher side
          if (zoneFilters?.batterSide && zoneFilters.batterSide !== "all") {
            if (playerType === 'hitter') {
              // For hitters, filter by pitcher side (throws)
              if (pitch.pitcher?.throws !== zoneFilters.batterSide) return false
            } else {
              // For pitchers, filter by batter side
              if (pitch.batter?.side !== zoneFilters.batterSide) return false
            }
          }
          
          // Filter by pitch type
          if (zoneFilters?.pitchType && zoneFilters.pitchType !== "all" && pitch.auto_pitch_type !== zoneFilters.pitchType) return false
          
          // Filter by outs
          if (zoneFilters?.outs && zoneFilters.outs !== "all" && pitch.outs !== parseInt(zoneFilters.outs)) return false
          
          // Filter by balls
          if (zoneFilters?.balls && zoneFilters.balls !== "all" && pitch.balls !== parseInt(zoneFilters.balls)) return false
          
          // Filter by strikes
          if (zoneFilters?.strikes && zoneFilters.strikes !== "all" && pitch.strikes !== parseInt(zoneFilters.strikes)) return false
          
          return true
        })
        
        // Now filter by zone and calculate batting average
        const zoneFinalPitches = filteredFinalPitches.filter(pitch => isPitchInZone(pitch, zone))
        
        const hits = zoneFinalPitches.filter(pitch => 
          ['Single', 'Double', 'Triple', 'HomeRun'].includes(pitch.play_result)
        ).length
        const walks = zoneFinalPitches.filter(pitch => pitch.kor_bb === 'Walk').length
        const hitByPitch = zoneFinalPitches.filter(pitch => pitch.pitch_call === 'HitByPitch').length
        const sacrifices = zoneFinalPitches.filter(pitch => 
          pitch.play_result === 'Sacrifice' || pitch.play_result === 'Sacrifice Fly'
        ).length
        
        const atBats = zoneFinalPitches.length - walks - hitByPitch - sacrifices
        zoneStats[zone.id] = atBats > 0 ? (hits / atBats).toFixed(3) : '0.000'
      } else if (title === "GB%" || title === "FB%" || title === "LD%") {
        const groundBalls = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'GroundBall' && pitch.pitch_call === 'InPlay'
        ).length
        const flyBalls = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'FlyBall' && pitch.pitch_call === 'InPlay'
        ).length
        const lineDrives = zonePitches.filter(pitch => 
          pitch.tagged_hit_type === 'LineDrive' && pitch.pitch_call === 'InPlay'
        ).length
        
        const totalBattedBalls = groundBalls + flyBalls + lineDrives
        
        if (title === "GB%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((groundBalls / totalBattedBalls) * 100).toFixed(1) : '0.0'
        } else if (title === "FB%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((flyBalls / totalBattedBalls) * 100).toFixed(1) : '0.0'
        } else if (title === "LD%") {
          zoneStats[zone.id] = totalBattedBalls > 0 ? ((lineDrives / totalBattedBalls) * 100).toFixed(1) : '0.0'
        }
      }
    })

    return zoneStats
  }

  const zoneStats = calculateZoneStats()

  return (
    <Card className="bg-white border-orange-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-900 text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-center">
          <svg width="200" height="250" className="border border-gray-300 bg-white">
            {/* Plot bounds outline */}
            <rect
              x="0"
              y="0"
              width="200"
              height="250"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="3,3"
            />

            {/* Outside zones */}
            {outsideZones.map((zone) => (
              <path
                key={zone.id}
                d={pointsToPath(zone.points, 200, 250)}
                fill="#f3f4f6"
                stroke="#9ca3af"
                strokeWidth="0.5"
                className="hover:fill-gray-200 cursor-pointer transition-colors"
              />
            ))}

            {/* Inner zones (3x3 grid) */}
            {innerZones.map((zone) => {
              const topLeft = toSVG(zone.bounds.x.min, zone.bounds.y.max, 200, 250)
              const bottomRight = toSVG(zone.bounds.x.max, zone.bounds.y.min, 200, 250)
              const width = Math.abs(bottomRight.x - topLeft.x)
              const height = Math.abs(topLeft.y - bottomRight.y)

              return (
                <rect
                  key={zone.id}
                  x={Math.min(topLeft.x, bottomRight.x)}
                  y={Math.min(topLeft.y, bottomRight.y)}
                  width={width}
                  height={height}
                  fill="#e5f3e5"
                  stroke="#22c55e"
                  strokeWidth="0.5"
                  className="hover:fill-green-200 cursor-pointer transition-colors"
                />
              )
            })}

            {/* Zone statistics labels */}
            {innerZones.map((zone) => {
              const center = toSVG(
                (zone.bounds.x.min + zone.bounds.x.max) / 2,
                (zone.bounds.y.min + zone.bounds.y.max) / 2,
                200, 250
              )
              const stat = zoneStats[zone.id] || '0.0'

              return (
                <text
                  key={`stat-${zone.id}`}
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-semibold fill-gray-900 pointer-events-none"
                >
                  {stat}
                </text>
              )
            })}

            {/* Outside zone statistics labels */}
            {outsideZones.map((zone) => {
              // Calculate the centroid (true center) of the polygon for better label placement
              let area = 0;
              let centroidX = 0;
              let centroidY = 0;
              
              for (let i = 0; i < zone.points.length; i++) {
                const j = (i + 1) % zone.points.length;
                const cross = zone.points[i].x * zone.points[j].y - zone.points[j].x * zone.points[i].y;
                area += cross;
                centroidX += (zone.points[i].x + zone.points[j].x) * cross;
                centroidY += (zone.points[i].y + zone.points[j].y) * cross;
              }
              
              area /= 2;
              centroidX /= (6 * area);
              centroidY /= (6 * area);
              
              const center = toSVG(centroidX, centroidY, 200, 250)
              const stat = zoneStats[zone.id] || '0.0'

              return (
                <text
                  key={`stat-${zone.id}`}
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-semibold fill-gray-700 pointer-events-none"
                >
                  {stat}
                </text>
              )
            })}

            {/* Strike zone outline */}
            {(() => {
              const topLeft = toSVG(zoneBounds.x.min, zoneBounds.y.max, 200, 250)
              const bottomRight = toSVG(zoneBounds.x.max, zoneBounds.y.min, 200, 250)
              const width = Math.abs(bottomRight.x - topLeft.x)
              const height = Math.abs(topLeft.y - bottomRight.y)
              
              return (
                <rect
                  x={Math.min(topLeft.x, bottomRight.x)}
                  y={Math.min(topLeft.y, bottomRight.y)}
                  width={width}
                  height={height}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              )
            })()}

            {/* Inner zone dividing lines */}
            {/* Vertical lines */}
            <line
              x1={toSVG(-0.333, zoneBounds.y.min, 200, 250).x}
              y1={toSVG(-0.333, zoneBounds.y.min, 200, 250).y}
              x2={toSVG(-0.333, zoneBounds.y.max, 200, 250).x}
              y2={toSVG(-0.333, zoneBounds.y.max, 200, 250).y}
              stroke="#6b7280"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1={toSVG(0.333, zoneBounds.y.min, 200, 250).x}
              y1={toSVG(0.333, zoneBounds.y.min, 200, 250).y}
              x2={toSVG(0.333, zoneBounds.y.max, 200, 250).x}
              y2={toSVG(0.333, zoneBounds.y.max, 200, 250).y}
              stroke="#6b7280"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            
            {/* Horizontal lines */}
            <line
              x1={toSVG(zoneBounds.x.min, 2.11, 200, 250).x}
              y1={toSVG(zoneBounds.x.min, 2.11, 200, 250).y}
              x2={toSVG(zoneBounds.x.max, 2.11, 200, 250).x}
              y2={toSVG(zoneBounds.x.max, 2.11, 200, 250).y}
              stroke="#6b7280"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1={toSVG(zoneBounds.x.min, 2.89, 200, 250).x}
              y1={toSVG(zoneBounds.x.min, 2.89, 200, 250).y}
              x2={toSVG(zoneBounds.x.max, 2.89, 200, 250).x}
              y2={toSVG(zoneBounds.x.max, 2.89, 200, 250).y}
              stroke="#6b7280"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />

            {/* Home plate - 3x bigger and positioned under outer zones */}
            <polygon 
              points="100,245 77.5,230 77.5,207.5 122.5,207.5 122.5,230" 
              fill="#fff" 
              stroke="#ccc" 
              strokeWidth="2" 
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ZoneAnalysis({ games, pitcherId, hitterId, playerType, filteredPitches, zoneFilters }: ZoneAnalysisProps) {
  return (
    <div className="space-y-6">
      {/* Zone Statistics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Row 1 */}
        <ZoneChart title="Location%" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
        <ZoneChart title="Whiff%" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
        <ZoneChart title="Batting Average" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
        
        {/* Row 2 */}
        <ZoneChart title="GB%" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
        <ZoneChart title="FB%" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
        <ZoneChart title="LD%" games={games} pitcherId={pitcherId} hitterId={hitterId} playerType={playerType} filteredPitches={filteredPitches} zoneFilters={zoneFilters} />
      </div>

      {/* Legend */}
      <div className="text-center text-sm text-gray-600">
        <p>Inner zones: 1-9 | Outside zones: BL, TL, TR, BR</p>
      </div>
    </div>
  )
} 