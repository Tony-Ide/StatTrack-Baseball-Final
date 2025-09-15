"use client"

import { useState, useMemo, useRef, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { FBXLoader } from "three-stdlib"
import { Line } from '@react-three/drei'
import { supabase } from "@/lib/supabase"

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

  // Create curve for hit trajectory (when available)
  const hitCurve = useMemo(() => {
    if (!hasValidHitData || !isValidHangTime) return null;
    
    // Get pitch trajectory end point for alignment
    const pitchTraj = getPitchTrajectoryPointsFromSQL(pitch);
    if (!pitchTraj) return null;
    
    const lastPitchIndex = pitchTraj.x.length - 1;
    const pitchEndX = pitchTraj.x[lastPitchIndex];
    const pitchEndY = pitchTraj.y[lastPitchIndex];
    const pitchEndZ = pitchTraj.z[lastPitchIndex];
    
    // Apply pitch transform to get the 3D position where pitch trajectory ends
    const [pitchEndTx, pitchEndTy, pitchEndTz] = applyPitchTransform([pitchEndX, pitchEndY, pitchEndZ]);
    
    // Get contact position from hitting metrics
    const contactX = Number(pitch.hitting_metrics.contact_position_x);
    const contactY = Number(pitch.hitting_metrics.contact_position_y);
    const contactZ = Number(pitch.hitting_metrics.contact_position_z);
    
    if (!isFinite(contactX) || !isFinite(contactY) || !isFinite(contactZ)) return null;
    
    // Apply transform to get original contact position
    const [contactTx, contactTy, contactTz] = applyTransform([contactX, contactY, contactZ]);
    
    // Calculate the shift needed to move hit trajectory from contact position to pitch end position
    const shiftX = pitchEndTx - contactTx;
    const shiftY = pitchEndTy - contactTy;
    const shiftZ = pitchEndTz - contactTz;
    
    // Create points for hit trajectory curve
    const N = 100;
    const points: THREE.Vector3[] = [];
    
    // Start at pitch trajectory end position
    points.push(new THREE.Vector3(pitchEndTx, pitchEndTy, pitchEndTz));
    
    // Add trajectory points from contact to landing, but shifted to start from pitch end
    for (let i = 1; i <= N; ++i) {
      const t = (hangTime * i) / N;
      const landing = getLandingPoint(pitch.hit_trajectory, t);
      const [tx, ty, tz] = applyTransform(landing);
      // Apply the shift to align with pitch trajectory end
      points.push(new THREE.Vector3(tx + shiftX, ty + shiftY, tz + shiftZ));
    }
    
    return new THREE.CatmullRomCurve3(points);
  }, [pitch, hasValidHitData, isValidHangTime, hangTime]);

  useFrame((state) => {
    if (!isAnimating || !meshRef.current) return;
    
    if (hitCurve) {
      // Animate along hit trajectory curve
      const animationDuration = 3; // seconds
      const progress = (state.clock.elapsedTime % animationDuration) / animationDuration;
      const t = progress; // Normalize to 0-1
      
      const position = hitCurve.getPoint(t);
      meshRef.current.position.copy(position);
      setCurrentTime(t * hangTime);
    } else if (pitchCurve) {
      // Animate along pitch trajectory curve (when hit trajectory is NA)
      const animationDuration = 2; // seconds
      const progress = (state.clock.elapsedTime % animationDuration) / animationDuration;
      const t = progress; // Normalize to 0-1
      
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

// 3D Hit Trajectory Line (ball flight after contact)
function HitTrajectory3D({ pitch, highlight = false }: { pitch: any, highlight?: boolean }) {
  if (!pitch.hit_trajectory || !pitch.hitting_metrics || pitch.hitting_metrics.hang_time == null) return null;
  const hangTime = Number(pitch.hitting_metrics.hang_time);
  if (!isFinite(hangTime) || hangTime <= 0) return null;
  
  // Get pitch trajectory end point
  const pitchTraj = getPitchTrajectoryPointsFromSQL(pitch);
  if (!pitchTraj) return null;
  
  // Find the last point of the pitch trajectory (where it ends)
  const lastPitchIndex = pitchTraj.x.length - 1;
  const pitchEndX = pitchTraj.x[lastPitchIndex];
  const pitchEndY = pitchTraj.y[lastPitchIndex];
  const pitchEndZ = pitchTraj.z[lastPitchIndex];
  
  // Apply pitch transform to get the 3D position where pitch trajectory ends
  const [pitchEndTx, pitchEndTy, pitchEndTz] = applyPitchTransform([pitchEndX, pitchEndY, pitchEndZ]);
  
  // Get contact position from hitting metrics (original hit trajectory start)
  const contactX = Number(pitch.hitting_metrics.contact_position_x);
  const contactY = Number(pitch.hitting_metrics.contact_position_y);
  const contactZ = Number(pitch.hitting_metrics.contact_position_z);
  
  if (!isFinite(contactX) || !isFinite(contactY) || !isFinite(contactZ)) return null;
  
  // Apply transform to get original contact position
  const [contactTx, contactTy, contactTz] = applyTransform([contactX, contactY, contactZ]);
  
  // Calculate the shift needed to move hit trajectory from contact position to pitch end position
  const shiftX = pitchEndTx - contactTx;
  const shiftY = pitchEndTy - contactTy;
  const shiftZ = pitchEndTz - contactTz;
  
  // Sample points along the trajectory
  const N = 100;
  const points: [number, number, number][] = [];
  
  // Start at pitch trajectory end position
  points.push([pitchEndTx, pitchEndTy, pitchEndTz]);
  
  // Add trajectory points from contact to landing, but shifted to start from pitch end
  for (let i = 1; i <= N; ++i) {
    const t = (hangTime * i) / N;
    const landing = getLandingPoint(pitch.hit_trajectory, t);
    const [tx, ty, tz] = applyTransform(landing);
    // Apply the shift to align with pitch trajectory end
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

// 3D Pitch Locations component
function PitchLocations3D({ pitchLocations, onPitchClick }: { pitchLocations: any[], onPitchClick?: (pitch: any) => void }) {
  if (!pitchLocations || pitchLocations.length === 0) return null;

  return (
    <group>
      {pitchLocations.map((pitch, index) => {
        // Apply zoneTransformMatrix to get 3D coordinates
        const [x, y, z] = applyZoneTransform([pitch.x, pitch.y, pitch.z]);
        
        // Determine color based on pitch call
        let color = 'white';
        if (pitch.pitch_call === 'StrikeCalled' || pitch.pitch_call === 'StrikeSwinging') {
          color = 'red';
        } else if (pitch.pitch_call === 'BallCalled') {
          color = 'blue';
        } else if (pitch.pitch_call === 'InPlay') {
          color = 'green';
        }

        return (
          <mesh 
            key={pitch.pitch_uid || index} 
            position={[x, y, z]}
            onClick={() => onPitchClick?.(pitch)}
            onPointerOver={(e) => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              document.body.style.cursor = 'default';
            }}
          >
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
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

interface GameDayViewerProps {
  games: any[] // This is now seasons array
  selectedPitch?: any
  onPitchSelect?: (pitch: any) => void
  selectedPlateAppearance?: any
  pitcherCache?: { [key: string]: string }
  pitcherCacheLoaded?: boolean
}

// Pitch Metrics Panel Component
function PitchMetricsPanel({ pitch, pitcherCache }: { pitch: any; pitcherCache: { [key: string]: string } }) {
  // Get pitcher name directly from cache
  const pitcherName = pitch?.pitcher_id ? (pitcherCache[pitch.pitcher_id] || 'Unknown Pitcher') : 'Unknown Pitcher';

  if (!pitch) return null;

  const metrics = pitch.pitching_metrics || {};
  
  // Format values with appropriate units and decimal places
  const formatValue = (value: number | null | undefined, unit: string, decimals: number = 1): string => {
    if (value == null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)} ${unit}`;
  };

  return (
    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm max-w-xs">
      <div className="space-y-2">
        {/* Pitcher Name */}
        <div className="font-bold text-base text-orange-400 border-b border-gray-600 pb-2">
          {pitcherName}
        </div>
        
        {/* Pitch Type */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Pitch Type</span>
          <span className="font-semibold">{pitch.auto_pitch_type || pitch.tagged_pitch_type || 'Unknown'}</span>
        </div>

        {/* Velocity */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Velocity</span>
          <span className="font-semibold">{formatValue(metrics.rel_speed, 'mph')}</span>
        </div>

        {/* Spin Rate */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Spin Rate</span>
          <span className="font-semibold">{formatValue(metrics.spin_rate, 'rpm', 0)}</span>
        </div>

        {/* Induced VB */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Induced VB</span>
          <span className="font-semibold">{formatValue(metrics.induced_vert_break, '"')}</span>
        </div>

        {/* Horizontal Break */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Horizontal Break</span>
          <span className="font-semibold">{formatValue(metrics.horz_break, '"')}</span>
        </div>

        {/* Spin Axis */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Spin Axis</span>
          <span className="font-semibold">{formatValue(metrics.spin_axis, '°')}</span>
        </div>

        {/* Extension */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Extension</span>
          <span className="font-semibold">{formatValue(metrics.extension, 'ft')}</span>
        </div>

        {/* Rel Height */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Rel Height</span>
          <span className="font-semibold">{formatValue(metrics.rel_height, 'ft')}</span>
        </div>

        {/* Rel Side */}
        <div className="grid grid-cols-2 gap-x-2">
          <span className="text-gray-300">Rel Side</span>
          <span className="font-semibold">{formatValue(metrics.rel_side, 'ft')}</span>
        </div>
      </div>
    </div>
  );
}

export default function GameDayViewer({ games, selectedPitch, onPitchSelect, selectedPlateAppearance, pitcherCache = {}, pitcherCacheLoaded = false }: GameDayViewerProps) {
  const [isCameraLocked, setIsCameraLocked] = useState(false);
  const [localSelectedPitch, setLocalSelectedPitch] = useState<any>(null);
  const [maintainCatcherView, setMaintainCatcherView] = useState(false);

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

  // Helper function to get pitch locations for the selected plate appearance
  const getPitchLocationsForPlateAppearance = () => {
    if (!selectedPlateAppearance || !selectedPlateAppearance.lastPitch) return []
    
    // Find the plate appearance that matches the selected one
    const plateAppearance = games
      .flatMap((season: any) => season.games || [])
      .flatMap((game: any) => game.innings || [])
      .flatMap((inning: any) => inning.plate_appearances || [])
      .find((pa: any) => 
        pa.pa_of_inning === selectedPlateAppearance.pa_of_inning &&
        pa.pitches?.some((pitch: any) => 
          pitch.inning === selectedPlateAppearance.inning &&
          pitch.top_bottom === selectedPlateAppearance.top_bottom
        )
      )

    if (!plateAppearance || !plateAppearance.pitches) return []

    // Get all pitches from this plate appearance
    return plateAppearance.pitches.map((pitch: any) => {
      // Extract plate location data from pitching_metrics
      const plateLocHeight = pitch.pitching_metrics?.plate_loc_height || 0
      const plateLocSide = pitch.pitching_metrics?.plate_loc_side || 0
      
      return {
        pitch_uid: pitch.pitch_uid,
        plate_loc_height: plateLocHeight,
        plate_loc_side: plateLocSide,
        pitch_call: pitch.pitch_call,
        tagged_pitch_type: pitch.tagged_pitch_type,
        pitch_no: pitch.pitch_no,
        // Apply the zoneTransformMatrix to get 3D coordinates
        x: -plateLocSide,
        y: 0,
        z: plateLocHeight
      }
    })
  }

  const pitches = getAllPitches(games);
  const validPoints = getValidLandingPoints(pitches);
  const selectedPitchLocations = getPitchLocationsForPlateAppearance();

  // Function to find the full pitch data when a pitch location is clicked
  const findPitchData = (pitchLocation: any) => {
    // Find the plate appearance that contains this pitch
    const plateAppearance = games
      .flatMap((season: any) => season.games || [])
      .flatMap((game: any) => game.innings || [])
      .flatMap((inning: any) => inning.plate_appearances || [])
      .find((pa: any) => 
        pa.pa_of_inning === selectedPlateAppearance?.pa_of_inning &&
        pa.pitches?.some((pitch: any) => 
          pitch.inning === selectedPlateAppearance?.inning &&
          pitch.top_bottom === selectedPlateAppearance?.top_bottom
        )
      )

    if (!plateAppearance || !plateAppearance.pitches) return null;

    // Find the specific pitch by pitch_uid
    return plateAppearance.pitches.find((pitch: any) => pitch.pitch_uid === pitchLocation.pitch_uid);
  };

  // Handle pitch location click
  const handlePitchLocationClick = (pitchLocation: any) => {
    const fullPitchData = findPitchData(pitchLocation);
    if (fullPitchData) {
      setLocalSelectedPitch(fullPitchData);
      onPitchSelect?.(fullPitchData);
    }
  };

  // Use local selected pitch if available, otherwise use prop
  // Sync with parent: if parent changes selectedPitch, update local
  useEffect(() => {
    if (selectedPitch) {
      setLocalSelectedPitch(selectedPitch)
      // If we're maintaining Catcher's View, ensure camera stays there
      if (maintainCatcherView) {
        // Small delay to ensure the component has updated
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).setCatcherView) {
            (window as any).setCatcherView();
          }
        }, 50);
      }
    } else {
      setLocalSelectedPitch(null)
    }
  }, [selectedPitch, maintainCatcherView])

  const currentSelectedPitch = localSelectedPitch || selectedPitch;

  return (
    <div className="flex flex-col items-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl shadow-lg p-4 flex-1 min-h-[60vh] w-full">
      <div className="relative w-full h-[60vh] rounded-lg overflow-hidden">
        <Canvas camera={{ position: [0, 60, 120], fov: 40 }} shadows style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[0, 100, 100]} intensity={1.2} castShadow />
          <Suspense fallback={null}>
            <BaseballFieldFBX url="/BaseballField.fbx" />
            <StrikeZone3D />
            <PitchLocations3D 
              pitchLocations={selectedPitchLocations} 
              onPitchClick={handlePitchLocationClick}
            />
            {currentSelectedPitch && (
              <>
                <PitchTrajectory3D pitch={currentSelectedPitch} highlight={true} />
                <HitTrajectory3D pitch={currentSelectedPitch} highlight={true} />
                <AnimatedBall pitch={currentSelectedPitch} isAnimating={!!currentSelectedPitch} />
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
            onCatcherView={() => {
              setIsCameraLocked(true);
              setMaintainCatcherView(true);
            }} 
            onDefaultView={() => {
              setIsCameraLocked(false);
              setMaintainCatcherView(false);
            }} 
          />
        </Canvas>
        
        {/* Pitch Metrics Panel - positioned in top left corner */}
        {currentSelectedPitch && pitcherCacheLoaded && (
          <PitchMetricsPanel pitch={currentSelectedPitch} pitcherCache={pitcherCache} />
        )}
        
        {/* Camera Control Buttons - positioned outside Canvas */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {currentSelectedPitch && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white text-gray-800 border-gray-300 shadow-lg"
              onClick={() => {
                setLocalSelectedPitch(null);
                onPitchSelect?.(null);
                setMaintainCatcherView(false);
              }}
            >
              Clear Selection
            </Button>
          )}
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
              setMaintainCatcherView(true);
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
              setMaintainCatcherView(false);
            }}
          >
            Default
          </Button>
        </div>
      </div>
      <span className="mt-2 text-xs text-gray-200 font-semibold tracking-wide">3D Game Day Viewer</span>
    </div>
  );
}
