"use client"

import React, { useMemo } from "react"

interface HeatmapStrikeZoneProps {
  title?: string
  className?: string
  data?: { plate_loc_side: number, plate_loc_height: number }[]
}

export default function HeatmapStrikeZone({ title = "Strike Zone Heatmap", className = "", data = [] }: HeatmapStrikeZoneProps) {
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

  // KDE parameters
  const bandwidth = 0.18; // adjust for smoothness
  const gridSize = 40; // number of grid cells per axis

  // Compute KDE grid
  const kdeGrid = useMemo(() => {
    if (!data.length) return [];
    const xMin = X_MIN, xMax = X_MAX, yMin = Z_MIN, yMax = Z_MAX;
    const xStep = (xMax - xMin) / gridSize;
    const yStep = (yMax - yMin) / gridSize;
    const grid = [];
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const x = xMin + gx * xStep + xStep / 2;
        const y = yMin + gy * yStep + yStep / 2;
        // KDE sum
        let density = 0;
        for (const d of data) {
          const dx = (x - d.plate_loc_side) / bandwidth;
          const dy = (y - d.plate_loc_height) / bandwidth;
          density += Math.exp(-0.5 * (dx * dx + dy * dy));
        }
        grid.push({ x, y, density });
      }
    }
    // Normalize
    const maxDensity = Math.max(...grid.map(g => g.density));
    return grid.map(g => ({ ...g, density: g.density / (maxDensity || 1) }));
  }, [data]);

  // Color scale (blue = low, red = high)
  function getColor(density: number) {
    const r = Math.round(255 * density);
    const b = Math.round(255 * (1 - density));
    return `rgba(${r},0,${b},${density * 0.7})`;
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg shadow border p-4 flex flex-col items-center">
        <svg width="400" height="500" className="rounded-lg" style={{ background: "#f3f4f6" }}>
          {/* Home plate - 3x bigger (rendered first so heatmap appears on top) */}
          <polygon points="200,485 155,455 155,410 245,410 245,455" fill="#fff" stroke="#ccc" strokeWidth="2" />
          {/* KDE Heatmap */}
          {kdeGrid.map((g, i) => {
            // Convert to SVG coordinates
            const { x, y } = g;
            const svgX = ((-x - X_MIN) / (X_MAX - X_MIN)) * SVG_SIZE_X;
            const svgY = SVG_SIZE_Y - ((y - Z_MIN) / (Z_MAX - Z_MIN)) * SVG_SIZE_Y;
            return (
              <rect
                key={i}
                x={svgX - 5}
                y={svgY - 5}
                width={10}
                height={10}
                fill={getColor(g.density)}
                stroke="none"
              />
            );
          })}
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
        </svg>
      </div>
      {/* Placeholder for heatmap legend */}
      <div className="mt-4 space-y-2">
        <div className="text-sm text-gray-600 font-semibold">{title}:</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-gray-700">KDE heatmap of whiffs</span>
          </div>
        </div>
      </div>
    </div>
  )
} 