"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, TrendingUp, Target, Zap, RotateCcw } from "lucide-react"
import { parseGameDate } from "@/lib/utils"
import StatsTable from "@/components/stats-table"
import GamesLogTable from "@/components/games-log-table"
import SprayChart from "@/components/hitters-spray-chart"
import HeatmapStrikeZone from "@/components/heatmap-strike-zone"
import ZoneAnalysis from "@/components/zone-analysis"
import HitterTrendsView from "@/components/hitter-trends-view"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HitterDashboardProps {
  hitter?: any;
  games?: any[];
  pitchTypes?: string[];
}

export default function HitterDashboard({ hitter, games = [], pitchTypes }: HitterDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPitch, setSelectedPitch] = useState<any>(null)

  // Overview tab filters
  const [overviewSelectedSeason, setOverviewSelectedSeason] = useState("all");
  const [overviewSelectedMonth, setOverviewSelectedMonth] = useState("all");
  const [overviewSelectedBatterSide, setOverviewSelectedBatterSide] = useState("all");
  const [overviewSelectedPitchType, setOverviewSelectedPitchType] = useState("all");
  const [overviewSelectedOuts, setOverviewSelectedOuts] = useState("all");
  const [overviewSelectedBalls, setOverviewSelectedBalls] = useState("all");
  const [overviewSelectedStrikes, setOverviewSelectedStrikes] = useState("all");

  // Heatmaps tab filters
  const [heatmapSubTab, setHeatmapSubTab] = useState("zone");
  const [heatmapSelectedSeason, setHeatmapSelectedSeason] = useState("all");
  const [heatmapSelectedMonth, setHeatmapSelectedMonth] = useState("all");
  const [heatmapSelectedPitcherThrows, setHeatmapSelectedPitcherThrows] = useState("all");
  const [heatmapSelectedPitchType, setHeatmapSelectedPitchType] = useState("all");
  const [heatmapSelectedOuts, setHeatmapSelectedOuts] = useState("all");
  const [heatmapSelectedBalls, setHeatmapSelectedBalls] = useState("all");
  const [heatmapSelectedStrikes, setHeatmapSelectedStrikes] = useState("all");

  // Zone tab filters
  const [zoneSelectedSeason, setZoneSelectedSeason] = useState("all");
  const [zoneSelectedMonth, setZoneSelectedMonth] = useState("all");
  const [zoneSelectedPitcherThrows, setZoneSelectedPitcherThrows] = useState("all");
  const [zoneSelectedPitchType, setZoneSelectedPitchType] = useState("all");
  const [zoneSelectedOuts, setZoneSelectedOuts] = useState("all");
  const [zoneSelectedBalls, setZoneSelectedBalls] = useState("all");
  const [zoneSelectedStrikes, setZoneSelectedStrikes] = useState("all");

  // Debug logging for games prop
  useEffect(() => {
    console.log('=== HITTER DASHBOARD DEBUG ===')
    console.log('Hitter:', hitter)
    console.log('Games prop:', games)
    console.log('Games structure:', JSON.stringify(games, null, 2))
    console.log('Number of games:', games.length)
    if (games.length > 0) {
      console.log('First game structure:', games[0])
      console.log('First game innings:', games[0].innings)
      if (games[0].innings && games[0].innings.length > 0) {
        console.log('First inning:', games[0].innings[0])
        if (games[0].innings[0].plate_appearances && games[0].innings[0].plate_appearances.length > 0) {
          console.log('First plate appearance:', games[0].innings[0].plate_appearances[0])
          if (games[0].innings[0].plate_appearances[0].pitches && games[0].innings[0].plate_appearances[0].pitches.length > 0) {
            console.log('First pitch:', games[0].innings[0].plate_appearances[0].pitches[0])
          }
        }
      }
    }
    console.log('=== END DEBUG ===')
  }, [hitter, games])

  // Helper to get all pitches from the new hierarchical seasons structure
  function getAllPitches(): any[] {
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
  }

  // Calculate basic hitter stats
  const allPitches = getAllPitches()
  const hitterStats = {
    totalPitches: allPitches.length,
    totalGames: games.length,
    avgExitVelocity: 0, // TODO: Calculate from hitting_metrics
    avgLaunchAngle: 0,  // TODO: Calculate from hitting_metrics
    totalHits: allPitches.filter(p => p.play_result === 'Single' || p.play_result === 'Double' || p.play_result === 'Triple' || p.play_result === 'HomeRun').length,
    totalWalks: allPitches.filter(p => p.pitch_call === 'BallCalled' && p.strikes === 3).length,
    totalStrikeouts: allPitches.filter(p => p.pitch_call === 'StrikeCalled' && p.strikes === 2).length
  }

  // Zone filtered pitches
  const zoneFilteredPitches = allPitches.filter(pitch => {
    // Filter by hitter
    if (pitch.batter_id !== hitter?.player_id) return false;
    
    // Filter by season
    if (zoneSelectedSeason !== "all") {
      const pitchSeason = games.find((season: any) => 
        season.games?.some((game: any) => game.game_id === pitch.game_id)
      )?.season;
      if (pitchSeason !== zoneSelectedSeason) return false;
    }
    
    // Filter by month
    if (zoneSelectedMonth !== "all") {
      const pitchDate = parseGameDate(pitch.date);
      if (pitchDate.getMonth() + 1 !== parseInt(zoneSelectedMonth)) return false;
    }
    
    // Filter by pitcher throws
    if (zoneSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== zoneSelectedPitcherThrows) return false;
    
    // Filter by pitch type
    if (zoneSelectedPitchType !== "all" && pitch.auto_pitch_type !== zoneSelectedPitchType) return false;
    
    // Filter by outs
    if (zoneSelectedOuts !== "all" && pitch.outs !== parseInt(zoneSelectedOuts)) return false;
    
    // Filter by balls
    if (zoneSelectedBalls !== "all" && pitch.balls !== parseInt(zoneSelectedBalls)) return false;
    
    // Filter by strikes
    if (zoneSelectedStrikes !== "all" && pitch.strikes !== parseInt(zoneSelectedStrikes)) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-orange-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">{hitter?.number || '#'}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{hitter?.name || 'Hitter'}</h1>
                <p className="text-orange-600">
                  {hitter?.side || 'Unknown'} • {hitter?.team_id || 'Team'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-orange-300 text-orange-600 bg-white">
                {games.length} Games
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">



        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-orange-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="games-log" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Games Log
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="spray" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Spray Chart
            </TabsTrigger>
            <TabsTrigger value="heatmaps" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Heatmaps
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overview Filters */}
              <Card className="bg-white border-orange-100">
              <CardHeader>
                <CardTitle className="text-gray-900">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Season Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Season:</span>
                    <Select value={overviewSelectedSeason} onValueChange={(value) => {
                      setOverviewSelectedSeason(value);
                      // Reset month filter when season changes
                      setOverviewSelectedMonth("all");
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        {(() => {
                          const uniqueSeasons = new Set<string>();
                          games.forEach((season: any) => {
                            if (season.season) {
                              uniqueSeasons.add(season.season);
                            }
                          });
                          return Array.from(uniqueSeasons).sort().map((season: string) => (
                            <SelectItem key={season} value={season}>
                              {season}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Month:</span>
                    <Select value={overviewSelectedMonth} onValueChange={setOverviewSelectedMonth}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {(() => {
                          const uniqueMonths = new Set<number>();
                          getAllPitches().forEach((pitch: any) => {
                            if (pitch.batter_id === hitter?.player_id && pitch.date) {
                              // If season is selected, only include months from that season
                              if (overviewSelectedSeason !== "all") {
                                const pitchSeason = games.find((season: any) => 
                                  season.games?.some((game: any) => game.game_id === pitch.game_id)
                                )?.season;
                                if (pitchSeason !== overviewSelectedSeason) return;
                              }
                              
                              const pitchDate = new Date(pitch.date);
                              uniqueMonths.add(pitchDate.getMonth() + 1);
                            }
                          });
                          const monthNames = [
                            'January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'
                          ];
                          return Array.from(uniqueMonths).sort((a, b) => a - b).map((month: number) => (
                            <SelectItem key={month} value={month.toString()}>
                              {monthNames[month - 1]}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pitcher Side Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Pitcher Side:</span>
                    <Select value={overviewSelectedBatterSide} onValueChange={setOverviewSelectedBatterSide}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Right">vs RHP</SelectItem>
                        <SelectItem value="Left">vs LHP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pitch Type Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Pitch Type:</span>
                    <Select value={overviewSelectedPitchType} onValueChange={setOverviewSelectedPitchType}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Pitch Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {(() => {
                          const uniquePitchTypes = new Set<string>();
                          getAllPitches().forEach((pitch: any) => {
                            if (pitch.auto_pitch_type) {
                              uniquePitchTypes.add(pitch.auto_pitch_type);
                            }
                          });
                          return Array.from(uniquePitchTypes).sort().map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Outs Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Outs:</span>
                    <Select value={overviewSelectedOuts} onValueChange={setOverviewSelectedOuts}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Outs" />
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
                    <span className="font-semibold text-gray-700">Balls:</span>
                    <Select value={overviewSelectedBalls} onValueChange={setOverviewSelectedBalls}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Balls" />
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
                    <span className="font-semibold text-gray-700">Strikes:</span>
                    <Select value={overviewSelectedStrikes} onValueChange={setOverviewSelectedStrikes}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Strikes" />
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

            {/* Stats Tables */}
            <StatsTable
              player={hitter}
              games={games}
              playerType="hitter"
              filters={{
                season: overviewSelectedSeason,
                month: overviewSelectedMonth,
                batterSide: overviewSelectedBatterSide,
                pitchType: overviewSelectedPitchType,
                outs: overviewSelectedOuts,
                balls: overviewSelectedBalls,
                strikes: overviewSelectedStrikes
              }}
            />
          </TabsContent>

          {/* Games Log Tab */}
          <TabsContent value="games-log" className="space-y-6">
            <GamesLogTable
              player={hitter}
              games={games}
              playerType="hitter"
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <HitterTrendsView games={games} />
          </TabsContent>





          {/* Spray Chart Tab */}
          <TabsContent value="spray" className="space-y-6">
            <SprayChart
              onPitchSelect={setSelectedPitch}
              selectedPitch={selectedPitch}
              games={games}
              pitchTypes={pitchTypes}
            />
          </TabsContent>

          <TabsContent value="heatmaps" className="space-y-6">
            {/* Heatmaps Sub-tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setHeatmapSubTab("zone")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  heatmapSubTab === "zone"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Zone
              </button>
              <button
                onClick={() => setHeatmapSubTab("heatmaps")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  heatmapSubTab === "heatmaps"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Heatmaps
              </button>
            </div>

            {/* Heatmaps Filters - Only show for heatmaps sub-tab */}
            {heatmapSubTab === "heatmaps" && (
            <Card className="bg-white border-orange-100">
              <CardHeader>
                <CardTitle className="text-gray-900">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {/* Season Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Season:</span>
                    <Select value={heatmapSelectedSeason} onValueChange={setHeatmapSelectedSeason}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        {(() => {
                          const uniqueSeasons = new Set<string>();
                          games.forEach((season: any) => {
                            if (season.season) {
                              uniqueSeasons.add(season.season);
                            }
                          });
                          return Array.from(uniqueSeasons).sort().map((season: string) => (
                            <SelectItem key={season} value={season}>
                              {season}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Month:</span>
                    <Select value={heatmapSelectedMonth} onValueChange={setHeatmapSelectedMonth}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {(() => {
                          const uniqueMonths = new Set<string>();
                          games.forEach((season: any) => {
                            season.games?.forEach((game: any) => {
                              if (game.date) {
                                const month = parseGameDate(game.date).getMonth() + 1;
                                uniqueMonths.add(month.toString().padStart(2, '0'));
                              }
                            });
                          });
                          const monthNames = [
                            'January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'
                          ];
                          return Array.from(uniqueMonths).sort((a, b) => parseInt(a) - parseInt(b)).map((month: string) => (
                            <SelectItem key={month} value={month}>
                              {monthNames[parseInt(month) - 1]}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pitcher Throws Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Pitcher:</span>
                    <Select value={heatmapSelectedPitcherThrows} onValueChange={setHeatmapSelectedPitcherThrows}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Pitcher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Pitchers</SelectItem>
                        <SelectItem value="Left">vs LHP</SelectItem>
                        <SelectItem value="Right">vs RHP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pitch Type Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Pitch Type:</span>
                    <Select value={heatmapSelectedPitchType} onValueChange={setHeatmapSelectedPitchType}>
                      <SelectTrigger className="w-32">
                  <SelectValue placeholder="Pitch Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                        {(() => {
                          const uniquePitchTypes = new Set<string>();
                          getAllPitches().forEach((pitch: any) => {
                            if (pitch.auto_pitch_type) {
                              uniquePitchTypes.add(pitch.auto_pitch_type);
                            }
                          });
                          return Array.from(uniquePitchTypes).sort().map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ));
                        })()}
                </SelectContent>
              </Select>
            </div>

                  {/* Outs Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Outs:</span>
                    <Select value={heatmapSelectedOuts} onValueChange={setHeatmapSelectedOuts}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Outs" />
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
                    <span className="font-semibold text-gray-700">Balls:</span>
                    <Select value={heatmapSelectedBalls} onValueChange={setHeatmapSelectedBalls}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Balls" />
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
                    <span className="font-semibold text-gray-700">Strikes:</span>
                    <Select value={heatmapSelectedStrikes} onValueChange={setHeatmapSelectedStrikes}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Strikes" />
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
            )}
            {/* Heatmaps Content */}
            {heatmapSubTab === "heatmaps" && (
              <>
            {/* Top Row: Location, Whiff Rate, Hits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Location Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-500" />
                    Location Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return pitch.pitching_metrics;
                    });
                    
                    const pitchLocations = filteredPitches.map((pitch: any) => ({
                      plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                      plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Location" data={pitchLocations} />;
                  })()}
                </CardContent>
              </Card>
              {/* Whiff Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-red-500" />
                    Whiffs Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return pitch.pitch_call === "StrikeSwinging" && pitch.pitching_metrics;
                    });
                    
                    const whiffLocations = filteredPitches.map((pitch: any) => ({
                      plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                      plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Whiff Rate" data={whiffLocations} />;
                  })()}
                </CardContent>
              </Card>
              {/* Hits Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-500" />
                    Hits Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return ["Single", "Double", "Triple", "HomeRun"].includes(pitch.play_result) && pitch.pitching_metrics;
                    });
                    
                    const hitLocations = filteredPitches.map((pitch: any) => ({
                        plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                        plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Hits" data={hitLocations} />;
                  })()}
                </CardContent>
              </Card>
            </div>
            
            {/* Bottom Row: Groundballs, Flyballs, Line Drives */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Groundballs Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-brown-500" />
                    Groundballs Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return pitch.tagged_hit_type === "GroundBall" && pitch.pitching_metrics;
                    });
                    
                    const gbLocations = filteredPitches.map((pitch: any) => ({
                        plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                        plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Groundballs" data={gbLocations} />;
                  })()}
                </CardContent>
              </Card>
              {/* Flyballs Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-500" />
                    Flyballs Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return pitch.tagged_hit_type === "FlyBall" && pitch.pitching_metrics;
                    });
                    
                    const fbLocations = filteredPitches.map((pitch: any) => ({
                        plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                        plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Flyballs" data={fbLocations} />;
                  })()}
                </CardContent>
              </Card>
              {/* Line Drive Heatmap */}
              <Card className="bg-white border-orange-100">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-orange-500" />
                    Line Drives Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allPitches = getAllPitches();
                    const filteredPitches = allPitches.filter(pitch => {
                      // Filter by hitter
                      if (pitch.batter_id !== hitter?.player_id) return false;
                      
                      // Filter by season
                      if (heatmapSelectedSeason !== "all") {
                        const pitchSeason = games.find((season: any) => 
                          season.games?.some((game: any) => game.game_id === pitch.game_id)
                        )?.season;
                        if (pitchSeason !== heatmapSelectedSeason) return false;
                      }
                      
                      // Filter by month
                      if (heatmapSelectedMonth !== "all") {
                        const pitchDate = parseGameDate(pitch.date);
                        if (pitchDate.getMonth() + 1 !== parseInt(heatmapSelectedMonth)) return false;
                      }
                      
                      // Filter by pitcher throws
                      if (heatmapSelectedPitcherThrows !== "all" && pitch.pitcher?.throws !== heatmapSelectedPitcherThrows) return false;
                      
                      // Filter by pitch type
                      if (heatmapSelectedPitchType !== "all" && pitch.auto_pitch_type !== heatmapSelectedPitchType) return false;
                      
                      // Filter by outs
                      if (heatmapSelectedOuts !== "all" && pitch.outs !== parseInt(heatmapSelectedOuts)) return false;
                      
                      // Filter by balls
                      if (heatmapSelectedBalls !== "all" && pitch.balls !== parseInt(heatmapSelectedBalls)) return false;
                      
                      // Filter by strikes
                      if (heatmapSelectedStrikes !== "all" && pitch.strikes !== parseInt(heatmapSelectedStrikes)) return false;
                      
                      return pitch.tagged_hit_type === "LineDrive" && pitch.pitching_metrics;
                    });
                    
                    const ldLocations = filteredPitches.map((pitch: any) => ({
                        plate_loc_side: pitch.pitching_metrics.plate_loc_side,
                        plate_loc_height: pitch.pitching_metrics.plate_loc_height,
                    })).filter((loc: any) => loc.plate_loc_side != null && loc.plate_loc_height != null);
                    return <HeatmapStrikeZone title="Line Drives" data={ldLocations} />;
                  })()}
                </CardContent>
              </Card>
            </div>
              </>
            )}

            {/* Zone Content */}
            {heatmapSubTab === "zone" && (
              <>
                {/* Zone Filters */}
                <Card className="bg-white border-orange-100">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Zone Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {/* Season Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Season:</span>
                        <Select value={zoneSelectedSeason} onValueChange={setZoneSelectedSeason}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Seasons</SelectItem>
                            {games.map((season: any) => (
                              <SelectItem key={season.season} value={season.season}>
                                {season.season}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Month Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Month:</span>
                        <Select value={zoneSelectedMonth} onValueChange={setZoneSelectedMonth}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            <SelectItem value="3">March</SelectItem>
                            <SelectItem value="4">April</SelectItem>
                            <SelectItem value="5">May</SelectItem>
                            <SelectItem value="6">June</SelectItem>
                            <SelectItem value="7">July</SelectItem>
                            <SelectItem value="8">August</SelectItem>
                            <SelectItem value="9">September</SelectItem>
                            <SelectItem value="10">October</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pitcher Throws Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Pitcher:</span>
                        <Select value={zoneSelectedPitcherThrows} onValueChange={setZoneSelectedPitcherThrows}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Pitchers</SelectItem>
                            <SelectItem value="Left">vs LHP</SelectItem>
                            <SelectItem value="Right">vs RHP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pitch Type Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Pitch Type:</span>
                        <Select value={zoneSelectedPitchType} onValueChange={setZoneSelectedPitchType}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {pitchTypes?.map((type: string) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Outs Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Outs:</span>
                        <Select value={zoneSelectedOuts} onValueChange={setZoneSelectedOuts}>
                          <SelectTrigger className="w-24">
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
                        <span className="font-semibold text-gray-700">Balls:</span>
                        <Select value={zoneSelectedBalls} onValueChange={setZoneSelectedBalls}>
                          <SelectTrigger className="w-24">
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
                        <span className="font-semibold text-gray-700">Strikes:</span>
                        <Select value={zoneSelectedStrikes} onValueChange={setZoneSelectedStrikes}>
                          <SelectTrigger className="w-24">
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

                {/* Zone Analysis with filtered data */}
                <ZoneAnalysis 
                  games={games} 
                  hitterId={hitter?.player_id}
                  playerType="hitter"
                  filteredPitches={zoneFilteredPitches}
                  zoneFilters={{
                    season: zoneSelectedSeason,
                    month: zoneSelectedMonth,
                    batterSide: zoneSelectedPitcherThrows,
                    pitchType: zoneSelectedPitchType,
                    outs: zoneSelectedOuts,
                    balls: zoneSelectedBalls,
                    strikes: zoneSelectedStrikes
                  }}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 