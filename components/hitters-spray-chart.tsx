"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RotateCcw, Target, Filter, Zap, ChevronDown } from "lucide-react"

import { pitchTypeColors, parseGameDate } from "@/lib/utils"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useRef, Suspense } from "react"
import * as THREE from "three"
import { FBXLoader } from "three-stdlib"
import React from "react"
import { Line } from '@react-three/drei'

// Transformation matrix from user (for hit trajectory)
const transformMatrix = [
  [0.0, 0, .254, 0],
  [0, .254, 0, .3],
  [-0.253578, 0, 0, 38]
];


const pitchtransformMatrix = [
  [0.0, 0, .254, 0],
  [0, .254, 0, .3],  // Added +5 to Y translation
  [-0.33, 0, 0, 38.47]
];
// Separate transformation matrix for pitch trajectory and strike zone
const zoneTransformMatrix = [
  [0.254, 0, 0, 0],
  [0.0, 0, .254, .3],   // Added +5 to Y translation
  // Z becomes the new Y
  [0, -.253578, 0, 38] 
];

function applyTransform([x, y, z]: [number, number, number]): [number, number, number] {
  return [
    transformMatrix[0][0] * x + transformMatrix[0][1] * y + transformMatrix[0][2] * z + transformMatrix[0][3],
    transformMatrix[1][0] * x + transformMatrix[1][1] * y + transformMatrix[1][2] * z + transformMatrix[1][3],
    transformMatrix[2][0] * x + transformMatrix[2][1] * y + transformMatrix[2][2] * z + transformMatrix[2][3],
  ];
}

function applyPitchTransform([x, y, z]: [number, number, number]): [number, number, number] {
  return [
    pitchtransformMatrix[0][0] * x + pitchtransformMatrix[0][1] * y + pitchtransformMatrix[0][2] * z + pitchtransformMatrix[0][3],
    pitchtransformMatrix[1][0] * x + pitchtransformMatrix[1][1] * y + pitchtransformMatrix[1][2] * z + pitchtransformMatrix[1][3],
    pitchtransformMatrix[2][0] * x + pitchtransformMatrix[2][1] * y + pitchtransformMatrix[2][2] * z + pitchtransformMatrix[2][3],
  ];
}

