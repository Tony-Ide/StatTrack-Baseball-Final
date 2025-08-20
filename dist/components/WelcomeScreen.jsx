"use strict";
"use client";
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
exports.default = WelcomeScreen;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
function WelcomeScreen({ userEmail, onNavigate }) {
    const fileInputRef = (0, react_1.useRef)(null);
    const [uploading, setUploading] = (0, react_1.useState)(false);
    const [message, setMessage] = (0, react_1.useState)(null);
    const handleImport = (e) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        e.preventDefault();
        setMessage(null);
        const file = (_b = (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b[0];
        if (!file) {
            setMessage("Please select a CSV file.");
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        const res = yield fetch("/routes/import-trackman", {
            method: "POST",
            body: formData,
            credentials: "include"
        });
        if (res.ok) {
            setMessage("File imported successfully!");
        }
        else {
            setMessage("Failed to import file.");
        }
        setUploading(false);
    });
    return (<div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600">Signed in as {userEmail}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <card_1.Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <card_1.CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <lucide_react_1.BarChart3 className="w-6 h-6 text-blue-600"/>
            </div>
            <card_1.CardTitle>View Past Games Stats</card_1.CardTitle>
            <card_1.CardDescription>Analyze performance data from previous games and matches</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <button_1.Button onClick={() => onNavigate("games")} className="w-full" variant="outline">
              Coming Soon
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <card_1.CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <lucide_react_1.Users className="w-6 h-6 text-green-600"/>
            </div>
            <card_1.CardTitle>View Players Stats</card_1.CardTitle>
            <card_1.CardDescription>Browse individual player statistics and performance metrics</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <button_1.Button onClick={() => onNavigate("players")} className="w-full">
              View Stats
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <div className="max-w-2xl mx-auto mt-8">
        <card_1.Card className="border-dashed border-2 border-gray-300 bg-gray-50/80 rounded-xl shadow-sm p-6 flex flex-col items-center">
          <card_1.CardHeader className="flex flex-col items-center">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
              <lucide_react_1.UploadCloud className="w-7 h-7 text-gray-500"/>
            </div>
            <card_1.CardTitle className="text-lg font-semibold text-gray-800 mb-1">Import Trackman Data</card_1.CardTitle>
            <card_1.CardDescription className="text-gray-500 mb-2">Upload a Trackman CSV file to import new data.</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="w-full flex flex-col items-center">
            <form onSubmit={handleImport} className="flex flex-col items-center w-full gap-3">
              <input ref={fileInputRef} type="file" accept=".csv" className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"/>
              <button_1.Button type="submit" className="w-full mt-2" disabled={uploading}>
                {uploading ? "Importing..." : "Import"}
              </button_1.Button>
              {message && <div className={`text-center text-sm mt-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
            </form>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>);
}
