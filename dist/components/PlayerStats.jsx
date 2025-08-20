"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlayerStats;
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
// Mock stats data - in real app this would come from TrackMan API
const mockPitcherStats = {
    "Velocity (mph)": "92.5",
    "Spin Rate (rpm)": "2,450",
    "Strike %": "65.2%",
    "Whiff %": "28.7%",
    "Ground Ball %": "45.3%",
    "Fly Ball %": "32.1%",
    "Line Drive %": "22.6%",
    ERA: "3.45",
};
const mockHitterStats = {
    "Exit Velocity (mph)": "89.3",
    "Launch Angle (°)": "12.5",
    "Hard Hit %": "42.8%",
    "Barrel %": "8.9%",
    "Sweet Spot %": "35.2%",
    "Ground Ball %": "38.7%",
    "Fly Ball %": "35.4%",
    "Line Drive %": "25.9%",
    "Batting Average": ".285",
};
function PlayerStats({ playerName, playerType, team, onBack }) {
    const stats = playerType === "pitchers" ? mockPitcherStats : mockHitterStats;
    return (<div className="space-y-6">
      <div className="flex items-center gap-4">
        <button_1.Button variant="outline" onClick={onBack}>
          <lucide_react_1.ArrowLeft className="w-4 h-4 mr-2"/>
          Back to Player Selection
        </button_1.Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{playerName}</h2>
          <p className="text-gray-600">
            {team} • {playerType === "pitchers" ? "Pitcher" : "Hitter"}
          </p>
        </div>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>TrackMan Statistics</card_1.CardTitle>
          <card_1.CardDescription>Latest performance metrics and analytics</card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats).map(([metric, value]) => (<div key={metric} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-600 mb-1">{metric}</div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </div>))}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Recent Performance Trends</card_1.CardTitle>
          <card_1.CardDescription>Performance analysis over the last 10 games</card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Performance charts and trends will be displayed here</p>
            <p className="text-sm mt-2">Integration with TrackMan data visualization coming soon</p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
