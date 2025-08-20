"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Target, Filter, TrendingUp } from "lucide-react"
import PitcherFilters from "@/components/ui/pitcher-filters"
import { pitchTypeColors, parseGameDate } from "@/lib/utils"

interface PitchMovementPlotProps {
  games: any[] // This is now seasons array
  pitchTypes: string[]
  onPitchSelect?: (pitch: any) => void
  selectedPitch?: any
}

export default function PitchMovementPlot({ games, pitchTypes, onPitchSelect, selectedPitch }: PitchMovementPlotProps) {
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [pitchTypeFilter, setPitchTypeFilter] = useState("all")
  const [pitchCallFilter, setPitchCallFilter] = useState("all")
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

  // Extract unique seasons for filter
  const uniqueSeasons = useMemo(() => {
    const seasons = new Set<string>()
    games.forEach((season: any) => {
      if (season.season) {
        seasons.add(season.season)
      }
    })
    return Array.from(seasons).sort()
  }, [games])

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
          if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false;
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

  const uniquePitchCalls = useMemo(() => {
    const callSet = new Set<string>()
    getAllPitches(games).forEach((pitch: any) => {
      if (pitch.pitch_call) {
        callSet.add(pitch.pitch_call)
      }
    })
    return Array.from(callSet).sort()
  }, [games])

  const handleGameToggle = (gameId: string) => {
    setSelectedGameIds(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const validPitches = pitches.filter((pitch: any) => {
    const metrics = pitch.pitching_metrics
    return metrics && 
           metrics.induced_vert_break !== null && 
           metrics.induced_vert_break !== undefined &&
           metrics.horz_break !== null && 
           metrics.horz_break !== undefined
  })

  const getPitchTypeColor = (pitchType: string) => {
    return pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6"
  }

  // Unique pitch types for filter UI
  const uniquePitchTypes = useMemo(() => {
    const types = new Set<string>()
    getAllPitches(games).forEach((pitch: any) => {
      if (pitch.auto_pitch_type) types.add(pitch.auto_pitch_type)
    })
    return Array.from(types).sort()
  }, [games])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Pitch Movement Analysis</h3>
        <div className="mt-2 flex items-center space-x-2">
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          {validPitches.length} pitches
          </div>
        </div>
      </div>

      <div className="p-4">
      {/* Enhanced Filters */}
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
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        />
      </div>

      {/* Enhanced Plot */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="relative w-full aspect-square">
          <svg className="absolute inset-0 w-full h-full">
            {/* Grid lines */}
            {Array.from({ length: 11 }, (_, i) => i * 10).map((percent) => (
              <line
                key={`grid-${percent}`}
                x1={`${percent}%`}
                y1="0"
                x2={`${percent}%`}
                y2="100%"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 11 }, (_, i) => i * 10).map((percent) => (
              <line
                key={`grid-h-${percent}`}
                x1="0"
                y1={`${percent}%`}
                x2="100%"
                y2={`${percent}%`}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}

            {/* Axes */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d1d5db" strokeWidth="2" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#d1d5db" strokeWidth="2" />

            {/* X-axis tick marks and labels (every 5 units, excluding 0) */}
            {[-20, -15, -10, -5, 5, 10, 15, 20].map((x) => (
              <g key={`x-tick-${x}`}>
                {/* Tick mark */}
                <line
                  x1={`${((x + 25) / 50) * 100}%`}
                  y1="50%"
                  x2={`${((x + 25) / 50) * 100}%`}
                  y2="51.5%"
                  stroke="#374151"
                  strokeWidth="2"
                />
                {/* Label */}
                <text
                  x={`${((x + 25) / 50) * 100}%`}
                  y="54%"
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {x}
                </text>
              </g>
            ))}

            {/* Y-axis tick marks and labels (every 5 units, excluding 0) */}
            {[-20, -15, -10, -5, 5, 10, 15, 20].map((y) => (
              <g key={`y-tick-${y}`}>
                {/* Tick mark */}
                <line
                  x1="50%"
                  y1={`${100 - ((y + 25) / 50) * 100}%`}
                  x2="48.5%"
                  y2={`${100 - ((y + 25) / 50) * 100}%`}
                  stroke="#374151"
                  strokeWidth="2"
                />
                {/* Label */}
                <text
                  x="46%"
                  y={`${100 - ((y + 25) / 50) * 100}%`}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                  dominantBaseline="middle"
                >
                  {y}
                </text>
              </g>
            ))}

            {/* Data points */}
            {validPitches.map((pitch: any, index: number) => {
              const metrics = pitch.pitching_metrics
              const x = ((metrics.horz_break + 25) / 50) * 100
              const y = 100 - ((metrics.induced_vert_break + 25) / 50) * 100
              const color = getPitchTypeColor(pitch.auto_pitch_type || 'Unknown')
              const isSelected = selectedPitch && selectedPitch.pitch_uid === pitch.pitch_uid

              return (
                <g key={`${pitch.pitch_uid}-${index}`}>
                  {/* Hover effect */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="8"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onPitchSelect && onPitchSelect(pitch)}
                  />
                  {/* Actual data point */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={isSelected ? "6" : "4"}
                    fill={color}
                    stroke={isSelected ? "#000000" : "white"}
                    strokeWidth={isSelected ? "2" : "1"}
                    opacity="0.8"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onPitchSelect && onPitchSelect(pitch)}
                  />
                  {/* Selection indicator */}
                  {isSelected && (
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="10"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Axis labels */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <span className="text-sm font-medium text-gray-600">Horizontal Break (inches)</span>
          </div>
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90">
            <span className="text-sm font-medium text-gray-600">Induced Vertical Break (inches)</span>
          </div>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Pitch Types</span>
          <span className="text-xs text-gray-500">{validPitches.length} total pitches</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {Array.from(new Set(validPitches.map((p: any) => p.auto_pitch_type))).map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getPitchTypeColor(type || 'Unknown') }}
              />
              <span className="text-sm text-gray-600">{type || 'Unknown'}</span>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
} 