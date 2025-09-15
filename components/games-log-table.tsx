"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { displayInningsPitched, parseGameDate } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface GamesLogTableProps {
  player: any
  games: any[]
  playerType: 'pitcher' | 'hitter'
  className?: string
}

interface GameStats {
  game_id: string
  date: string
  opponent: string  // Opponent team name
  plateAppearances: number
  inningsPitched?: number // Only for pitchers
  hits: number
  singles?: number // Only for hitters
  doubles?: number // Only for hitters
  triples?: number // Only for hitters
  homeRuns: number
  walks: number
  hitByPitch: number
  strikeouts: number
  kPercent: string
  bbPercent: string
  kbbPercent: string
  battingAverage: string
  onBasePercentage?: string // Only for hitters
  sluggingPercentage?: string // Only for hitters
  onBasePlusSlugging?: string // Only for hitters
  whip?: string // Only for pitchers
  babip: string
}

export default function GamesLogTable({ player, games, playerType, className = "" }: GamesLogTableProps) {
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [teamMappings, setTeamMappings] = useState<{ [key: string]: string }>({}) // player_id -> team_name

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

  // Helper to find opponent player ID for a specific game
  const getOpponentPlayerId = (gameId: string): string | null => {
    const allPitches = getAllPitches();
    const gamePitches = allPitches.filter(pitch => pitch.game_id === gameId);
    
    // For the current player, find an opponent
    const playerIdField = playerType === 'pitcher' ? 'pitcher_id' : 'batter_id';
    const opponentIdField = playerType === 'pitcher' ? 'batter_id' : 'pitcher_id';
    
    // Find a pitch where this player is involved
    const playerPitch = gamePitches.find(pitch => pitch[playerIdField] === player?.player_id);
    if (playerPitch && playerPitch[opponentIdField]) {
      return playerPitch[opponentIdField];
    }
    
    return null;
  };

  // Fetch opponent team data when component mounts or games change
  useEffect(() => {
    const fetchOpponentTeams = async () => {
      try {
        // Get all unique opponent player IDs from all games
        const opponentPlayerIds = new Set<string>();
        games.forEach((season: any) => {
          season.games?.forEach((game: any) => {
            const opponentPlayerId = getOpponentPlayerId(game.game_id);
            if (opponentPlayerId) {
              opponentPlayerIds.add(opponentPlayerId);
            }
          });
        });

        if (opponentPlayerIds.size === 0) return;

        // Fetch player data with team information from Supabase
        const { data: playersData, error } = await supabase
          .from('players')
          .select(`
            player_id,
            team_id,
            teams (
              name
            )
          `)
          .in('player_id', Array.from(opponentPlayerIds));

        if (error) {
          console.error('Error fetching opponent teams:', error);
          return;
        }

        // Build team mappings: player_id -> team_name
        const mappings: { [key: string]: string } = {};
        playersData?.forEach((player: any) => {
          mappings[player.player_id] = player.teams?.name || 'Unknown Team';
        });

        setTeamMappings(mappings);
      } catch (error) {
        console.error('Error in fetchOpponentTeams:', error);
      }
    };

    fetchOpponentTeams();
  }, [games, player, playerType]);

  const gameStats = useMemo((): GameStats[] => {
    // Get all games where this player appeared, sorted by date (latest first)
    const allGames: any[] = [];
    games.forEach((season: any) => {
      // Filter by selected season
      if (selectedSeason === "all" || season.season === selectedSeason) {
        season.games?.forEach((game: any) => {
          // Filter by selected month
          if (selectedMonth !== "all") {
            const gameDate = parseGameDate(game.date);
            if (gameDate.getMonth() + 1 !== parseInt(selectedMonth)) return;
          }
          
          // Check if this player appeared in this game
          const playerIdField = playerType === 'pitcher' ? 'pitcher_id' : 'batter_id';
          const gamePitches = getAllPitches().filter((pitch: any) => 
            pitch.game_id === game.game_id && pitch[playerIdField] === player?.player_id
          );
          if (gamePitches.length > 0) {
            allGames.push({
              ...game,
              pitches: gamePitches
            });
          }
        });
      }
    });
    
    // Sort by date (latest first)
    allGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return allGames.map((game) => {
      const gamePitches = game.pitches;
      
      // Calculate plate appearances using same logic as Overview (unique combinations)
      const gamePlateAppearances = new Set();
      gamePitches.forEach((pitch: any) => {
        gamePlateAppearances.add(`${pitch.game_id}-${pitch.inning}-${pitch.top_bottom}-${pitch.pa_of_inning}`);
      });
      const gamePA = gamePlateAppearances.size;
      
      // Calculate game-specific stats using same logic as Overview
      const gameHits = gamePitches.filter((p: any) => 
        ['Single', 'Double', 'Triple', 'HomeRun'].includes(p.play_result)
      ).length;
      const gameHR = gamePitches.filter((p: any) => p.play_result === 'HomeRun').length;
      const gameBB = gamePitches.filter((p: any) => p.kor_bb === 'Walk').length;
      const gameHBP = gamePitches.filter((p: any) => p.pitch_call === 'HitByPitch').length;
      const gameSO = gamePitches.filter((p: any) => p.kor_bb === 'Strikeout').length;
      
      // Calculate sacrifices (same logic as Overview)
      const gameSacrifices = gamePitches.filter((p: any) => 
        p.play_result === 'Sacrifice' || p.play_result === 'Sacrifice Fly'
      ).length;
      
      // Calculate IP for this game (only for pitchers)
      let gameIP: number | undefined;
      if (playerType === 'pitcher') {
        gameIP = 0;
        const innings = new Map();
        gamePitches.forEach((pitch: any) => {
          const inningKey = `${pitch.inning}_${pitch.top_bottom}`;
          if (!innings.has(inningKey)) {
            innings.set(inningKey, { maxOuts: pitch.outs, minOuts: pitch.outs, lastPitch: pitch });
          } else {
            const inning = innings.get(inningKey);
            inning.maxOuts = Math.max(inning.maxOuts, pitch.outs);
            inning.minOuts = Math.min(inning.minOuts, pitch.outs);
            inning.lastPitch = pitch;
          }
        });
        
        innings.forEach((inning: any) => {
          let inningOuts = inning.maxOuts - inning.minOuts;
          if (inning.lastPitch.kor_bb === 'Strikeout') {
            inningOuts += 1;
          }
          if (inning.lastPitch.outs_on_play) {
            inningOuts += inning.lastPitch.outs_on_play;
          }
          if (gameIP !== undefined) {
            gameIP += inningOuts / 3;
          }
        });
      }
      
      // Calculate advanced stats for this game using same logic as Overview
      const gameKPercent = gamePA > 0 ? (gameSO / gamePA * 100).toFixed(1) : '0.0';
      const gameBBPercent = gamePA > 0 ? (gameBB / gamePA * 100).toFixed(1) : '0.0';
      const gameKBBPercent = gamePA > 0 ? ((gameSO - gameBB) / gamePA * 100).toFixed(1) : '0.0';
      
      // Calculate BA for this game using same logic as Overview
      const gameAtBats = gamePA - gameBB - gameHBP - gameSacrifices;
      const gameBA = gameAtBats > 0 ? (gameHits / gameAtBats).toFixed(3) : '0.000';
      
      // Calculate OBP for this game (only for hitters)
      const gameOBP = gamePA > 0 ? ((gameHits + gameBB + gameHBP) / gamePA).toFixed(3) : '0.000';
      
      // Calculate SLG for this game (only for hitters)
      const gameSingles = gamePitches.filter((p: any) => p.play_result === 'Single').length;
      const gameDoubles = gamePitches.filter((p: any) => p.play_result === 'Double').length;
      const gameTriples = gamePitches.filter((p: any) => p.play_result === 'Triple').length;
      const gameSLG = gameAtBats > 0 ? ((gameSingles + 2 * gameDoubles + 3 * gameTriples + 4 * gameHR) / gameAtBats).toFixed(3) : '0.000';
      
      // Calculate OPS for this game (only for hitters)
      const gameOPS = (parseFloat(gameOBP) + parseFloat(gameSLG)).toFixed(3);
      
      // Calculate WHIP for this game (only for pitchers)
      let gameWHIP: string | undefined;
      if (playerType === 'pitcher' && gameIP !== undefined) {
        gameWHIP = gameIP > 0 ? ((gameHits + gameBB) / gameIP).toFixed(2) : '0.00';
      }
      
      // Calculate BABIP for this game using same logic as Overview
      const gameBabipHits = gameHits - gameHR;
      const gameBabipDenominator = gamePA - gameSO - gameHR - gameBB - gameHBP;
      const gameBABIP = gameBabipDenominator > 0 ? (gameBabipHits / gameBabipDenominator).toFixed(3) : '0.000';
      
      // Get opponent team name
      const opponentPlayerId = getOpponentPlayerId(game.game_id);
      const opponentTeam = opponentPlayerId ? (teamMappings[opponentPlayerId] || 'Unknown') : 'Unknown';
      
      return {
        game_id: game.game_id,
        date: game.date,
        opponent: opponentTeam,
        plateAppearances: gamePA,
        inningsPitched: gameIP,
        hits: gameHits,
        singles: gameSingles,
        doubles: gameDoubles,
        triples: gameTriples,
        homeRuns: gameHR,
        walks: gameBB,
        hitByPitch: gameHBP,
        strikeouts: gameSO,
        kPercent: gameKPercent,
        bbPercent: gameBBPercent,
        kbbPercent: gameKBBPercent,
        battingAverage: gameBA,
        onBasePercentage: gameOBP,
        sluggingPercentage: gameSLG,
        onBasePlusSlugging: gameOPS,
        whip: gameWHIP,
        babip: gameBABIP
      };
    });
  }, [player, games, playerType, selectedSeason, selectedMonth, teamMappings]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-white border-orange-100">
        <CardHeader>
          <CardTitle className="text-gray-900">Games Log</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Season and Month Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Season Filter */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Season:</span>
                <Select value={selectedSeason} onValueChange={(value) => {
                  setSelectedSeason(value);
                  // Reset month filter when season changes
                  setSelectedMonth("all");
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
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {(() => {
                      const uniqueMonths = new Set<number>();
                      const playerIdField = playerType === 'pitcher' ? 'pitcher_id' : 'batter_id';
                      getAllPitches().forEach((pitch: any) => {
                        if (pitch[playerIdField] === player?.player_id && pitch.date) {
                          // If season is selected, only include months from that season
                          if (selectedSeason !== "all") {
                            const pitchSeason = games.find((season: any) => 
                              season.games?.some((game: any) => game.game_id === pitch.game_id)
                            )?.season;
                            if (pitchSeason !== selectedSeason) return;
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
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Opponent</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">G</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">PA</th>
                  {playerType === 'pitcher' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">IP</th>
                  )}
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">H</th>
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">1B</th>
                  )}
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">2B</th>
                  )}
                  {playerType === 'hitter' && (
                    <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">3B</th>
                  )}
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">HR</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">BB</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">HBP</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-700 text-xs uppercase tracking-wider">SO</th>
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
                {gameStats.map((game, index) => (
                  <tr key={game.game_id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="py-3 px-4 font-medium text-gray-900">{parseGameDate(game.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{game.opponent}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">1</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.plateAppearances}</td>
                    {playerType === 'pitcher' && game.inningsPitched !== undefined && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{displayInningsPitched(game.inningsPitched)}</td>
                    )}
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.hits}</td>
                    {playerType === 'hitter' && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.singles}</td>
                    )}
                    {playerType === 'hitter' && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.doubles}</td>
                    )}
                    {playerType === 'hitter' && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.triples}</td>
                    )}
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.homeRuns}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.walks}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.hitByPitch}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.strikeouts}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.kPercent}%</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.bbPercent}%</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.kbbPercent}%</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.battingAverage}</td>
                    {playerType === 'hitter' && game.onBasePercentage && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.onBasePercentage}</td>
                    )}
                    {playerType === 'hitter' && game.sluggingPercentage && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.sluggingPercentage}</td>
                    )}
                    {playerType === 'hitter' && game.onBasePlusSlugging && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.onBasePlusSlugging}</td>
                    )}
                    {playerType === 'pitcher' && game.whip && (
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.whip}</td>
                    )}
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{game.babip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
