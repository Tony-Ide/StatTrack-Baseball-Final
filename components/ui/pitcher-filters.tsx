"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown } from "lucide-react"
import { useMemo } from "react"

interface PitcherFiltersProps {
  // Games filter props
  games: any[] // This is now seasons array
  selectedGameIds: string[]
  setSelectedGameIds: (ids: string[] | ((prev: string[]) => string[])) => void
  
  // Season filter props
  selectedSeason?: string
  setSelectedSeason?: (season: string) => void
  
  // Month filter props
  selectedMonth?: string
  setSelectedMonth?: (month: string) => void
  
  // Pitch type filter props
  pitchTypeFilter: string
  setPitchTypeFilter: (type: string) => void
  uniquePitchTypes: string[]
  
  // Outcome filter props
  outcomeFilter: string
  setOutcomeFilter: (outcome: string) => void
  
  // Batter side filter props
  batterSide: string
  setBatterSide: (side: string) => void
  
  // Balls filter props
  ballsFilter?: string
  setBallsFilter?: (balls: string) => void
  
  // Strikes filter props
  strikesFilter?: string
  setStrikesFilter?: (strikes: string) => void
  
  // Outs filter props
  outsFilter?: string
  setOutsFilter?: (outs: string) => void
  
  // Optional props
  className?: string
  showClearButton?: boolean
  onClearSelection?: () => void
}

export default function PitcherFilters({
  games,
  selectedGameIds,
  setSelectedGameIds,
  selectedSeason = "all",
  setSelectedSeason,
  selectedMonth = "all",
  setSelectedMonth,
  pitchTypeFilter,
  setPitchTypeFilter,
  uniquePitchTypes,
  outcomeFilter,
  setOutcomeFilter,
  batterSide,
  setBatterSide,
  ballsFilter = "all",
  setBallsFilter,
  strikesFilter = "all",
  setStrikesFilter,
  outsFilter = "all",
  setOutsFilter,
  className = "",
  showClearButton = false,
  onClearSelection
}: PitcherFiltersProps) {
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

  // Unique games for filter UI (filtered by selected season)
  const uniqueGames: any[] = []
  games.forEach((season: any) => {
    if (selectedSeason === "all" || season.season === selectedSeason) {
      season.games?.forEach((g: any) => {
        uniqueGames.push({ 
    game_id: g.game_id, 
    date: g.date, 
    stadium: g.stadium 
        })
      })
    }
  })

  return (
    <div className={`flex flex-wrap gap-3 items-center ${className}`}>
      {/* Season filter dropdown */}
      {setSelectedSeason && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-700 text-sm">Season:</span>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {uniqueSeasons.map(season => (
                <SelectItem key={season} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Month filter */}
      {setSelectedMonth && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-700 text-sm">Month:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {(() => {
                const uniqueMonths = new Set<string>();
                games.forEach((season: any) => {
                  season.games?.forEach((game: any) => {
                    if (game.date) {
                      const month = new Date(game.date).getMonth() + 1;
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
      )}
      
      {/* Games filter dropdown */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-orange-700 text-sm">Games:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-32 justify-between h-8">
              <span className="truncate text-sm">
                {selectedGameIds.length === 0 
                  ? "Select games"
                  : selectedGameIds.length === uniqueGames.length 
                    ? "All Games" 
                    : `${selectedGameIds.length} of ${uniqueGames.length} games`
                }
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-games"
                  checked={selectedGameIds.length === uniqueGames.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedGameIds(uniqueGames.map(g => g.game_id))
                    } else {
                      setSelectedGameIds([])
                    }
                  }}
                />
                <label htmlFor="select-all-games" className="text-sm font-medium">
                  Select All Games
                </label>
              </div>
              <div className="border-t pt-2">
                {uniqueGames.map(g => (
                  <div key={g.game_id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`game-${g.game_id}`}
                      checked={selectedGameIds.includes(g.game_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGameIds((prev: string[]) => [...prev, g.game_id])
                        } else {
                          setSelectedGameIds((prev: string[]) => prev.filter((id: string) => id !== g.game_id))
                        }
                      }}
                    />
                    <label htmlFor={`game-${g.game_id}`} className="text-sm">
                      {g.date} ({g.stadium})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Pitch type filter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-orange-700 text-sm">Pitch Type:</span>
        <Select value={pitchTypeFilter} onValueChange={setPitchTypeFilter}>
          <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
            <SelectValue placeholder="Pitch Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniquePitchTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Outcome filter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-orange-700 text-sm">Outcome:</span>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="StrikeCalled">Called Strike</SelectItem>
            <SelectItem value="StrikeSwinging">Swinging Strike</SelectItem>
            <SelectItem value="BallCalled">Ball</SelectItem>
            <SelectItem value="InPlay">In Play</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Batter side filter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-orange-700 text-sm">Batter:</span>
        <Select value={batterSide} onValueChange={setBatterSide}>
          <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
            <SelectValue placeholder="Batter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batters</SelectItem>
            <SelectItem value="Left">vs LHH</SelectItem>
            <SelectItem value="Right">vs RHH</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Balls filter */}
      {setBallsFilter && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-700 text-sm">Balls:</span>
          <Select value={ballsFilter} onValueChange={setBallsFilter}>
            <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
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
      )}
      
      {/* Strikes filter */}
      {setStrikesFilter && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-700 text-sm">Strikes:</span>
          <Select value={strikesFilter} onValueChange={setStrikesFilter}>
            <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
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
      )}
      
      {/* Outs filter */}
      {setOutsFilter && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-700 text-sm">Outs:</span>
          <Select value={outsFilter} onValueChange={setOutsFilter}>
            <SelectTrigger className="w-20 bg-gray-100 border-orange-100 h-8">
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
      )}
      
      {/* Clear selection button (optional) */}
      {showClearButton && onClearSelection && (
        <Button
          variant="outline"
          size="sm"
          className="border-orange-300 text-orange-600 bg-white hover:bg-orange-50"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
      )}
    </div>
  )
} 