"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterPage;
const router_1 = require("next/router");
const react_1 = require("react");
const AuthForm_1 = __importDefault(require("@/components/AuthForm"));
const Layout_1 = __importDefault(require("@/components/Layout"));
function RegisterPage() {
    const router = (0, router_1.useRouter)();
    const [teams, setTeams] = (0, react_1.useState)([]);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch("/routes/teams")
            .then((res) => res.json())
            .then((data) => setTeams(data.teams || []))
            .catch(() => setTeams([]));
    }, []);
    const handleAuth = (email, password, team) => __awaiter(this, void 0, void 0, function* () {
        setError(null);
        const res = yield fetch("/routes/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, team_id: team }),
        });
        if (res.ok) {
            router.push("/login");
        }
        else {
            const data = yield res.json();
            setError(data.error || "Registration failed");
        }
    });
    return (<Layout_1.default>
      <AuthForm_1.default onAuth={handleAuth} mode="register" teams={teams}/>
      {error && <div className="text-red-600 text-center mt-2">{error}</div>}
      <div className="text-center mt-4">
        <a href="/login" className="text-blue-600 hover:underline text-sm">Already have an account? Sign in</a>
      </div>
    </Layout_1.default>);
}
