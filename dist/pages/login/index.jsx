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
exports.default = LoginPage;
const router_1 = require("next/router");
const react_1 = require("react");
const AuthForm_1 = __importDefault(require("@/components/AuthForm"));
const Layout_1 = __importDefault(require("@/components/Layout"));
function LoginPage() {
    const router = (0, router_1.useRouter)();
    const [error, setError] = (0, react_1.useState)(null);
    const handleAuth = (email, password) => __awaiter(this, void 0, void 0, function* () {
        setError(null);
        const res = yield fetch("/routes/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include", // ensure cookies are sent/received
        });
        if (res.ok) {
            // Optionally, verify auth-check before redirecting
            const check = yield fetch("/routes/auth-check", { credentials: "include" });
            if (check.ok) {
                router.push("/dashboard");
            }
            else {
                setError("Login failed: could not verify session.");
            }
        }
        else {
            const data = yield res.json();
            setError(data.error || "Login failed");
        }
    });
    return (<Layout_1.default>
      <AuthForm_1.default onAuth={handleAuth} mode="login"/>
      {error && <div className="text-red-600 text-center mt-2">{error}</div>}
      <div className="text-center mt-4">
        <a href="/register" className="text-blue-600 hover:underline text-sm">Don't have an account? Sign up</a>
      </div>
    </Layout_1.default>);
}
