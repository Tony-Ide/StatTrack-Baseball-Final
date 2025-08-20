"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useRef, useState, Suspense, useMemo } from "react"
import * as THREE from "three"
import { FBXLoader } from "three-stdlib"
import React from "react"
import { Line } from '@react-three/drei'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown } from "lucide-react"

// Transformation matrix from user
const transformMatrix = [
  [0.0, 0, .254, 0],
  [0, .254, 0, 0],
  [-0.253578, 0, 0, 38]
];

function applyTransform([x, y, z]: [number, number, number]): [number, number, number] {
  return [
    transformMatrix[0][0] * x + transformMatrix[0][1] * y + transformMatrix[0][2] * z + transformMatrix[0][3],
    transformMatrix[1][0] * x + transformMatrix[1][1] * y + transformMatrix[1][2] * z + transformMatrix[1][3],
    transformMatrix[2][0] * x + transformMatrix[2][1] * y + transformMatrix[2][2] * z + transformMatrix[2][3],
  ];
}

function evalPoly(t: number, coeffs: number[]): number {
  return coeffs.reduce((sum, c, i) => sum + c * Math.pow(t, i), 0);
}

function getLandingPoint(hit_trajectory: any, hangTime: number): [number, number, number] {
  const xCoeffs = Array.from({ length: 9 }, (_, i) => Number(hit_trajectory[`hit_trajectory_xc${i}`]));
  const yCoeffs = Array.from({ length: 9 }, (_, i) => Number(hit_trajectory[`hit_trajectory_yc${i}`]));
  const zCoeffs = Array.from({ length: 9 }, (_, i) => Number(hit_trajectory[`hit_trajectory_zc${i}`]));

  const x = evalPoly(hangTime, xCoeffs);
  const y = evalPoly(hangTime, yCoeffs);
  const z = evalPoly(hangTime, zCoeffs);

  return [x, y, z];
}

function isAllTrajectoryNA(hit_trajectory: any) {
  if (!hit_trajectory) return true;
  const keys = [
    ...Array.from({ length: 9 }, (_, i) => `hit_trajectory_xc${i}`),
    ...Array.from({ length: 9 }, (_, i) => `hit_trajectory_yc${i}`),
    ...Array.from({ length: 9 }, (_, i) => `hit_trajectory_zc${i}`),
  ];
  return keys.every(k => {
    const v = hit_trajectory[k];
    return v === null || v === undefined || v === 'NA' || Number.isNaN(Number(v));
  });
}

function getValidLandingPoints(pitches: any[]) {
  return pitches
    .filter(p => p.hit_trajectory && p.hitting_metrics && p.hitting_metrics.hang_time != null && !isAllTrajectoryNA(p.hit_trajectory))
          .map((p, idx) => {
            const hangTime = Number(p.hitting_metrics.hang_time);
            if (!isFinite(hangTime) || hangTime <= 0) return null;
            try {
              const landing = getLandingPoint(p.hit_trajectory, hangTime);
              const [tx, ty, tz] = applyTransform(landing);
        return {
          position: [tx, ty, tz],
          type: p.play_result || 'Out',
          color: getHitColor(p.play_result || 'Out'),
          key: p.pitch_uid || idx,
        };
            } catch {
              return null;
            }
    })
    .filter(Boolean);
}

function getHitColor(playResult: string) {
  switch (playResult) {
    case "Single": return "#4ade80"
    case "Double": return "#fbbf24"
    case "Triple": return "#f97316"
    case "HomeRun": return "#ef4444"
    case "Out":
    case "FieldersChoice":
    case "Sacrifice": return "#6b7280"
    default: return "#9ca3af"
  }
}