function applyZoneTransform([x, y, z]: [number, number, number]): [number, number, number] {
  return [
    zoneTransformMatrix[0][0] * x + zoneTransformMatrix[0][1] * y + zoneTransformMatrix[0][2] * z + zoneTransformMatrix[0][3],
    zoneTransformMatrix[1][0] * x + zoneTransformMatrix[1][1] * y + zoneTransformMatrix[1][2] * z + zoneTransformMatrix[1][3],
    zoneTransformMatrix[2][0] * x + zoneTransformMatrix[2][1] * y + zoneTransformMatrix[2][2] * z + zoneTransformMatrix[2][3],
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

// 2D Strike Zone using affine matrix transformation
function StrikeZone2D() {
  // Strike zone dimensions in feet (standard MLB strike zone)
  const szPoints = [
    [-0.83, 0, 1.5], // Bottom left (x, z)
    [0.83, 0, 1.5],  // Bottom right
    [0.83, 0, 3.5],  // Top right
    [-0.83, 0, 3.5], // Top left
    [-0.83, 0, 1.5], // Close
  ];
  
  // Apply zone transform matrix to strike zone points
  const transformedPoints: [number, number, number][] = szPoints.map(([x, y, z]) => {
    return applyZoneTransform([x, y, z]);
  });
  
  return (
    <group>
      {/* Strike zone outline */}
      <Line 
        points={transformedPoints} 
        color="#ffffff" 
        lineWidth={2} 
        transparent 
        opacity={0.6} 
      />
    </group>
  );
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
            <StrikeZone2D />
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

// Animated Ball Component
function AnimatedBall({ pitch, isAnimating }: { pitch: any, isAnimating: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Check if we have valid hitting metrics and hit trajectory data
  const hasValidHitData = pitch.hitting_metrics && 
                         pitch.hit_trajectory && 
                         pitch.hitting_metrics.hang_time != null;
  
  // Check if we have valid pitch trajectory data (for when hit trajectory is NA)
  const hasValidPitchData = pitch.pitch_trajectory && pitch.pitching_metrics;
  
  const hangTime = hasValidHitData ? Number(pitch.hitting_metrics.hang_time) : 0;
  const isValidHangTime = isFinite(hangTime) && hangTime > 0;

  // Get pitch trajectory data for ball animation
  const pitchTraj = useMemo(() => {
    if (!hasValidPitchData) return null;
    try {
      return getPitchTrajectoryPointsFromSQL(pitch);
    } catch (e) {
      return null;
    }
  }, [pitch, hasValidPitchData]);

  // Create curve for pitch trajectory
  const pitchCurve = useMemo(() => {
    if (!pitchTraj) return null;
    const { x, y, z } = pitchTraj;
    const points = x.map((_: any, i: number) => {
      const [tx, ty, tz] = applyPitchTransform([x[i], y[i], z[i]]);
      return new THREE.Vector3(tx, ty, tz);
    });
    return new THREE.CatmullRomCurve3(points);
  }, [pitchTraj]);

  // Create curve for hit trajectory aligned to pitch end (match GameDayViewer)
  const hitCurve = useMemo(() => {
    if (!hasValidHitData || !isValidHangTime) return null;
    const pt = getPitchTrajectoryPointsFromSQL(pitch);
    if (!pt) return null;
    const lastIdx = pt.x.length - 1;
    const [endTx, endTy, endTz] = applyPitchTransform([pt.x[lastIdx], pt.y[lastIdx], pt.z[lastIdx]]);
    const cx = Number(pitch.hitting_metrics.contact_position_x);
    const cy = Number(pitch.hitting_metrics.contact_position_y);
    const cz = Number(pitch.hitting_metrics.contact_position_z);
    if (!isFinite(cx) || !isFinite(cy) || !isFinite(cz)) return null;
    const [cTx, cTy, cTz] = applyTransform([cx, cy, cz]);
    const shiftX = endTx - cTx;
    const shiftY = endTy - cTy;
    const shiftZ = endTz - cTz;
    const N = 100;
    const points: THREE.Vector3[] = [];
    points.push(new THREE.Vector3(endTx, endTy, endTz));
    for (let i = 1; i <= N; ++i) {
      const t = (hangTime * i) / N;
      const landing = getLandingPoint(pitch.hit_trajectory, t);
      const [tx, ty, tz] = applyTransform(landing);
      points.push(new THREE.Vector3(tx + shiftX, ty + shiftY, tz + shiftZ));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [pitch, hasValidHitData, isValidHangTime, hangTime]);

  useFrame((state) => {
    if (!isAnimating || !meshRef.current) return;
    
    if (hitCurve) {
      // Animate along aligned hit trajectory
      const animationDuration = 3; // seconds
      const progress = (state.clock.elapsedTime % animationDuration) / animationDuration;
      const position = hitCurve.getPoint(progress);
      meshRef.current.position.copy(position);
      setCurrentTime(progress * hangTime);
    } else if (pitchCurve) {
      // Animate along pitch trajectory (when hit trajectory is NA)
      const animationDuration = 2; // seconds
      const progress = (state.clock.elapsedTime % animationDuration) / animationDuration;
      const t = progress * 1; // Normalize to 0-1
      
      const position = pitchCurve.getPoint(t);
      meshRef.current.position.copy(position);
      setCurrentTime(t);
    }
  });

  // Show ball if we have either hit trajectory or pitch trajectory data
  if (!isAnimating || (!hasValidHitData && !pitchCurve)) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[hasValidHitData ? 0.5 : 0.06, 16, 16]} />
      <meshStandardMaterial color={hasValidHitData ? "#ff6b6b" : "#ffffff"} />
    </mesh>
  );
}

// Helper to get pitch trajectory points from SQL data
function getPitchTrajectoryPointsFromSQL(pitch: any, numPoints = 150) {
  const pt = pitch.pitch_trajectory || {}
  const pm = pitch.pitching_metrics || {}
  
  // Helper to get a number or throw
  function getNumber(v: any, name: string) {
    const n = parseFloat(v)
    if (!Number.isFinite(n)) throw new Error(`Missing or invalid value for ${name}`)
    return n
  }

  try {
    const Xc0 = getNumber(pt.pitch_trajectory_xc0, "pitch_trajectory_xc0")
    const Xc1 = getNumber(pt.pitch_trajectory_xc1, "pitch_trajectory_xc1")
    const Xc2 = getNumber(pt.pitch_trajectory_xc2, "pitch_trajectory_xc2")
    const Yc0 = getNumber(pt.pitch_trajectory_yc0, "pitch_trajectory_yc0")
    const Yc1 = getNumber(pt.pitch_trajectory_yc1, "pitch_trajectory_yc1")
    const Yc2 = getNumber(pt.pitch_trajectory_yc2, "pitch_trajectory_yc2")
    const Zc0 = getNumber(pt.pitch_trajectory_zc0, "pitch_trajectory_zc0")
    const Zc1 = getNumber(pt.pitch_trajectory_zc1, "pitch_trajectory_zc1")
    const Zc2 = getNumber(pt.pitch_trajectory_zc2, "pitch_trajectory_zc2")
    const ZoneTimeRaw = parseFloat(pm.zone_time)
    const ZoneTime = Number.isFinite(ZoneTimeRaw) && ZoneTimeRaw > 0 ? ZoneTimeRaw : 0.5

    // Get contact position from hitting metrics
    const t = Array.from({ length: numPoints }, (_, i) => (i * ZoneTime) / (numPoints - 1))
    const x = t.map(ti => Xc0 + Xc1 * ti + Xc2 * ti * ti)
    const y = t.map(ti => Yc0 + Yc1 * ti + Yc2 * ti * ti)
    const z = t.map(ti => Zc0 + Zc1 * ti + Zc2 * ti * ti)

    return {
      x,
      y,
      z,
      ZoneTime
    }
  } catch (e) {
    return null;
  }
}

// 3D Hit Trajectory Line (ball flight after contact)
function HitTrajectory3D({ pitch, highlight = false }: { pitch: any, highlight?: boolean }) {
  if (!pitch.hit_trajectory || !pitch.hitting_metrics || pitch.hitting_metrics.hang_time == null) return null;
  const hangTime = Number(pitch.hitting_metrics.hang_time);
  if (!isFinite(hangTime) || hangTime <= 0) return null;

  // Get pitch trajectory end point for alignment (match GameDayViewer)
  const pitchTraj = getPitchTrajectoryPointsFromSQL(pitch);
  if (!pitchTraj) return null;
  const lastPitchIndex = pitchTraj.x.length - 1;
  const pitchEndX = pitchTraj.x[lastPitchIndex];
  const pitchEndY = pitchTraj.y[lastPitchIndex];
  const pitchEndZ = pitchTraj.z[lastPitchIndex];
  const [pitchEndTx, pitchEndTy, pitchEndTz] = applyPitchTransform([pitchEndX, pitchEndY, pitchEndZ]);

  // Contact position
  const contactX = Number(pitch.hitting_metrics.contact_position_x);
  const contactY = Number(pitch.hitting_metrics.contact_position_y);
  const contactZ = Number(pitch.hitting_metrics.contact_position_z);
  if (!isFinite(contactX) || !isFinite(contactY) || !isFinite(contactZ)) return null;
  const [contactTx, contactTy, contactTz] = applyTransform([contactX, contactY, contactZ]);

  // Shift so hit traj begins exactly at pitch end
  const shiftX = pitchEndTx - contactTx;
  const shiftY = pitchEndTy - contactTy;
  const shiftZ = pitchEndTz - contactTz;

  // Sample points along the shifted trajectory
  const N = 100;
  const points: [number, number, number][] = [];
  points.push([pitchEndTx, pitchEndTy, pitchEndTz]);
  for (let i = 1; i <= N; ++i) {
    const t = (hangTime * i) / N;
    const landing = getLandingPoint(pitch.hit_trajectory, t);
    const [tx, ty, tz] = applyTransform(landing);
    points.push([tx + shiftX, ty + shiftY, tz + shiftZ]);
  }

  return (
    <Line points={points} color={highlight ? "#fbbf24" : "#1e90ff"} lineWidth={highlight ? 4 : 2} />
  );
}

// 3D Pitch Trajectory Line (ball flight before contact)
function PitchTrajectory3D({ pitch, highlight = false }: { pitch: any, highlight?: boolean }) {
  const traj = getPitchTrajectoryPointsFromSQL(pitch);
  if (!traj) return null;
  
  const { x, y, z } = traj;
  const points: [number, number, number][] = [];
  
  // Get contact position from hitting metrics for hit trajectory
  const contactX = Number(pitch.hitting_metrics?.contact_position_x);
  const contactY = Number(pitch.hitting_metrics?.contact_position_y);
  const contactZ = Number(pitch.hitting_metrics?.contact_position_z);
  
  // Apply the pitch transform matrix to pitch trajectory points
  for (let i = 0; i < x.length; i++) {
    const [tx, ty, tz] = applyPitchTransform([x[i], y[i], z[i]]);

    points.push([tx, ty, tz]);
  }
  
  // Always return the pitch trajectory, even if no contact data
  return (
    <Line points={points} color={highlight ? "#ff6b35" : "#ff4757"} lineWidth={highlight ? 4 : 2} />
  );
}

// 3D Strike Zone using affine matrix transformation
function StrikeZone3D() {
  // Strike zone dimensions in feet (standard MLB strike zone)
  const szPoints = [
    [-0.83, 0, 1.5], // Bottom left (x, z)
    [0.83, 0, 1.5],  // Bottom right
    [0.83, 0, 3.5],  // Top right
    [-0.83, 0, 3.5], // Top left
    [-0.83, 0, 1.5], // Close
  ];
  
  // Apply zone transform matrix to strike zone points
  const transformedPoints: [number, number, number][] = szPoints.map(([x, y, z]) => {
    return applyZoneTransform([x, y, z]);
  });
  
  return (
    <group>
      {/* Strike zone outline */}
      <Line 
        points={transformedPoints} 
        color="#ffffff" 
        lineWidth={3} 
        transparent 
        opacity={0.8} 
      />
    </group>
  );
}

// Camera Controller for different views
function CameraController({ onCatcherView, onDefaultView }: { onCatcherView: () => void, onDefaultView: () => void }) {
  const { camera } = useThree();
  
  const handleCatcherView = () => {
    // Position camera at (0, 0, 38) looking at (0, 0, 0)
    camera.position.set(0, .7, 40);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    onCatcherView();
  };

  const handleDefaultView = () => {
    // Reset to default camera position
    camera.position.set(0, 60, 120);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    onDefaultView();
  };

  // Expose the functions to parent component
  useEffect(() => {
    // @ts-ignore
    window.setCatcherView = handleCatcherView;
    // @ts-ignore
    window.setDefaultView = handleDefaultView;
    return () => {
      // @ts-ignore
      delete window.setCatcherView;
      // @ts-ignore
      delete window.setDefaultView;
    };
  }, []);

  return null; // This component doesn't render anything
}

// 3D Spray Chart
function SprayChart3D({ pitches, selectedKey, setSelectedKey }: { pitches: any[], selectedKey: string | number | null, setSelectedKey: (k: string | number) => void }) {
  const validPoints = getValidLandingPoints(pitches);
  const selectedPoint = validPoints.find(pt => pt && pt.key === selectedKey);
  const selectedPitch = selectedKey
    ? pitches.find((p, idx) => (p.pitch_uid || idx) === selectedKey)
    : null;
  const [isCameraLocked, setIsCameraLocked] = useState(false);

  return (
    <div className="flex flex-col items-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl shadow-lg p-4 flex-1 min-h-[60vh] w-full">
      <div className="relative w-full h-[60vh] rounded-lg overflow-hidden">
        <Canvas camera={{ position: [0, 60, 120], fov: 40 }} shadows style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[0, 100, 100]} intensity={1.2} castShadow />
          <Suspense fallback={null}>
            <BaseballFieldFBX url="/BaseballField.fbx" />
            <StrikeZone3D />
            {selectedPitch && (
              <>
                <PitchTrajectory3D pitch={selectedPitch} highlight={true} />
                <HitTrajectory3D pitch={selectedPitch} highlight={true} />
                <AnimatedBall pitch={selectedPitch} isAnimating={!!selectedPitch} />
              </>
            )}
          </Suspense>
          <OrbitControls 
            target={[0, 0, 0]} 
            enablePan={!isCameraLocked} 
            enableZoom={!isCameraLocked} 
            enableRotate={!isCameraLocked} 
          />
          <CameraController 
            onCatcherView={() => setIsCameraLocked(true)} 
            onDefaultView={() => setIsCameraLocked(false)} 
          />
        </Canvas>
        {/* Camera Control Buttons - positioned outside Canvas */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 hover:bg-white text-gray-800 border-gray-300 shadow-lg"
            onClick={() => {
              // @ts-ignore
              if (window.setCatcherView) {
                // @ts-ignore
                window.setCatcherView();
              }
            }}
          >
            Catcher's View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 hover:bg-white text-gray-800 border-gray-300 shadow-lg"
            onClick={() => {
              // @ts-ignore
              if (window.setDefaultView) {
                // @ts-ignore
                window.setDefaultView();
              }
            }}
          >
            Default
          </Button>
        </div>
      </div>
      <span className="mt-2 text-xs text-gray-200 font-semibold tracking-wide">3D Spray Chart</span>
    </div>
  );
}

interface SprayChartProps {
  onPitchSelect: (pitch: any) => void
  selectedPitch: any
  games: any[] // This is now seasons array
  pitchTypes?: string[]
}

export default function SprayChart({ onPitchSelect, selectedPitch, games, pitchTypes = [] }: SprayChartProps) {
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [pitchTypeFilter, setPitchTypeFilter] = useState("all")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [pitcherThrows, setPitcherThrows] = useState("all")
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
  const uniqueGames: { game_id: string; date: string; stadium: string }[] = [];
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
          if (pitcherThrows !== "all" && pitch.pitcher?.throws !== pitcherThrows) return false;
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
        <h3 className="text-lg font-semibold text-gray-900">Spray Chart & Interactive Strike Zone</h3>
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
          {/* Season filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-700 text-sm">Season:</span>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {Array.from(new Set(games.map((s: any) => s.season).filter(Boolean))).sort().map((season: string) => (
                  <SelectItem key={season} value={season}>{season}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-700 text-sm">Month:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {uniqueMonths.map((month: string) => (
                  <SelectItem key={month} value={month}>
                    {new Date(2024, parseInt(month) - 1).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Games filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-700 text-sm">Games:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-between h-8 bg-gray-100 border-orange-100">
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

          {/* Pitch Type filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-700 text-sm">Pitch Type:</span>
            <Select value={pitchTypeFilter} onValueChange={setPitchTypeFilter}>
              <SelectTrigger className="w-32 bg-gray-100 border-orange-100 h-8">
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

          {/* Pitcher Throws filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-700 text-sm">Pitcher:</span>
            <Select value={pitcherThrows} onValueChange={setPitcherThrows}>
              <SelectTrigger className="w-28 bg-gray-100 border-orange-100 h-8">
                <SelectValue placeholder="Pitcher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pitchers</SelectItem>
                <SelectItem value="Left">vs LHP</SelectItem>
                <SelectItem value="Right">vs RHP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Balls filter */}
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

          {/* Strikes filter */}
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

          {/* Outs filter */}
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

          {/* Clear selection button */}
          <Button
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-600 bg-white hover:bg-orange-50"
            onClick={() => onPitchSelect(null)}
          >
            Clear Selection
          </Button>
        </div>
        </div>

        {/* Main content - Spray Charts and Strike Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 2D Spray Chart */}
          <SprayChart2D pitches={pitches} selectedKey={selectedPitch?.pitch_uid} setSelectedKey={(key) => {
            const pitch = pitches.find(p => p.pitch_uid === key);
            onPitchSelect(pitch || null);
          }} />
          
          {/* Interactive Strike Zone */}
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

        {/* 3D Spray Chart - Full Width */}
        <div className="mt-6">
          <SprayChart3D pitches={pitches} selectedKey={selectedPitch?.pitch_uid} setSelectedKey={(key) => {
            const pitch = pitches.find(p => p.pitch_uid === key);
            onPitchSelect(pitch || null);
          }} />
        </div>

        {/* Legend for Spray Charts */}
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

        {/* Trajectory Legend */}
        <div className="flex items-center justify-center space-x-8 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300 font-medium">Pitch Trajectory</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-300 font-medium">Hit Trajectory</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full border border-gray-400"></div>
            <span className="text-gray-300 font-medium">Strike Zone</span>
          </div>
        </div>
      </div>
    </div>
  )
}
