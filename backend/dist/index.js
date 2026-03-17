"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api', routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error' });
});
async function start() {
    await (0, database_1.connectDatabase)();
    app.listen(config_1.config.port, () => {
        console.log(`🚀 Server running on port ${config_1.config.port}`);
        console.log(`📍 API: http://localhost:${config_1.config.port}/api`);
    });
}
start();
//# sourceMappingURL=index.js.map