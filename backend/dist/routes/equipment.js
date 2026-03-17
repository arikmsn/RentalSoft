"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { status, siteId, type, search } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (siteId)
            where.siteId = siteId;
        if (type)
            where.type = type;
        if (search) {
            where.OR = [
                { qrTag: { contains: String(search), mode: 'insensitive' } },
                { type: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        const equipment = await database_1.prisma.equipment.findMany({
            where,
            include: { site: true },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/types', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const types = await database_1.prisma.equipmentType.findMany();
        res.json(types.map((t) => t.name));
    }
    catch (error) {
        console.error('Get equipment types error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const equipment = await database_1.prisma.equipment.findUnique({
            where: { id: req.params.id },
            include: { site: true },
        });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        res.json(equipment);
    }
    catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/qr/:qrTag', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const equipment = await database_1.prisma.equipment.findUnique({
            where: { qrTag: req.params.qrTag },
            include: { site: true },
        });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        res.json(equipment);
    }
    catch (error) {
        console.error('Get equipment by QR error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        const { qrTag, type, status } = req.body;
        const existing = await database_1.prisma.equipment.findUnique({
            where: { qrTag },
        });
        if (existing) {
            return res.status(400).json({ message: 'QR tag already exists' });
        }
        let typeRecord = await database_1.prisma.equipmentType.findUnique({
            where: { name: type },
        });
        if (!typeRecord) {
            typeRecord = await database_1.prisma.equipmentType.create({
                data: { name: type },
            });
        }
        const equipment = await database_1.prisma.equipment.create({
            data: {
                qrTag,
                type,
                typeId: typeRecord.id,
                status: status || 'warehouse',
            },
            include: { site: true },
        });
        await database_1.prisma.activityLog.create({
            data: {
                equipmentId: equipment.id,
                userId: req.user.id,
                actionType: 'status_change',
                notes: `Equipment created with status: ${equipment.status}`,
            },
        });
        res.status(201).json(equipment);
    }
    catch (error) {
        console.error('Create equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.patch('/:id', auth_1.authenticate, auth_1.isManagerOrAdmin, async (req, res) => {
    try {
        const { qrTag, type, status, condition, siteId, plannedRemovalDate } = req.body;
        const equipment = await database_1.prisma.equipment.update({
            where: { id: req.params.id },
            data: {
                ...(qrTag && { qrTag }),
                ...(type && { type }),
                ...(status && { status }),
                ...(condition && { condition }),
                ...(siteId !== undefined && { siteId }),
                ...(plannedRemovalDate && { plannedRemovalDate: new Date(plannedRemovalDate) }),
            },
            include: { site: true },
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Update equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        await database_1.prisma.equipment.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Equipment deleted' });
    }
    catch (error) {
        console.error('Delete equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/:id/scan', auth_1.authenticate, async (req, res) => {
    try {
        const { siteId, location } = req.body;
        const equipment = await database_1.prisma.equipment.update({
            where: { id: req.params.id },
            data: {
                siteId,
                lastScanDate: new Date(),
                installationDate: new Date(),
                status: 'at_customer',
                ...(location && {
                    latitude: location.lat,
                    longitude: location.lng,
                }),
            },
            include: { site: true },
        });
        await database_1.prisma.activityLog.create({
            data: {
                equipmentId: equipment.id,
                siteId,
                userId: req.user.id,
                actionType: 'location_change',
                notes: `Equipment scanned at site`,
                locationLat: location?.lat,
                locationLng: location?.lng,
            },
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Scan equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=equipment.js.map