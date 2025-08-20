"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Target, Filter, Zap } from "lucide-react"
import PitcherFilters from "@/components/ui/pitcher-filters"
import { pitchTypeColors, parseGameDate } from "@/lib/utils"

interface HitterInteractiveStrikeZoneProps {
  onPitchSelect: (pitch: any) => void
  selectedPitch: any
  games: any[] // This is now seasons array
  pitchTypes?: string[]
}

export default function HitterInteractiveStrikeZone({ onPitchSelect, selectedPitch, games, pitchTypes = [] }: HitterInteractiveStrikeZoneProps) {
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [pitchTypeFilter, setPitchTypeFilter] = useState("all")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [batterSide, setBatterSide] = useState("all")
  const [ballsFilter, setBallsFilter] = useState("all")
  const [strikesFilter, setStrikesFilter] = useState("all")
  const [outsFilter, setOutsFilter] = useState("all")

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

  // Filter games by selected season
  const seasonFiltered = selectedSeason === "all" ? games : games.filter((s: any) => s.season === selectedSeason);

  // Get months available in the selected season
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    seasonFiltered.forEach((season: any) => {
      season.games?.forEach((game: any) => {
        if (game.date) {
          const month = parseGameDate(game.date).getMonth() + 1;
          months.add(month.toString());
        }
      });
    });
    return Array.from(months).sort((a, b) => parseInt(a) - parseInt(b));
  }, [seasonFiltered]);

  // Filter games by selected month
  const monthFiltered = selectedMonth === "all" ? seasonFiltered : seasonFiltered.map((season: any) => ({
    ...season,
    games: season.games?.filter((game: any) => {
      if (!game.date) return false;
      const month = parseGameDate(game.date).getMonth() + 1;
      return month === parseInt(selectedMonth);
    }) || []
  })).filter((season: any) => season.games.length > 0);

  // Only allow selection of games that match both season and month
  const availableGameIds = new Set(
    monthFiltered.flatMap((season: any) => season.games?.map((g: any) => g.game_id) || [])
  );
  const filteredSelectedGameIds = selectedGameIds.filter(id => availableGameIds.has(id));

  // Only show games that match season and month in the filter UI
  const uniqueGames = [];
  monthFiltered.forEach((season: any) => {
    season.games?.forEach((g: any) => {
      uniqueGames.push({ game_id: g.game_id, date: g.date, stadium: g.stadium });
    });
  });

  // Only display pitches from the selected games (and season/month)
  const filteredSeasons = monthFiltered.map((season: any) => ({
    ...season,
    games: season.games?.filter((g: any) => filteredSelectedGameIds.length === 0 || filteredSelectedGameIds.includes(g.game_id)) || []
  })).filter((season: any) => season.games.length > 0);

  const pitches =
    filteredSelectedGameIds.length === 0
      ? []
      : getAllPitches(filteredSeasons).filter((pitch) => {
          if (pitchTypeFilter !== "all" && pitch.auto_pitch_type !== pitchTypeFilter) return false;
          if (outcomeFilter !== "all" && pitch.pitch_call !== outcomeFilter) return false;
          if (batterSide !== "all" && pitch.batter?.side !== batterSide) return false;
          if (selectedMonth !== "all") {
            const pitchDate = parseGameDate(pitch.date);
            if (pitchDate.getMonth() + 1 !== parseInt(selectedMonth)) return false;
          }
          if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false;
          if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false;
          if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false;
          if (filteredSelectedGameIds.length > 0 && !filteredSelectedGameIds.includes(pitch.game_id)) return false;
          return true;
        });
  
  // Unique pitch types for filter UI
  const uniquePitchTypes = Array.from(new Set(getAllPitches(games).map((p: any) => p.auto_pitch_type).filter(Boolean)))
  const handleGameToggle = (game_id: string) => {
    setSelectedGameIds(ids => ids.includes(game_id) ? ids.filter(id => id !== game_id) : [...ids, game_id])
  }

  const getPitchColor = (pitch: any) => {
    const pitchType = pitch.auto_pitch_type
    return pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#9ca3af"
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "StrikeCalled":
      case "StrikeSwinging":
        return "#ef4444"
      case "Ball":
        return "#3b82f6"
      case "InPlay":
        return "#10b981"
      default:
        return "#6b7280"
    }
  }

  // Use SVG with width=400 and height=500 to match 4ft x 5ft visible area
  const SVG_SIZE_X = 400;
  const SVG_SIZE_Y = 500;
  const X_MIN = -2, X_MAX = 2; // feet, for margin (side to side)
  const Z_MIN = 0, Z_MAX = 5;  // feet, for margin (height)

  const convertToSVGCoords = (plateLocSide: number, plateLocHeight: number) => {
    // Flip x axis: multiply plate_loc_side by -1
    const x = ((-plateLocSide - X_MIN) / (X_MAX - X_MIN)) * SVG_SIZE_X;
    // z: 0 to 5 feet → 500 to 0 px (invert for SVG)
    const y = SVG_SIZE_Y - ((plateLocHeight - Z_MIN) / (Z_MAX - Z_MIN)) * SVG_SIZE_Y;
    return { x, y };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Interactive Strike Zone</h3>
        <div className="mt-2 flex items-center space-x-2">
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {pitches.length} pitches
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          
        <PitcherFilters
          games={monthFiltered}
          selectedGameIds={selectedGameIds}
          setSelectedGameIds={setSelectedGameIds}
          selectedSeason={selectedSeason}
          setSelectedSeason={setSelectedSeason}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          pitchTypeFilter={pitchTypeFilter}
          setPitchTypeFilter={setPitchTypeFilter}
          uniquePitchTypes={uniquePitchTypes}
          outcomeFilter={outcomeFilter}
          setOutcomeFilter={setOutcomeFilter}
          batterSide={batterSide}
          setBatterSide={setBatterSide}
            ballsFilter={ballsFilter}
            setBallsFilter={setBallsFilter}
            strikesFilter={strikesFilter}
            setStrikesFilter={setStrikesFilter}
            outsFilter={outsFilter}
            setOutsFilter={setOutsFilter}
          showClearButton={true}
          onClearSelection={() => onPitchSelect(null)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          />
        </div>

        {/* Strike Zone Visualization */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center p-4">
            <svg width="400" height="500" className="rounded-lg" style={{ background: "#f3f4f6" }}>
            {/* Home plate - 3x bigger */}
              <polygon points="200,485 155,455 155,410 245,410 245,455" fill="#fff" stroke="#ccc" strokeWidth="2" />
            {/* Strike zone outline */}
            {(() => {
              const szPoints = [
                [-0.83, 1.5], // Bottom left (x, z)
                [0.83, 1.5],  // Bottom right
                [0.83, 3.5],  // Top right
                [-0.83, 3.5], // Top left
                [-0.83, 1.5], // Close
              ];
              const svgPoints = szPoints.map(([side, height]) => {
                const { x, y } = convertToSVGCoords(-side, height);
                return `${x},${y}`;
              }).join(" ");
              return (
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#333"
                  strokeWidth="3"
                  opacity="0.8"
                />
              );
            })()}
            {/* Pitch dots */}
            {pitches.map((pitch) => {
                const plateLocSide = pitch.pitching_metrics?.plate_loc_side
                const plateLocHeight = pitch.pitching_metrics?.plate_loc_height
                if (plateLocSide == null || plateLocHeight == null) return null
                const coords = convertToSVGCoords(plateLocSide, plateLocHeight)
                const isSelected = selectedPitch?.pitch_uid === pitch.pitch_uid
              return (
                <circle
                    key={pitch.pitch_uid}
                  cx={coords.x}
                  cy={coords.y}
                    r={isSelected ? 10 : 8}
                  fill={getPitchColor(pitch)}
                    stroke={isSelected ? "#333" : getOutcomeColor(pitch.pitch_call)}
                    strokeWidth={isSelected ? 4 : 2}
                    className="cursor-pointer hover:r-10 transition-all"
                  onClick={() => onPitchSelect(pitch)}
                    opacity={isSelected ? 1 : 0.85}
                >
                  <title>
                    plate_loc_side: {plateLocSide}, plate_loc_height: {plateLocHeight}
                  </title>
                </circle>
              )
            })}
          </svg>
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2 px-4 pb-4">
              <div className="text-sm text-gray-600 font-semibold">Pitch Types:</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {(() => {
                // Get unique pitch types from the filtered pitches
                const uniquePitchTypes = [...new Set(pitches.map(pitch => pitch.auto_pitch_type).filter(Boolean))]
                return uniquePitchTypes.map(pitchType => {
                  const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
                  return (
                    <div key={pitchType} className="flex items-center space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-700">{pitchType}</span>
              </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
