"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTechnicianOrHigher = exports.isAdmin = exports.isManagerOrAdmin = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../config/database");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'User not found or inactive' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
exports.authorize = authorize;
const isManagerOrAdmin = (req, res, next) => {
    if (!req.user || !['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Manager or Admin required' });
    }
    next();
};
exports.isManagerOrAdmin = isManagerOrAdmin;
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin required' });
    }
    next();
};
exports.isAdmin = isAdmin;
const isTechnicianOrHigher = (req, res, next) => {
    if (!req.user || !['technician', 'manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};
exports.isTechnicianOrHigher = isTechnicianOrHigher;
//# sourceMappingURL=auth.js.map