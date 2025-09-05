"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, RotateCcw, Move, Zap, Target, ArrowDown } from "lucide-react"

interface GamedayGamesTrendProps {
  games: any[] // This is the seasons array with the single game
  selectedPitcher?: string | null
  onPitcherSelect?: (name: string, id: string, isPitcher: boolean) => void
  homeTeamPlayers?: any[] // Add player data from parent
  awayTeamPlayers?: any[] // Add player data from parent
}

export default function GamedayGamesTrend({ 
  games, 
  selectedPitcher, 
  onPitcherSelect, 
  homeTeamPlayers = [], 
  awayTeamPlayers = [] 
}: GamedayGamesTrendProps) {
  const [selectedMetric, setSelectedMetric] = useState("rel_speed")
  const [pitchCallFilter, setPitchCallFilter] = useState("all")
  const [outsFilter, setOutsFilter] = useState("all")
  const [ballsFilter, setBallsFilter] = useState("all")
  const [strikesFilter, setStrikesFilter] = useState("all")
  const [filterByPitchType, setFilterByPitchType] = useState(false)

  // Helper to get all pitches from the hierarchical seasons structure
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

  // Helper function to get player name by pitcher_id (same as in parent component)
  const getPlayerNameByPitcherId = (pitcherId: string) => {
    // Check both home and away team players
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    const player = allPlayers.find(p => p.player_id === pitcherId);
    return player ? player.name : `Unknown Player (${pitcherId})`;
  };

  // Map team_id -> team name from the single game's metadata
  const teamIdToName: Record<string, string> = useMemo(() => {
    const mapping: Record<string, string> = {};
    try {
      (games || []).forEach((season: any) => {
        (season.games || []).forEach((game: any) => {
          if (game?.home_team_foreign_id && game?.home_team) {
            mapping[game.home_team_foreign_id] = game.home_team;
          }
          if (game?.away_team_foreign_id && game?.away_team) {
            mapping[game.away_team_foreign_id] = game.away_team;
          }
        });
      });
    } catch {}
    return mapping;
  }, [games]);

  // Get all pitchers from the game with proper names from Supabase
  const gamePitchers = useMemo(() => {
    const allPitches = getAllPitches(games);
    const pitcherMap = new Map<string, { pitcher_id: string, name: string, team: string }>();
    
    allPitches.forEach((pitch: any) => {
      if (pitch.pitcher_id && !pitcherMap.has(pitch.pitcher_id)) {
        // Get pitcher name from Supabase player data
        const pitcherName = getPlayerNameByPitcherId(pitch.pitcher_id);
        
        // Determine team name by looking up the player's team_id and mapping to team name
        let teamName = 'Unknown';
        const homePlayer = homeTeamPlayers.find(p => p.player_id === pitch.pitcher_id);
        const awayPlayer = awayTeamPlayers.find(p => p.player_id === pitch.pitcher_id);
        const teamId = homePlayer?.team_id || awayPlayer?.team_id;
        if (teamId && teamIdToName[teamId]) {
          teamName = teamIdToName[teamId];
        }
        
        pitcherMap.set(pitch.pitcher_id, {
          pitcher_id: pitch.pitcher_id,
          name: pitcherName,
          team: teamName
        });
      }
    });
    
    return Array.from(pitcherMap.values());
  }, [games, homeTeamPlayers, awayTeamPlayers, teamIdToName]);

  // Get unique pitch calls for filtering
  const uniquePitchCalls = useMemo(() => {
    const calls = new Set<string>();
    const allPitches = getAllPitches(games);
    allPitches.forEach(pitch => {
      if (pitch.pitch_call) calls.add(pitch.pitch_call);
    });
    return Array.from(calls).sort();
  }, [games]);

  // Get unique pitch types for legend
  const uniquePitchTypes = useMemo(() => {
    const types = new Set<string>();
    getAllPitches(games).forEach((pitch: any) => {
      if (pitch.auto_pitch_type) types.add(pitch.auto_pitch_type);
    });
    return Array.from(types).sort();
  }, [games]);

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
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // unit source stays the same
    const unit = config?.unit || "";

    // For games trend, X = sequential_no (number). Keep only entries whose point exists at this X and has a value.
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
  };

  // Process data for games trend (single game analysis)
  const trendData: any = useMemo(() => {
    // Get all pitches from the single game
    const allPitches = getAllPitches(games);
    
    // Filter pitches based on selected pitcher and other filters
    const filteredPitches = allPitches.filter((pitch: any) => {
      // Filter by selected pitcher
      if (selectedPitcher && pitch.pitcher_id !== selectedPitcher) return false;
      
      // Apply other filters
      if (pitchCallFilter !== "all" && pitch.pitch_call !== pitchCallFilter) return false;
      if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false;
      if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false;
      if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false;
      
      // Check if pitch has the selected metric
      return pitch.pitching_metrics && pitch.pitching_metrics[selectedMetric] != null;
    });

    // Step 1: Get all unique pitch numbers from filtered pitches, sorted in ascending order
    const allPitchNumbers = [...new Set(filteredPitches.map((pitch: any) => pitch.pitch_no || 0))]
      .sort((a: any, b: any) => a - b);

    // Step 2: Group by pitch type and assign sequential numbers
    const groupedByPitchType: { [key: string]: any[] } = {};
    const sortedPitches = filteredPitches.sort((a: any, b: any) => a.pitch_no - b.pitch_no);
    
    sortedPitches.forEach((pitch: any, index: number) => {
      const pitchType = pitch.auto_pitch_type || "Other";
      if (!groupedByPitchType[pitchType]) {
        groupedByPitchType[pitchType] = [];
      }
      groupedByPitchType[pitchType].push({
        pitch_no: pitch.pitch_no || 0,
        sequential_no: index + 1, // Sequential number for this pitcher's pitches
        value: pitch.pitching_metrics[selectedMetric],
        pitch_type: pitchType,
        pitch_call: pitch.pitch_call
      });
    });

    // Step 3: Sort each group by sequential number
    Object.keys(groupedByPitchType).forEach(pitchType => {
      groupedByPitchType[pitchType].sort((a: any, b: any) => a.sequential_no - b.sequential_no);
    });

    return { 
      ...groupedByPitchType, 
      allPitchNumbers // Include the sorted pitch numbers for X-axis
    };
  }, [games, selectedPitcher, selectedMetric, pitchCallFilter, outsFilter, ballsFilter, strikesFilter]);

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
  };

  const config = metricConfigs[selectedMetric as keyof typeof metricConfigs];
  const IconComponent = config?.icon || TrendingUp;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white border-orange-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Pitcher Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Pitcher:</span>
              <Select 
                value={selectedPitcher || ""} 
                onValueChange={(value) => {
                  const pitcher = gamePitchers.find(p => p.pitcher_id === value);
                  if (pitcher) {
                    onPitcherSelect?.(pitcher.name, pitcher.pitcher_id, true);
                  }
                }}
              >
                <SelectTrigger className="w-48 bg-gray-100 border-orange-100 h-8">
                  <SelectValue placeholder="Select Pitcher" />
                </SelectTrigger>
                <SelectContent>
                  {gamePitchers.map(pitcher => (
                    <SelectItem key={pitcher.pitcher_id} value={pitcher.pitcher_id}>
                      {pitcher.name} ({pitcher.team})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metric Selection */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-700 text-sm">Metric:</span>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metricConfigs).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.title}</SelectItem>
                  ))}
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
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      {selectedPitcher && Object.keys(trendData).length > 0 && (
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
            {Object.keys(trendData).filter(key => key !== 'allPitchNumbers').length} pitch types
          </Badge>
          <span className="text-sm text-gray-600">
            {selectedPitcher 
              ? `Pitcher: ${gamePitchers.find(p => p.pitcher_id === selectedPitcher)?.name || selectedPitcher}`
              : "Select a Pitcher"
            }
          </span>
        </div>
      )}

      {/* Chart */}
      {selectedPitcher && Object.keys(trendData).length > 0 ? (
        <Card className="bg-white border-orange-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center">
              <IconComponent className="w-5 h-5 mr-2" style={{ color: config?.color }} />
              {config?.title} by Pitch Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="sequential_no"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                    label={{ 
                      value: "Pitch Number", 
                      position: "insideBottom", 
                      offset: -5, 
                      fill: "#6b7280" 
                    }}
                    type="number"
                    domain={[1, trendData.allPitchNumbers?.length || 1]}
                    allowDataOverflow={false}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis
                    domain={config?.yDomain || ["dataMin - 1", "dataMax + 1"]}
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280" }}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ 
                      value: config?.unit || "", 
                      angle: -90, 
                      position: "insideLeft", 
                      fill: "#6b7280" 
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} filterNull />
                  {Object.keys(trendData).map((pitchType) => {
                    if (pitchType === 'allPitchNumbers') return null;
                    const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6";
                    const series = Array.isArray(trendData[pitchType]) ? trendData[pitchType] : [];
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
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.keys(trendData).map((pitchType) => {
                if (pitchType === 'allPitchNumbers') return null;
                const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6";
                const dataCount = Array.isArray(trendData[pitchType]) ? trendData[pitchType].length : 0;
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : !selectedPitcher ? (
        <Card className="bg-white border-orange-200">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">Select a Pitcher</p>
            <p className="text-gray-600">
              Please select a pitcher from the dropdown to view their pitch trends.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-orange-200">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Data Available</p>
            <p className="text-gray-600">
              No pitches found for the selected pitcher with the current filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats by Pitch Type */}
      {selectedPitcher && Object.keys(trendData).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Summary Statistics by Pitch Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(trendData).map((pitchType) => {
              if (pitchType === 'allPitchNumbers') return null;
              const color = pitchTypeColors[pitchType as keyof typeof pitchTypeColors] || "#95a5a6";
              const pitchData = trendData[pitchType];
              const values = Array.isArray(pitchData) ? pitchData.map((d: any) => d.value) : [];
              const max = values.length ? Math.max(...values) : 0;
              const min = values.length ? Math.min(...values) : 0;
              const avg = values.length ? (values.reduce((sum: any, val: any) => sum + val, 0) / values.length) : 0;
              const latest = values.length ? values[values.length - 1] : undefined;
              
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
