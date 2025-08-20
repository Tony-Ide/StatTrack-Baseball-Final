"use client";

import React, { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

// --- Simple Gaussian KDE utilities (no deps) ---
function gaussianKernel(u: number) {
  // standard normal pdf
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

function silvermanBandwidth(data: number[]) {
  // 1.06 * min(std, IQR/1.34) * n^(-1/5)
  const n = data.length;
  if (n < 2) return 1; // fallback
  const sorted = [...data].sort((a,b)=>a-b);
  const q1 = sorted[Math.floor(0.25*(n-1))];
  const q3 = sorted[Math.floor(0.75*(n-1))];
  const iqr = q3 - q1;
  const mean = sorted.reduce((s,v)=>s+v,0)/n;
  const variance = sorted.reduce((s,v)=>s+(v-mean)*(v-mean),0)/(n-1);
  const std = Math.sqrt(Math.max(variance, 0));
  const sigma = Math.min(std, iqr>0 ? iqr/1.34 : std || 1);
  return 1.06 * (sigma || 1) * Math.pow(n, -1/5);
}

function kdeEstimate(xs: number[], data: number[], bandwidth: number) {
  const n = data.length;
  if (!n || bandwidth <= 0) return xs.map(() => 0);
  return xs.map(x => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += gaussianKernel((x - data[i]) / bandwidth);
    }
    // kernel density estimate scaled by (n * h)
    return s / (n * bandwidth);
  });
}

interface PrintPitcherReportProps {
  pitcher: any;
  games: any[]; // [{ season, games: [{ game_id, date, home_team, away_team, innings:[...] }]}]
  onClose: () => void;
}

interface GameSelectionModalProps {
  pitcher: any;
  games: any[];
  onConfirm: (selectedSeason: string, selectedGames: string[]) => void;
  onCancel: () => void;
}

const pitchColors: Record<string, string> = {
  Fastball: "#0000FF",
  Curveball: "#FF0000",
  Slider: "#00FF00",
  Splitter: "#FFFF00",
  Changeup: "#800080",
  ChangeUp: "#800080",
  Cutter: "#FFC0CB",
  Sinker: "#FFA500",
};

// -------- Velocity KDE Component --------
type VelocityKDEProps = {
  pitchTypes: string[];
  pitchesByType: Record<string, any[]>;
  pitchColors: Record<string, string>;
  velocityRange: { min: number; max: number };
};

