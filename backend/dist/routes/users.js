"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/technicians', auth_1.authenticate, async (req, res) => {
    try {
        const technicians = await database_1.prisma.user.findMany({
            where: { role: 'technician', isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(technicians);
    }
    catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map