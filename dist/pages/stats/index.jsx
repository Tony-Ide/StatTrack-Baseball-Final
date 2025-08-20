"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StatsPage;
const react_1 = require("react");
const router_1 = require("next/router");
const Layout_1 = __importDefault(require("@/components/Layout"));
const PlayerStats_1 = __importDefault(require("@/components/PlayerStats"));
function StatsPage() {
    const router = (0, router_1.useRouter)();
    const [playerData, setPlayerData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetch("/routes/auth-check", { credentials: "include" })
            .then(res => {
            if (!res.ok) {
                router.push("/login");
                return null;
            }
            return res.json();
        })
            .then(() => {
            const playerName = localStorage.getItem("selectedPlayerName");
            const playerType = localStorage.getItem("selectedPlayerType");
            const team = localStorage.getItem("selectedTeam");
            if (!playerName || !playerType || !team) {
                router.push("/players");
                return;
            }
            setPlayerData({
                name: playerName,
                type: playerType,
                team: team,
            });
            setLoading(false);
        });
    }, [router]);
    const handleBack = () => {
        router.push("/players");
    };
    if (loading) {
        return <div>Loading...</div>;
    }
    if (!playerData) {
        return <div>Loading...</div>;
    }
    return (<Layout_1.default showLogout>
      <PlayerStats_1.default playerName={playerData.name} playerType={playerData.type} team={playerData.team} onBack={handleBack}/>
    </Layout_1.default>);
}
