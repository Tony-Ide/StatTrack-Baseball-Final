"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthForm;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const select_1 = require("@/components/ui/select");
function AuthForm({ onAuth, mode, teams = [] }) {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [team, setTeam] = (0, react_1.useState)("");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === "register" && (!email || !password || !team))
            return;
        if (mode === "login" && (!email || !password))
            return;
        onAuth(email, password, mode === "register" ? team : undefined);
    };
    return (<div className="flex items-center justify-center min-h-[80vh]">
      <card_1.Card className="w-full max-w-md">
        <card_1.CardHeader className="text-center">
          <card_1.CardTitle className="text-2xl">{mode === "login" ? "Sign In" : "Sign Up"}</card_1.CardTitle>
          <card_1.CardDescription>
            {mode === "login"
            ? "Welcome back to UCI Baseball Stats"
            : "Create your account to access baseball stats"}
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input_1.Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required/>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input_1.Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required/>
            </div>

            {mode === "register" && (<div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                Team
              </label>
              <select_1.Select value={team} onValueChange={setTeam} required>
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="Select your team"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                    {teams.map((t) => (<select_1.SelectItem key={t.team_id} value={t.team_id}>{t.name}</select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>)}

            <button_1.Button type="submit" className="w-full">
              {mode === "login" ? "Sign In" : "Sign Up"}
            </button_1.Button>
          </form>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
