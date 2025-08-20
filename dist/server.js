"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const next_1 = __importDefault(require("next"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dev = process.env.NODE_ENV !== 'production';
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
// Import route handlers using require for CommonJS compatibility
const teamsHandler = require('./routes/teams').default;
const registerHandler = require('./routes/register').default;
const loginHandler = require('./routes/login').default;
const logoutHandler = require('./routes/logout').default;
const authCheckHandler = require('./routes/auth-check').default;
const importTrackmanHandler = require('./routes/import-trackman').default;
app.prepare().then(() => {
    const server = (0, express_1.default)();
    server.use(express_1.default.json());
    server.use((0, cookie_parser_1.default)());
    // Custom API routes
    server.get('/routes/teams', teamsHandler);
    server.post('/routes/register', registerHandler);
    server.post('/routes/login', loginHandler);
    server.post('/routes/logout', logoutHandler);
    server.get('/routes/auth-check', authCheckHandler);
    server.post('/routes/import-trackman', importTrackmanHandler);
    // Serve static files from public (for Next.js)
    server.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
    // Next.js pages
    server.all('*', (req, res) => {
        return handle(req, res);
    });
    const port = process.env.PORT || 3000;
    server.listen(port, (err) => {
        if (err)
            throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
