"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlayersPage;
const react_1 = require("react");
const router_1 = require("next/router");
const Layout_1 = __importDefault(require("@/components/Layout"));
const PlayerSelection_1 = __importDefault(require("@/components/PlayerSelection"));
function PlayersPage() {
    const router = (0, router_1.useRouter)();
    const [isAuthenticated, setIsAuthenticated] = (0, react_1.useState)(false);
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
            .then(data => {
            if (data && data.user) {
                setIsAuthenticated(true);
            }
            setLoading(false);
        });
    }, [router]);
    const handleBack = () => {
        router.push("/dashboard");
    };
    const handlePlayerSelect = (playerType, playerName, team = "UCI") => {
        // Store selected player data
        localStorage.setItem("selectedPlayerName", playerName);
        localStorage.setItem("selectedPlayerType", playerType);
        localStorage.setItem("selectedTeam", team);
        router.push("/stats");
    };
    if (loading) {
        return <div>Loading...</div>;
    }
    return (<Layout_1.default showLogout>
      <PlayerSelection_1.default onBack={handleBack} onPlayerSelect={handlePlayerSelect}/>
    </Layout_1.default>);
}
