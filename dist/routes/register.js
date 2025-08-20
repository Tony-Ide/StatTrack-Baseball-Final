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
exports.default = default_1;
const supabase_1 = require("../lib/supabase");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function default_1(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        const { email, password, team_id } = req.body;
        if (!email || !password || !team_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if user exists
        const { data: existing, error: findError } = yield supabase_1.supabase.from('users').select('user_id').eq('email', email).single();
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        if (findError && findError.code !== 'PGRST116') {
            return res.status(500).json({ error: findError.message });
        }
        // Hash password
        const password_hash = yield bcryptjs_1.default.hash(password, 10);
        // Insert user
        const { error } = yield supabase_1.supabase.from('users').insert([{ email, password_hash, team_id }]);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(201).json({ success: true });
    });
}
