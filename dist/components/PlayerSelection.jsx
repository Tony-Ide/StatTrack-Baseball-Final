"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlayerSelection;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const select_1 = require("@/components/ui/select");
const tabs_1 = require("@/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
// Mock data - in real app this would come from your API
const uciPitchers = ["John Smith", "Mike Johnson", "David Wilson", "Chris Brown"];
const uciHitters = ["Alex Davis", "Ryan Miller", "Jake Taylor", "Sam Anderson"];
const opponentTeams = ["UCLA Bruins", "USC Trojans", "Stanford Cardinal", "Cal Bears"];
const opponentPitchers = ["Tom Wilson", "Steve Garcia", "Matt Rodriguez", "Kevin Lee"];
const opponentHitters = ["Carlos Martinez", "Tony Johnson", "Luis Gonzalez", "Mark Thompson"];
function PlayerSelection({ onBack, onPlayerSelect }) {
    const [selectedTeamType, setSelectedTeamType] = (0, react_1.useState)(null);
    const [selectedOpponentTeam, setSelectedOpponentTeam] = (0, react_1.useState)("");
    const [selectedPlayerType, setSelectedPlayerType] = (0, react_1.useState)("pitchers");
    const [selectedPlayer, setSelectedPlayer] = (0, react_1.useState)("");
    const handlePlayerSelect = () => {
        if (selectedPlayer) {
            onPlayerSelect(selectedPlayerType, selectedPlayer, selectedTeamType === "opponent" ? selectedOpponentTeam : "UCI");
        }
    };
    const resetSelection = () => {
        setSelectedTeamType(null);
        setSelectedOpponentTeam("");
        setSelectedPlayer("");
    };
    return (<div className="space-y-6">
      <div className="flex items-center gap-4">
        <button_1.Button variant="outline" onClick={onBack}>
          <lucide_react_1.ArrowLeft className="w-4 h-4 mr-2"/>
          Back to Dashboard
        </button_1.Button>
        <h2 className="text-2xl font-bold text-gray-900">Player Statistics</h2>
      </div>

      {!selectedTeamType && (<div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <card_1.Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <card_1.CardHeader className="text-center">
              <card_1.CardTitle>UCI Players</card_1.CardTitle>
              <card_1.CardDescription>View statistics for UCI Anteaters players</card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <button_1.Button onClick={() => setSelectedTeamType("uci")} className="w-full">
                Select UCI Players
              </button_1.Button>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <card_1.CardHeader className="text-center">
              <card_1.CardTitle>Opponent Players</card_1.CardTitle>
              <card_1.CardDescription>View statistics for opposing team players</card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <button_1.Button onClick={() => setSelectedTeamType("opponent")} className="w-full" variant="outline">
                Select Opponent Players
              </button_1.Button>
            </card_1.CardContent>
          </card_1.Card>
        </div>)}

      {selectedTeamType && (<card_1.Card className="max-w-4xl mx-auto">
          <card_1.CardHeader>
            <div className="flex items-center justify-between">
              <card_1.CardTitle>{selectedTeamType === "uci" ? "UCI Players" : "Opponent Players"}</card_1.CardTitle>
              <button_1.Button variant="outline" onClick={resetSelection}>
                Change Team Type
              </button_1.Button>
            </div>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-6">
            {selectedTeamType === "opponent" && !selectedOpponentTeam && (<div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Opponent Team</label>
                <select_1.Select value={selectedOpponentTeam} onValueChange={setSelectedOpponentTeam}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue placeholder="Choose opponent team"/>
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    {opponentTeams.map((team) => (<select_1.SelectItem key={team} value={team}>
                        {team}
                      </select_1.SelectItem>))}
                  </select_1.SelectContent>
                </select_1.Select>
              </div>)}

            {(selectedTeamType === "uci" || selectedOpponentTeam) && (<tabs_1.Tabs value={selectedPlayerType} onValueChange={(value) => setSelectedPlayerType(value)}>
                <tabs_1.TabsList className="grid w-full grid-cols-2">
                  <tabs_1.TabsTrigger value="pitchers">Pitchers</tabs_1.TabsTrigger>
                  <tabs_1.TabsTrigger value="hitters">Hitters</tabs_1.TabsTrigger>
                </tabs_1.TabsList>

                <tabs_1.TabsContent value="pitchers" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Pitcher</label>
                    <select_1.Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <select_1.SelectTrigger>
                        <select_1.SelectValue placeholder="Choose a pitcher"/>
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        {(selectedTeamType === "uci" ? uciPitchers : opponentPitchers).map((player) => (<select_1.SelectItem key={player} value={player}>
                            {player}
                          </select_1.SelectItem>))}
                      </select_1.SelectContent>
                    </select_1.Select>
                  </div>
                </tabs_1.TabsContent>

                <tabs_1.TabsContent value="hitters" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Hitter</label>
                    <select_1.Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <select_1.SelectTrigger>
                        <select_1.SelectValue placeholder="Choose a hitter"/>
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        {(selectedTeamType === "uci" ? uciHitters : opponentHitters).map((player) => (<select_1.SelectItem key={player} value={player}>
                            {player}
                          </select_1.SelectItem>))}
                      </select_1.SelectContent>
                    </select_1.Select>
                  </div>
                </tabs_1.TabsContent>
              </tabs_1.Tabs>)}

            {selectedPlayer && (<div className="pt-4">
                <button_1.Button onClick={handlePlayerSelect} className="w-full">
                  View {selectedPlayer}'s Stats
                </button_1.Button>
              </div>)}
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
