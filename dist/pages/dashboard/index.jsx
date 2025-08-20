"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const react_1 = require("react");
const router_1 = require("next/router");
const Layout_1 = __importDefault(require("@/components/Layout"));
const WelcomeScreen_1 = __importDefault(require("@/components/WelcomeScreen"));
function DashboardPage() {
    const router = (0, router_1.useRouter)();
    const [userEmail, setUserEmail] = (0, react_1.useState)("");
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
            if (data && data.user && data.user.email) {
                setUserEmail(data.user.email);
            }
            setLoading(false);
        });
    }, [router]);
    const handleNavigate = (section) => {
        if (section === "players") {
            router.push("/players");
        }
        // "games" coming soon
    };
    if (loading) {
        return <div>Loading...</div>;
    }
    return (<Layout_1.default showLogout>
      <WelcomeScreen_1.default userEmail={userEmail} onNavigate={handleNavigate}/>
    </Layout_1.default>);
}
