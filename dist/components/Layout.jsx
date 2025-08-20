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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Layout;
const router_1 = require("next/router");
function Layout({ children, showLogout }) {
    const router = (0, router_1.useRouter)();
    const handleLogout = () => __awaiter(this, void 0, void 0, function* () {
        yield fetch("/routes/logout", { method: "POST", credentials: "include" });
        router.push("/login");
    });
    return (<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-center py-5">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 select-none">StatTrack Baseball</h1>
            {showLogout && (<button onClick={handleLogout} className="px-5 py-2 rounded-lg bg-gray-900 text-white font-semibold shadow hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
                Log Out
              </button>)}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-8">
        <div className="rounded-2xl bg-white/90 shadow-lg p-8 border border-gray-100">
          {children}
        </div>
      </main>
    </div>);
}