// 2D Spray Chart
function SprayChart2D({ pitches, selectedKey, setSelectedKey }: { pitches: any[], selectedKey: string | number | null, setSelectedKey: (k: string | number) => void }) {
  function LandingMarkers2D() {
    const points = getValidLandingPoints(pitches);
    return (
      <group>
        {points.filter(Boolean).map((pt: any) => (
          <mesh
            key={pt.key}
            position={[pt.position[0], 1, pt.position[2]]}
            onClick={() => setSelectedKey(pt.key)}
            scale={selectedKey === pt.key ? 1.5 : 1}
          >
            <circleGeometry args={[1.2, 24]} />
            <meshBasicMaterial color={selectedKey === pt.key ? '#fbbf24' : pt.color} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gradient-to-br from-green-900/80 to-green-700/80 rounded-2xl shadow-lg p-4 flex-1 min-h-[60vh] w-full">
      <div className="relative w-full h-[60vh] rounded-lg overflow-hidden">
        <Canvas orthographic camera={{ position: [0, 100, 38], zoom: 4, up: [0, 0, -1], near: 1, far: 200 }} style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={0.8} />
          <Suspense fallback={null}>
            <BaseballFieldFBX url="/BaseballField.fbx" />
            <LandingMarkers2D />
          </Suspense>
        </Canvas>
      </div>
      <span className="mt-2 text-xs text-gray-200 font-semibold tracking-wide">2D Spray Chart</span>
    </div>
  );
}

function BaseballFieldFBX(props: { url: string }) {
  const group = useRef<THREE.Group>(null)
  const [model, setModel] = useState<THREE.Group | null>(null)

  useEffect(() => {
    const loader = new FBXLoader()
    loader.load(props.url, (fbx) => {
      setModel(fbx)
    })
  }, [props.url])

  return model ? <primitive ref={group} object={model} scale={0.05} position={[0, 0, 0]} /> : null
}

// HitMarkers3D removed: no landing point markers in 3D chart

function OriginDot3D() {
  return (
    <mesh position={[0, 1.5, 0]}>
      <sphereGeometry args={[2.5, 24, 24]} />
      <meshStandardMaterial color="#ff2222" />
    </mesh>
  )
}

// Animated Ball Component
function AnimatedBall({ pitch, isAnimating }: { pitch: any, isAnimating: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const hangTime = Number(pitch.hitting_metrics.hang_time);

  useFrame((state) => {
    if (!isAnimating || !meshRef.current) return;
    
    // Animate from 0 to hang_time over 3 seconds
    const animationDuration = 3; // seconds
    const progress = (state.clock.elapsedTime % animationDuration) / animationDuration;
    const t = progress * hangTime;
    
    if (t <= hangTime) {
      const landing = getLandingPoint(pitch.hit_trajectory, t);
      const [tx, ty, tz] = applyTransform(landing);
      meshRef.current.position.set(tx, ty, tz);
      setCurrentTime(t);
    }
  });

  if (!isAnimating) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#ff6b6b" />
    </mesh>
  );
}

// 3D Trajectory Line
function Trajectory3D({ pitch, highlight = false }: { pitch: any, highlight?: boolean }) {
  if (!pitch.hit_trajectory || !pitch.hitting_metrics || pitch.hitting_metrics.hang_time == null) return null;
  const hangTime = Number(pitch.hitting_metrics.hang_time);
  if (!isFinite(hangTime) || hangTime <= 0) return null;
  // Sample points along the trajectory
  const N = 100;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= N; ++i) {
    const t = (hangTime * i) / N;
    const landing = getLandingPoint(pitch.hit_trajectory, t);
    const [tx, ty, tz] = applyTransform(landing);
    points.push([tx, ty, tz]);
  }
  return (
    <Line points={points} color={highlight ? "#fbbf24" : "#1e90ff"} lineWidth={highlight ? 4 : 2} />
  );
}

// Custom PitcherFilters for Spray Chart with play_result outcome filter
function SprayChartFilters({
  games,
  selectedGameIds,
  setSelectedGameIds,
  selectedSeason = "all",
  setSelectedSeason,
  pitchTypeFilter,
  setPitchTypeFilter,
  uniquePitchTypes,
  outcomeFilter,
  setOutcomeFilter,
  batterSide,
  setBatterSide,
  uniquePlayResults,
  className = ""
}: {
  games: any[] // This is now seasons array
  selectedGameIds: string[]
  setSelectedGameIds: (ids: string[] | ((prev: string[]) => string[])) => void
  selectedSeason?: string
  setSelectedSeason?: (season: string) => void
  pitchTypeFilter: string
  setPitchTypeFilter: (type: string) => void
  uniquePitchTypes: string[]
  outcomeFilter: string
  setOutcomeFilter: (outcome: string) => void
  batterSide: string
  setBatterSide: (side: string) => void
  uniquePlayResults: string[]
  className?: string
}) {
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
          <span className="font-semibold text-yellow-400">Season:</span>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {uniqueSeasons.map((season: string) => (
                <SelectItem key={season} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Games filter dropdown */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-yellow-400">Games:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-between">
              <span className="truncate">
                {selectedGameIds.length === 0 
                  ? "Select games"
                  : selectedGameIds.length === uniqueGames.length 
                    ? "All Games" 
                    : `${selectedGameIds.length} of ${uniqueGames.length} games`
                }
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
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
        <span className="font-semibold text-yellow-400">Pitch Type:</span>
        <Select value={pitchTypeFilter} onValueChange={setPitchTypeFilter}>
          <SelectTrigger className="w-32 bg-gray-100 border-orange-100">
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
      
      {/* Play Result filter (instead of Outcome) */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-yellow-400">Result:</span>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-32 bg-gray-100 border-orange-100">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="Single">Single</SelectItem>
            <SelectItem value="Double">Double</SelectItem>
            <SelectItem value="Triple">Triple</SelectItem>
            <SelectItem value="HomeRun">Home Run</SelectItem>
            <SelectItem value="Out">Out</SelectItem>
            <SelectItem value="FieldersChoice">Fielder's Choice</SelectItem>
            <SelectItem value="Sacrifice">Sacrifice</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Batter side filter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-yellow-400">Batter:</span>
        <Select value={batterSide} onValueChange={setBatterSide}>
          <SelectTrigger className="w-32 bg-gray-100 border-orange-100">
            <SelectValue placeholder="Batter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batters</SelectItem>
            <SelectItem value="Left">vs LHH</SelectItem>
            <SelectItem value="Right">vs RHH</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default function SprayChart({ games = [], pitchTypes = [] }: { games?: any[], pitchTypes?: string[] }) { // games is now seasons array
  const [selectedPitchKey, setSelectedPitchKey] = useState<string | number | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState("all")
  
  // Initialize with all games selected by default
  useEffect(() => {
    const allGameIds: string[] = []
    games.forEach((season: any) => {
      season.games?.forEach((g: any) => {
        allGameIds.push(g.game_id)
      })
    })
    setSelectedGameIds(allGameIds)
  }, [games])
  const [pitchTypeFilter, setPitchTypeFilter] = useState("all")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [batterSide, setBatterSide] = useState("all")

  // Helper to get all pitches from the new hierarchical games structure
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

  // Games filter: only include selected games
  const filteredSeasons = games.map((season: any) => ({
    ...season,
    games: season.games?.filter((g: any) => 
      selectedGameIds.includes(g.game_id) && 
      (selectedSeason === "all" || season.season === selectedSeason)
    ) || []
  })).filter((season: any) => season.games.length > 0)
  
  // Flatten pitches from selected games using new structure
  const pitches = getAllPitches(filteredSeasons).filter((pitch) => {
    if (pitchTypeFilter !== "all" && pitch.auto_pitch_type !== pitchTypeFilter) return false
    if (outcomeFilter !== "all" && pitch.play_result !== outcomeFilter) return false
    if (batterSide !== "all" && pitch.batter?.side !== batterSide) return false
    return true
  })
  
  // Debug logging
  console.log('=== SPRAY CHART DEBUG ===')
  console.log('Games (seasons):', games)
  console.log('Filtered seasons:', filteredSeasons)
  console.log('Total pitches:', pitches.length)
  console.log('Valid landing points:', getValidLandingPoints(pitches).length)
  console.log('=== END DEBUG ===')
  
  // Unique pitch types for filter UI - use passed pitchTypes if available, otherwise generate from games
  const uniquePitchTypes = pitchTypes.length > 0 
    ? pitchTypes 
    : Array.from(new Set(getAllPitches(games).map((p: any) => p.auto_pitch_type).filter(Boolean)))
  // Unique play results for filter UI
  const uniquePlayResults = Array.from(new Set(getAllPitches(games).map((p: any) => p.play_result).filter(Boolean)))
  const handleGameToggle = (game_id: string) => {
    setSelectedGameIds(ids => ids.includes(game_id) ? ids.filter(id => id !== game_id) : [...ids, game_id])
  }

  // Find the selected pitch object
  const validPoints = getValidLandingPoints(pitches);
  const selectedPoint = validPoints.find(pt => pt && pt.key === selectedPitchKey);
  const selectedPitch = selectedPoint
    ? pitches.find((p, idx) => (p.pitch_uid || idx) === selectedPoint.key)
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl shadow-2xl border border-slate-700">
      {/* Header */}
      <div className="flex items-center mb-8 gap-4">
        <svg width="40" height="40" viewBox="0 0 100 100" className="rounded-full shadow-lg">
          <circle cx="50" cy="50" r="48" fill="#166534" stroke="#eab308" strokeWidth="4" />
          <text x="50" y="60" textAnchor="middle" fontSize="38" fill="#fff" fontWeight="bold">⚾</text>
        </svg>
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Spray Chart</h2>
          <p className="text-slate-300 text-sm font-medium">Visualize batted ball locations in 2D and 3D</p>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <SprayChartFilters
          games={games}
          selectedGameIds={selectedGameIds}
          setSelectedGameIds={setSelectedGameIds}
          selectedSeason={selectedSeason}
          setSelectedSeason={setSelectedSeason}
          pitchTypeFilter={pitchTypeFilter}
          setPitchTypeFilter={setPitchTypeFilter}
          uniquePitchTypes={uniquePitchTypes}
          outcomeFilter={outcomeFilter}
          setOutcomeFilter={setOutcomeFilter}
          batterSide={batterSide}
          setBatterSide={setBatterSide}
          uniquePlayResults={uniquePlayResults}
          className="text-yellow-400"
        />
      </div>
      {/* Main content */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full">
        <SprayChart2D pitches={pitches} selectedKey={selectedPitchKey} setSelectedKey={setSelectedPitchKey} />
        <div className="flex flex-col items-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl shadow-lg p-4 flex-1 min-h-[60vh] w-full">
          <div className="relative w-full h-[60vh] rounded-lg overflow-hidden">
            <Canvas camera={{ position: [0, 60, 120], fov: 40 }} shadows style={{ width: '100%', height: '100%' }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[0, 100, 100]} intensity={1.2} castShadow />
              <Suspense fallback={null}>
                <BaseballFieldFBX url="/BaseballField.fbx" />
                {selectedPitch && (
                  <>
                    <Trajectory3D pitch={selectedPitch} highlight={true} />
                    <AnimatedBall pitch={selectedPitch} isAnimating={!!selectedPitch} />
                  </>
                )}
              </Suspense>
              <OrbitControls target={[0, 0, 0]} enablePan enableZoom enableRotate />
            </Canvas>
          </div>
          <span className="mt-2 text-xs text-gray-200 font-semibold tracking-wide">3D Spray Chart</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center space-x-8 mt-8 text-base">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow"></div>
          <span className="text-gray-200 font-semibold">Single</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow"></div>
          <span className="text-gray-200 font-semibold">Double</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
          <span className="text-gray-200 font-semibold">Triple</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
          <span className="text-gray-200 font-semibold">Home Run</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow"></div>
          <span className="text-gray-200 font-semibold">Out</span>
        </div>
      </div>
    </div>
  )
}