function VelocityKDE({ pitchTypes, pitchesByType, pitchColors, velocityRange }: VelocityKDEProps) {
  // build a fixed x-grid (samples across the range)
  const samples = 80;
  const min = velocityRange.min;
  const max = velocityRange.max;
  const span = Math.max(1, max - min);
  const xs = Array.from({ length: samples }, (_, i) => min + (i * span) / (samples - 1));

  return (
    <div className="space-y-2">
      {pitchTypes.map((t) => {
        const arr = pitchesByType[t];
        const speeds: number[] = arr.map((p) => p.pitching_metrics.rel_speed).filter((v: any) => Number.isFinite(v));
        const color = pitchColors[t] ?? "#000";
        if (!speeds.length) {
          return (
            <div key={t} className="flex items-center space-x-2">
              <div className="w-20 text-right text-xs font-medium">{t}</div>
              <div className="h-6 flex-1 rounded bg-gray-50" />
              <div className="w-12 text-xs text-gray-600">–</div>
            </div>
          );
        }

        // KDE
        let bandwidth = silvermanBandwidth(speeds);
        if (!Number.isFinite(bandwidth) || bandwidth <= 0) bandwidth = 1;
        const ys = kdeEstimate(xs, speeds, bandwidth);

        // normalize Y to [0..1] to fill nicely inside row height
        const ymax = Math.max(...ys) || 1;
        const yNorm = ys.map((y) => y / ymax);

        // mean line position
        const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const xMean = ((mean - min) / span) * 1000; // viewBox width

        // Build SVG path (viewBox 1000x100)
        const pathTop = xs.map((x, i) => {
          const xPx = ((x - min) / span) * 1000;
          const yPx = 100 - yNorm[i] * 100; // invert for SVG
          return `${i === 0 ? "M" : "L"} ${xPx.toFixed(2)} ${yPx.toFixed(2)}`;
        }).join(" ");

        const path = `${pathTop} L 1000 100 L 0 100 Z`;

        return (
          <div key={t} className="flex items-center space-x-2">
            <div className="w-20 text-right text-xs font-medium">{t}</div>
            <div className="relative h-12 flex-1 rounded bg-gray-50 overflow-hidden">
              <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="h-full w-full">
                <path d={path} fill={color} opacity={0.22} />
                <path d={pathTop} fill="none" stroke={color} strokeWidth={2} />
                {/* mean line */}
                <line x1={xMean} y1={0} x2={xMean} y2={100} stroke="black" strokeWidth={2} />
              </svg>
            </div>
            <div className="w-12 text-xs text-gray-600">{mean.toFixed(1)}</div>
          </div>
        );
      })}

      {/* X-axis ticks aligned to chart width (exclude left pitch type and right mean columns) */}
      <div className="mt-1 text-[10px] text-gray-500">
        <div className="relative h-4 ml-[5.5rem] mr-[3.5rem]">
          {Array.from({ length: 6 }, (_, i) => {
            const v = min + (i * span) / 5;
            const left = (i / 5) * 100; // 0..100 across chart area
            return (
              <span
                key={i}
                className="absolute"
                style={{ left: `${left}%`, transform: "translateX(-50%)" }}
              >
                {v.toFixed(0)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------- Game Selection Modal --------
function GameSelectionModal({
  pitcher,
  games,
  onConfirm,
  onCancel,
}: GameSelectionModalProps) {
  const [selectedSeason, setSelectedSeason] = React.useState<string>("");
  const [selectedGames, setSelectedGames] = React.useState<string[]>([]);

  const seasons = React.useMemo(() => {
    const set = new Set<string>();
    games.forEach((s: any) => s?.season && set.add(s.season));
    return Array.from(set).sort();
  }, [games]);

  const seasonGames = React.useMemo(() => {
    if (!selectedSeason) return [];
    const season = games.find((s: any) => s.season === selectedSeason);
    return season?.games || [];
  }, [selectedSeason, games]);

  const toggleGame = (gameId: string) =>
    setSelectedGames((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );

  const selectAll = () =>
    setSelectedGames(seasonGames.map((g: any) => g.game_id));

  const confirm = () => {
    if (selectedSeason && selectedGames.length > 0) {
      onConfirm(selectedSeason, selectedGames);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-96 overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-bold">Select Games for Report</h2>
          <p className="mb-4 text-sm text-gray-600">
            Choose the season and specific games to include in the pitcher report.
          </p>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                setSelectedGames([]);
              }}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a season</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {!!selectedSeason && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Games ({selectedGames.length} selected)
                </label>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2">
                {seasonGames.map((g: any) => (
                  <label key={g.game_id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedGames.includes(g.game_id)}
                      onChange={() => toggleGame(g.game_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {g.date} — {g.home_team} vs {g.away_team}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={!selectedSeason || selectedGames.length === 0}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- Main --------
export default function PrintPitcherReport({
  pitcher,
  games,
  onClose,
}: PrintPitcherReportProps) {
  const [showGameSelection, setShowGameSelection] = React.useState(true);
  const [selectedSeason, setSelectedSeason] = React.useState<string>("");
  const [filteredGames, setFilteredGames] = React.useState<any[]>([]);
  const printableRef = useRef<HTMLDivElement>(null);

  // Build helpers
  const getPitchesFromGames = (gamesArray: any[]): any[] => {
    const out: any[] = [];
    gamesArray?.forEach((g: any) =>
      g?.innings?.forEach((inn: any) =>
        inn?.plate_appearances?.forEach((pa: any) =>
          pa?.pitches?.forEach((p: any) => out.push(p))
        )
      )
    );
    return out;
  };

  const getSeasonGames = (season: string) => {
    const s = games.find((x: any) => x.season === season);
    return s?.games ?? [];
  };

  const handleGameSelection = (season: string, gameIds: string[]) => {
    setSelectedSeason(season);
    const seasonGames = getSeasonGames(season);
    const selectedGames = seasonGames.filter((g: any) => gameIds.includes(g.game_id));
    setFilteredGames(selectedGames);
    setShowGameSelection(false);
  };

  // --- Data scopes ---
  const selectedGamePitchesAll = useMemo(
    () => getPitchesFromGames(filteredGames),
    [filteredGames]
  );

  const seasonPitchesAll = useMemo(
    () => getPitchesFromGames(getSeasonGames(selectedSeason)),
    [selectedSeason, games]
  );

  // Filter by pitcher id
  const selectedGamePitches = useMemo(
    () => selectedGamePitchesAll.filter((p) => p.pitcher_id === pitcher?.player_id),
    [selectedGamePitchesAll, pitcher?.player_id]
  );
  const seasonPitches = useMemo(
    () => seasonPitchesAll.filter((p) => p.pitcher_id === pitcher?.player_id),
    [seasonPitchesAll, pitcher?.player_id]
  );

  // Validity guards
  const validPitches = useMemo(() => {
    return selectedGamePitches.filter((p: any) => {
      const pm = p?.pitching_metrics;
      return (
        pm &&
        p?.auto_pitch_type &&
        pm.rel_speed != null &&
        pm.induced_vert_break != null &&
        pm.horz_break != null &&
        pm.spin_rate != null &&
        pm.spin_axis != null
      );
    });
  }, [selectedGamePitches]);

  const validSeasonPitches = useMemo(() => {
    return seasonPitches.filter((p: any) => p?.pitching_metrics && p?.auto_pitch_type);
  }, [seasonPitches]);

  // Pitches used for rate stats (Whiff%, Zone%, Chase%) – now scoped to selected games only
  const rateStatPitches = useMemo(() => {
    return selectedGamePitches.filter((p: any) => p?.pitching_metrics && p?.auto_pitch_type);
  }, [selectedGamePitches]);

  // Group by pitch type (selected games only)
  const pitchesByType = useMemo(() => {
    const g: Record<string, any[]> = {};
    validPitches.forEach((p: any) => {
      const t = p.auto_pitch_type;
      if (!g[t]) g[t] = [];
      g[t].push(p);
    });
    return g;
  }, [validPitches]);

  const pitchTypes = useMemo(
    () =>
      Object.entries(pitchesByType)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([t]) => t),
    [pitchesByType]
  );

  // Ranges (selected games)
  const velocityRange = useMemo(() => {
    const speeds = validPitches.map((p: any) => p.pitching_metrics.rel_speed);
    if (speeds.length === 0) return { min: 0, max: 1 };
    const min = Math.floor(Math.min(...speeds) / 5) * 5;
    const max = Math.ceil(Math.max(...speeds) / 5) * 5 || min + 1;
    return { min, max };
  }, [validPitches]);

  const handlePrint = useReactToPrint({
    contentRef: printableRef,
    pageStyle: `
      @page { size: auto; margin: 12mm; }
      @media print {
        html, body { background: white !important; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        .no-print { display: none !important; }
      }
    `,
  });

  if (showGameSelection) {
    return (
      <GameSelectionModal
        pitcher={pitcher}
        games={games}
        onConfirm={handleGameSelection}
        onCancel={onClose}
      />
    );
  }

  // Season-level helpers for Zone/Chase based on plate_loc coords
  const isInZone = (p: any) => {
    const side = p?.pitching_metrics?.plate_loc_side;
    const height = p?.pitching_metrics?.plate_loc_height;
    if (side == null || height == null) return false;
    return side >= -0.83 && side <= 0.83 && height >= 1.5 && height <= 3.5;
  };
  const swingCalls = new Set([
    "InPlay",
    "StrikeSwinging",
    "FoulBallNotFieldable",
    "FoulBallFieldable",
  ]);

  // --- Build table rows ---
  const totalPitches = validPitches.length || 1;
  const tableRows = pitchTypes.map((type) => {
    const arr = pitchesByType[type];
    const count = arr.length;

    // Selected-games averages
    const avg = (pick: (p: any) => number) =>
      count ? arr.reduce((s, p) => s + pick(p), 0) / count : 0;

    const avgVelocity = avg((p) => p.pitching_metrics.rel_speed);
    const avgIVB = avg((p) => p.pitching_metrics.induced_vert_break);
    const avgHB = avg((p) => p.pitching_metrics.horz_break);
    const avgVAA = avg((p) => p.pitching_metrics.vert_appr_angle ?? 0);
    const avgSpinRate = avg((p) => p.pitching_metrics.spin_rate);
    const avgSpinAxis = avg((p) => p.pitching_metrics.spin_axis);
    const avgRelHeight = avg((p) => p.pitching_metrics.rel_height ?? 0);
    const avgRelSide = avg((p) => p.pitching_metrics.rel_side ?? 0);
    const avgExt = avg((p) => p.pitching_metrics.extension ?? 0);

    // Rate stats (Whiff%, Zone%, Chase%) now computed from selected games only
    const selectedByType = rateStatPitches.filter((p) => p.auto_pitch_type === type);
    const selectedSwings = selectedByType.filter((p) => swingCalls.has(p.pitch_call)).length;
    const selectedWhiffs = selectedByType.filter((p) => p.pitch_call === "StrikeSwinging").length;
    const whiffPercent = selectedSwings ? (selectedWhiffs / selectedSwings) * 100 : 0;

    const selectedZone = selectedByType.filter(isInZone).length;
    const zonePercent = selectedByType.length ? (selectedZone / selectedByType.length) * 100 : 0;

    const selectedOZ = selectedByType.filter((p) => !isInZone(p));
    const selectedOZSwings = selectedOZ.filter((p) => swingCalls.has(p.pitch_call)).length;
    const chasePercent = selectedOZ.length ? (selectedOZSwings / selectedOZ.length) * 100 : 0;

    return {
      pitchType: type,
      count,
      pitchPercent: (count / totalPitches) * 100,
      avgVelocity,
      avgIVB,
      avgHB,
      avgVAA,
      avgSpinRate,
      avgSpinAxis,
      avgRelHeight,
      avgRelSide,
      avgExt,
      whiffPercent,
      zonePercent,
      chasePercent,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-white print:static">
      <div className="h-5/6 w-11/12 overflow-auto rounded-lg bg-white shadow-xl print:h-auto print:w-full print:rounded-none print:shadow-none">
        {/* Controls (won't print because .no-print) */}
        <div className="no-print flex justify-end space-x-2 p-4">
          <Button onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Printable content */}
        <div ref={printableRef} className="p-6 print:p-5 printable-report">
          {/* Spacer Row */}
          <div className="h-8 print:h-4" />

          {/* Title + Table */}
          <div className="avoid-break mb-8 print:mb-6">
            <h1 className="mb-6 text-center text-4xl font-bold text-gray-900 print:mb-6 print:text-3xl">
              {pitcher?.name},{" "}
              {pitcher?.throws === "Right" ? "RHP" : pitcher?.throws === "Left" ? "LHP" : ""}
            </h1>
            
            {/* Game Dates */}
            <div className="mb-4 text-center text-sm text-gray-600 print:mb-3 print:text-xs">
              <p className="font-medium">Selected Games:</p>
              <p className="mt-1">
                {filteredGames.length > 0 ? (
                  filteredGames.map((game, index) => (
                    <span key={game.game_id}>
                      {game.date}
                      {index < filteredGames.length - 1 ? ", " : ""}
                    </span>
                  ))
                ) : (
                  "No games selected"
                )}
              </p>
            </div>

            <div className="overflow-x-auto rounded border border-gray-300 print:border-2 print:border-gray-800 print:overflow-visible">
              <table className="w-full text-sm min-w-[1200px] print:min-w-full print:border-collapse print:text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    {[
                      "Pitch",
                      "Count",
                      "Pitch%",
                      "Velo",
                      "iVB",
                      "HB",
                      "VAA",
                      "SpinRate",
                      "SpinAxis",
                      "RelHeight",
                      "RelSide",
                      "Ext",
                      "Whiff%",
                      "Zone%",
                      "Chase%",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-center font-bold whitespace-nowrap ${
                          i < 14 ? "border-r border-gray-300" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const c = pitchColors[row.pitchType] ?? "#000";
                    return (
                      <tr key={row.pitchType} className="border-b border-gray-200">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-left text-black"
                            style={{ color: c }}>
                          {row.pitchType}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.pitchPercent.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-center">{row.avgVelocity.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{row.avgIVB.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{row.avgHB.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{row.avgVAA.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{row.avgSpinRate.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{row.avgSpinAxis.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{row.avgRelHeight.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{row.avgRelSide.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{row.avgExt.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{row.whiffPercent.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{row.zonePercent.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">{row.chasePercent.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graphs Layout: Left side (2 rows) + Right side (1 large graph) */}
          <div className="grid grid-cols-2 gap-6 print:gap-4">
            {/* Left Column: Velocity Distribution (top) + Spin Axis (bottom) */}
            <div className="flex flex-col space-y-6 print:space-y-4">
              {/* Velocity Distribution */}
              <div className="avoid-break h-auto print:h-auto">
                <div className="h-full rounded border border-gray-300 p-4 print:border-2 print:border-gray-800 print:p-2">
                  <h2 className="mb-4 text-lg font-bold print:mb-2 print:text-sm">
                    Pitch Velocity Distribution
                  </h2>

                  {pitchTypes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      No pitches in selected games.
                    </div>
                  ) : (
                    <VelocityKDE
                      pitchTypes={pitchTypes}
                      pitchesByType={pitchesByType}
                      pitchColors={pitchColors}
                      velocityRange={velocityRange}
                    />
                  )}
                </div>
              </div>

              {/* Spin Axis Plot */}
              <div className="avoid-break h-80 print:h-72">
                <div className="h-full rounded border border-gray-300 p-4 print:border-2 print:border-gray-800 print:p-2 relative">
                  <h2 className="absolute left-4 top-4 z-10 text-lg font-bold print:left-2 print:top-2 print:text-sm">Spin Axis Plot</h2>
                  <div className="absolute inset-0 p-4 print:p-2 flex items-center justify-center">
                    <div className="relative h-[100%] aspect-square w-auto max-w-[100%] overflow-hidden">
                      {/* circle with internal padding */}
                      <div className="absolute rounded-full border-2 border-gray-300" style={{ left: '6%', top: '6%', right: '6%', bottom: '6%' }} />
                      {/* angle markers (every 30°) */}
                      {Array.from({ length: 12 }, (_, i) => {
                        const angle = (i * 30 + 180) % 360;
                        const x = 50 + 42 * Math.cos(((angle - 90) * Math.PI) / 180);
                        const y = 50 + 42 * Math.sin(((angle - 90) * Math.PI) / 180);
                        return (
                          <div
                            key={i}
                            className="absolute h-1 w-1 -translate-x-0.5 -translate-y-0.5 rounded-full bg-gray-400"
                            style={{ left: `${x}%`, top: `${y}%` }}
                          />
                        );
                      })}
                      {/* labels */}
                      {Array.from({ length: 12 }, (_, i) => {
                        const a = (i * 30 + 180) % 360;
                        const label = (a + 180) % 360;
                        const x = 50 + 46 * Math.cos(((a - 90) * Math.PI) / 180);
                        const y = 50 + 46 * Math.sin(((a - 90) * Math.PI) / 180);
                        return (
                          <div
                            key={i}
                            className="absolute -translate-x-1/2 -translate-y-1/2 text-xs text-gray-600"
                            style={{ left: `${x}%`, top: `${y}%` }}
                          >
                            {label}°
                          </div>
                        );
                      })}
                      {/* points */}
                      {validPitches.map((p: any, idx: number) => {
                        const axis = (p.pitching_metrics.spin_axis + 180) % 360;
                        let x = 50 + 38 * Math.cos(((axis - 90) * Math.PI) / 180);
                        let y = 50 + 38 * Math.sin(((axis - 90) * Math.PI) / 180);
                        x = Math.max(4, Math.min(96, x));
                        y = Math.max(4, Math.min(96, y));
                        const c = pitchColors[p.auto_pitch_type] ?? "#000";
                        return (
                          <div
                            key={idx}
                            className="absolute h-2 w-2 -translate-x-1 -translate-y-1 rounded-full border border-white"
                            style={{ left: `${x}%`, top: `${y}%`, backgroundColor: c }}
                          />
                        );
                      })}
                      {/* center */}
                      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1 rounded-full bg-gray-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pitch Movement Plot (takes up both rows) */}
            <div className="avoid-break h-full print:h-auto">
              <div className="h-full rounded border border-gray-300 p-4 print:border-2 print:border-gray-800 print:p-2">
                <h2 className="mb-4 text-lg font-bold print:mb-2 print:text-sm">Pitch Breaks</h2>
                <div className="relative w-full rounded border border-gray-300 overflow-hidden" style={{ aspectRatio: "1" }}>
                  {/* normal graphing grid: light lines every 10% */}
                  {Array.from({ length: 9 }, (_, i) => {
                    const pct = (i + 1) * 10; // 10..90
                    return (
                      <React.Fragment key={`grid-${pct}`}> 
                        {/* vertical line */}
                        <div className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: `${pct}%` }} />
                        {/* horizontal line */}
                        <div className="absolute left-0 right-0 h-px bg-gray-200" style={{ top: `${pct}%` }} />
                      </React.Fragment>
                    );
                  })}
                  {/* axes */}
                  <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-px bg-gray-400" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px bg-gray-400" />

                  {/* points */}
                  {validPitches.map((p: any, idx: number) => {
                    const pm = p.pitching_metrics;
                    // Range ±25 in, mapped to 0..100%
                    let x = ((pm.horz_break + 25) / 50) * 100;
                    let y = ((pm.induced_vert_break + 25) / 50) * 100;
                    x = Math.max(1, Math.min(99, x));
                    y = Math.max(1, Math.min(99, y));
                    const c = pitchColors[p.auto_pitch_type] ?? "#000";
                    return (
                      <div
                        key={idx}
                        className="absolute h-2 w-2 -translate-x-1 -translate-y-1 rounded-full border border-white"
                        style={{ left: `${x}%`, top: `${100 - y}%`, backgroundColor: c }}
                      />
                    );
                  })}

                  {/* axis titles at actual axes (y=center, x=center); y not rotated */}
                  <div
                    className="absolute text-xs text-gray-600"
                    style={{ left: "50%", bottom: "10px", transform: "translateX(-50%)" }}
                  >
                    Horizontal Break (in)
                  </div>
                  <div
                    className="absolute text-xs text-gray-600"
                    style={{ left: "-50px", top: "50%", transform: "translateY(-50%) rotate(-90deg)" }}
                  >
                    Induced Vertical Break (in)
                  </div>

                  {/* ticks aligned to grid lines, drawn on the central axes; skip labeling 0 on both axes */}
                  {Array.from({ length: 11 }, (_, i) => {
                    const v = -25 + i * 5;
                    const xPct = (i / 10) * 100;
                    const yPct = (i / 10) * 100;
                    const isCenter = i === 5;
                    // Helpers to avoid label overflow at left/right extremes
                    const xLabelStyle =
                      i === 0
                        ? { left: `0%`, top: `calc(50% + 6px)`, transform: "translateX(0)" }
                        : i === 10
                        ? { left: `100%`, top: `calc(50% + 6px)`, transform: "translateX(-100%)" }
                        : { left: `${xPct}%`, top: `calc(50% + 6px)`, transform: "translateX(-50%)" };
                    return (
                      <React.Fragment key={`tick-${i}`}>
                        {/* x-axis ticks on center horizontal axis */}
                        <div
                          className="absolute w-[2px] h-3 bg-gray-400"
                          style={{ left: `${xPct}%`, top: "calc(50% - 1.5px)" }}
                        />
                        {!(isCenter || i === 0 || i === 10) && (
                          <div className="absolute text-[10px] text-gray-600" style={xLabelStyle as any}>
                            {v}
                          </div>
                        )}
                        {/* y-axis ticks on center vertical axis */}
                        <div
                          className="absolute h-[2px] w-3 bg-gray-400"
                          style={{ left: "calc(50% - 1.5px)", top: `${100 - yPct}%` }}
                        />
                        {!(isCenter || i === 0 || i === 10) && (
                          <div
                            className="absolute text-[10px] text-gray-600"
                            style={{ left: "calc(50% + 6px)", top: `${100 - yPct}%`, transform: "translateY(-50%)" }}
                          >
                            {v}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Global Print Styles */}
          <style jsx global>{`
            @media print {
              * { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              body { 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important; 
                font-size: 12px !important; 
              }
              .no-print { 
                display: none !important; 
              }
              .avoid-break { 
                break-inside: avoid; 
                page-break-inside: avoid; 
              }
              /* Compact the stats table and make font responsive to page width */
              .printable-report table { 
                width: 100% !important; 
                table-layout: fixed !important; 
                font-size: clamp(8px, 0.85vw, 11px) !important; 
              }
              .printable-report th, .printable-report td { 
                padding: 0.25em 0.4em !important; 
                line-height: 1.15 !important;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
