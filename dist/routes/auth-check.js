"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = 'supersecretkey123';
function default_1(req, res) {
    const token = req.cookies && req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Re-issue the cookie with a new expiration (sliding session)
        const newToken = jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: '2h' });
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });
        res.status(200).json({ user });
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
