"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { search, hasEquipment, rating } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { address: { contains: String(search), mode: 'insensitive' } },
                { city: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (rating)
            where.rating = Number(rating);
        let sites = await database_1.prisma.site.findMany({
            where,
            include: {
                equipment: hasEquipment === 'true' ? { where: { status: 'at_customer' } } : false,
            },
            orderBy: { name: 'asc' },
        });
        if (hasEquipment === 'true') {
            sites = sites.filter((s) => s.equipment && s.equipment.length > 0);
        }
        res.json(sites);
    }
    catch (error) {
        console.error('Get sites error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/with-equipment-status', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const sites = await database_1.prisma.site.findMany({
            include: {
                equipment: {
                    where: { status: 'at_customer' },
                },
            },
            orderBy: { name: 'asc' },
        });
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
        const sitesWithStatus = sites.map(site => {
            let redCount = 0;
            let orangeCount = 0;
            let greenCount = 0;
            for (const eq of site.equipment) {
                if (!eq.plannedRemovalDate) {
                    greenCount++;
                    continue;
                }
                const daysRemaining = Math.ceil((new Date(eq.plannedRemovalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysRemaining <= 7) {
                    redCount++;
                }
                else if (daysRemaining <= 10) {
                    orangeCount++;
                }
                else {
                    greenCount++;
                }
            }
            let overallStatus = 'green';
            if (redCount > 0) {
                overallStatus = 'red';
            }
            else if (orangeCount > 0) {
                overallStatus = 'orange';
            }
            return {
                ...site,
                equipment: undefined,
                statusCounts: {
                    red: redCount,
                    orange: orangeCount,
                    green: greenCount,
                },
                overallStatus,
            };
        });
        res.json(sitesWithStatus);
    }
    catch (error) {
        console.error('Get sites with equipment status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const site = await database_1.prisma.site.findUnique({
            where: { id: req.params.id },
            include: {
                equipment: { where: { status: 'at_customer' } },
                workOrders: { orderBy: { plannedDate: 'desc' }, take: 10 },
            },
        });
        if (!site) {
            return res.status(404).json({ message: 'Site not found' });
        }
        res.json(site);
    }
    catch (error) {
        console.error('Get site error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        const { name, address, city, floor, apartment, contact1Name, contact1Phone, contact2Name, contact2Phone, rating, isHighlighted, latitude, longitude, } = req.body;
        const site = await database_1.prisma.site.create({
            data: {
                name,
                address,
                city,
                floor,
                apartment,
                contact1Name,
                contact1Phone,
                contact2Name,
                contact2Phone,
                rating,
                isHighlighted: isHighlighted || false,
                latitude,
                longitude,
            },
        });
        res.status(201).json(site);
    }
    catch (error) {
        console.error('Create site error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.patch('/:id', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        const { name, address, city, floor, apartment, contact1Name, contact1Phone, contact2Name, contact2Phone, rating, isHighlighted, latitude, longitude, } = req.body;
        const site = await database_1.prisma.site.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(address && { address }),
                ...(city && { city }),
                ...(floor !== undefined && { floor }),
                ...(apartment !== undefined && { apartment }),
                ...(contact1Name !== undefined && { contact1Name }),
                ...(contact1Phone !== undefined && { contact1Phone }),
                ...(contact2Name !== undefined && { contact2Name }),
                ...(contact2Phone !== undefined && { contact2Phone }),
                ...(rating !== undefined && { rating }),
                ...(isHighlighted !== undefined && { isHighlighted }),
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
            },
        });
        res.json(site);
    }
    catch (error) {
        console.error('Update site error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        await database_1.prisma.site.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Site deleted' });
    }
    catch (error) {
        console.error('Delete site error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/geocode', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { address } = req.query;
        // In production, use a geocoding service like Google Maps or OpenStreetMap
        // For now, return default coordinates for Israel
        res.json({ lat: 31.0461, lng: 34.8516 });
    }
    catch (error) {
        console.error('Geocode error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=sites.js.map