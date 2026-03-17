"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const equipment_1 = __importDefault(require("./equipment"));
const sites_1 = __importDefault(require("./sites"));
const workorders_1 = __importDefault(require("./workorders"));
const dashboard_1 = __importDefault(require("./dashboard"));
const demo_1 = __importDefault(require("./demo"));
const users_1 = __importDefault(require("./users"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/equipment', equipment_1.default);
router.use('/sites', sites_1.default);
router.use('/workorders', workorders_1.default);
router.use('/dashboard', dashboard_1.default);
router.use('/demo', demo_1.default);
router.use('/users', users_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map