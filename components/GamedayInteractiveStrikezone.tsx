"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Target, Filter, Zap } from "lucide-react"
import PitchTrajectory3D from "./pitch-trajectory-3d"
import { pitchTypeColors, parseGameDate } from "@/lib/utils"

interface GamedayInteractiveStrikezoneProps {
  onPitchSelect: (pitch: any) => void
  selectedPitch: any
  games: any[] // This is the seasons array with the single game
  homeTeamPlayers?: any[] // Add player data from parent
  awayTeamPlayers?: any[] // Add player data from parent
}

export default function GamedayInteractiveStrikezone({ 
  onPitchSelect, 
  selectedPitch, 
  games, 
  homeTeamPlayers = [], 
  awayTeamPlayers = [] 
}: GamedayInteractiveStrikezoneProps) {
  const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null)
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

  // Helper function to get player name by pitcher_id (same as in parent component)
  const getPlayerNameByPitcherId = (pitcherId: string) => {
    // Check both home and away team players
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    const player = allPlayers.find(p => p.player_id === pitcherId);
    return player ? player.name : `Unknown Player (${pitcherId})`;
  };

  // Map team_id -> team name from the current game's metadata
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
        
        // Determine team name from player's team_id
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

  // Filter pitches based on selected pitcher and other filters
  const pitches = useMemo(() => {
    // If no pitcher is selected, show no pitches
    if (!selectedPitcher) return [];
    
    const allPitches = getAllPitches(games);
    
    return allPitches.filter((pitch) => {
      // Filter by selected pitcher
      if (pitch.pitcher_id !== selectedPitcher) return false;
      
      // Apply other filters
      if (pitchTypeFilter !== "all" && pitch.auto_pitch_type !== pitchTypeFilter) return false;
      if (outcomeFilter !== "all" && pitch.pitch_call !== outcomeFilter) return false;
      if (batterSide !== "all" && pitch.batter?.side !== batterSide) return false;
      if (ballsFilter !== "all" && pitch.balls !== parseInt(ballsFilter)) return false;
      if (strikesFilter !== "all" && pitch.strikes !== parseInt(strikesFilter)) return false;
      if (outsFilter !== "all" && pitch.outs !== parseInt(outsFilter)) return false;
      
      return true;
    });
  }, [games, selectedPitcher, pitchTypeFilter, outcomeFilter, batterSide, ballsFilter, strikesFilter, outsFilter]);
  
  // Unique pitch types for filter UI
  const uniquePitchTypes = Array.from(new Set(getAllPitches(games).map((p: any) => p.auto_pitch_type).filter(Boolean)))

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Strike Zone Panel */}
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pitcher Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Pitcher</label>
                <Select 
                  value={selectedPitcher || ""} 
                  onValueChange={setSelectedPitcher}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
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

              {/* Pitch Type Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Pitch Type</label>
                <Select value={pitchTypeFilter} onValueChange={setPitchTypeFilter}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniquePitchTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Outcome Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Outcome</label>
                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    <SelectItem value="StrikeCalled">Strike Called</SelectItem>
                    <SelectItem value="StrikeSwinging">Strike Swinging</SelectItem>
                    <SelectItem value="Ball">Ball</SelectItem>
                    <SelectItem value="InPlay">In Play</SelectItem>
                    <SelectItem value="FoulBallNotFieldable">Foul Ball</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Batter Side Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Batter Side</label>
                <Select value={batterSide} onValueChange={setBatterSide}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Both Sides</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Balls Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Balls</label>
                <Select value={ballsFilter} onValueChange={setBallsFilter}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
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
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Strikes</label>
                <Select value={strikesFilter} onValueChange={setStrikesFilter}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
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

              {/* Outs Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Outs</label>
                <Select value={outsFilter} onValueChange={setOutsFilter}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-9">
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

              {/* Clear Button */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPitcher(null);
                    setPitchTypeFilter("all");
                    setOutcomeFilter("all");
                    setBatterSide("all");
                    setBallsFilter("all");
                    setStrikesFilter("all");
                    setOutsFilter("all");
                    onPitchSelect(null);
                  }}
                  className="w-full h-9"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

                     {/* Strike Zone Visualization */}
           <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
             {!selectedPitcher ? (
               <div className="flex flex-col items-center justify-center p-8 text-center">
                 <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                 <p className="text-lg font-medium text-gray-900 mb-2">Select a Pitcher</p>
                 <p className="text-gray-600">Please select a pitcher from the dropdown to view their pitch locations.</p>
               </div>
             ) : (
               <>
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
               </>
             )}
           </div>
        </div>
      </div>

      {/* 3D Pitch Viewer Panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">3D Pitch Trajectory</h3>
            {selectedPitch && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {selectedPitch.auto_pitch_type || selectedPitch.tagged_pitch_type} • {selectedPitch.pitching_metrics?.rel_speed || selectedPitch.rel_speed} mph
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4">
          {!selectedPitcher ? (
            <div className="h-96 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a Pitcher</p>
                <p className="text-sm">Please select a pitcher to view their pitch data and 3D trajectories</p>
              </div>
            </div>
          ) : selectedPitch ? (
            <div className="space-y-4">
              {/* Pitch Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-orange-500" />
                  Pitch Details
                </h5>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Type</div>
                    <div className="font-medium text-gray-900">{selectedPitch.auto_pitch_type || selectedPitch.tagged_pitch_type || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Velocity</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.rel_speed || selectedPitch.rel_speed} mph</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Spin Rate</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.spin_rate || selectedPitch.spin_rate} rpm</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Induced VB</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.induced_vert_break?.toFixed(1)}"</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Horizontal Break</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.horz_break?.toFixed(1)}"</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Spin Axis</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.spin_axis?.toFixed(1)}°</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Extension</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.extension?.toFixed(1)} ft</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rel Height</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.rel_height?.toFixed(1)} ft</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rel Side</div>
                    <div className="font-medium text-gray-900">{selectedPitch.pitching_metrics?.rel_side?.toFixed(1)} ft</div>
                  </div>
                </div>
              </div>

              <PitchTrajectory3D selectedPitch={selectedPitch} showCatcherViewButton={true} />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a pitch</p>
                <p className="text-sm">Click on a pitch in the strike zone to view its 3D trajectory</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
