import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, isSuperAdmin, AuthRequest } from '../middleware/auth';
import { logAdminAction } from '../lib/securityLog';

const router = Router();

const MIN_PASSWORD_LENGTH = 10;
const BCRYPT_ROUNDS = 12;

const SHARON_LOCALITIES = new Set([
  'כפר סבא', 'רעננה', 'הרצליה', 'רמת השרון', 'הוד השרון', 'קיסריה',
  'שדה ורבורג', 'בת חפר', 'כפר ויתקין', 'גבעת שפירא', 'פרדסיה',
  'גן שמואל', 'רשפון', 'קדימה', 'אבן יהודה', 'חריש', 'קלנסווה',
  'טירה', 'טייבה', 'כפר ברא', 'רמלה', 'לוד', 'נס ציונה',
  'ראשון לציון', 'בת ים', 'אור יהודה', 'חולון', 'בני ברק',
  'גבעתיים', 'גבעת שמואל', 'רמת גן', 'פתח תקווה', 'נתניה',
  'יהוד', 'יהוד מונוסון', 'כפר אז"ר', 'רמת אפעל', 'זית רענן',
  'קרית אונו', 'ראש העין', 'יבנה', 'אום אל פחם', 'מודיעין',
  'כוכב יאיר', 'נירית', 'קציר', 'חריש', 'נטף', 'כרמי יוסף',
  'מירב', 'זמר', 'שוהם', 'אלעד', 'לפיד', 'מתן', 'בסמ"ה',
  'נוף איילון', 'אירוס', 'אל עזי', 'צור יצחק', 'בת חן',
  'צור יגאל', 'מצפה אילן', 'גני טל', 'נצר חזני', 'באר גנים',
  'צורן', 'תנובות', 'תלמי אלעזר', 'כנות', 'שדה יצחק',
  'כפר בן נון', 'ינון', 'אורות', 'בן שמן', 'שדי חמד',
  'גבעת חיים איחוד', 'אום אל קוטוף', 'מנוחה', 'בית חלקיה',
  'עדנים', 'ברקת', 'גבעת חביבה', 'תעשיון השרון', 'תעשיון חצב',
  'תעשיון בינימין', 'פארק תעשיות עמק ח', 'קרית שדה התעופה',
  'מרכז שוהם', 'נמל תעופה בן גורי', 'תעשיון צריפין',
  'מפעלי חבל יבנה', 'מפעלי כנות', 'פארק תעשיות ראם',
  'תעשיון ראם', 'מפעלי צומת מלאכי', 'עד הלום', 'מפעלי ברקן',
  'תעשיון שח"ק', 'מודיעין מכבים רעות', 'צוקי ים', 'גני הדר',
  'צופיה', 'מבואות ים', 'בת הדר', 'ארסוף', 'אל עריאן',
  'נווה אפרים מונוסו', 'רמת פנקס', 'מפעלי נחם הר טוב',
  'אולפני נווה אילן', 'פארק תעשייה חבל מ', 'מפעלי גרנות',
  'משמר השרון', 'חבצלת השרון', 'גן חיים', 'כפר שמריהו',
  'כפר מנחם', 'כפר ידידיה', 'משוב', 'צופית', 'בית ינאי',
  'בית עובד', 'אלישיב', 'חגלה', 'רמות השבים', 'גבעת ח"ן',
  'מעברות', 'גיבתון', 'קדימה צורן', '�ני עם', 'חיבת ציון',
  'עין עירון', 'שושנת העמקים', 'גן השומרון', 'גני תקווה',
  'מעש', 'שפיים', 'ביצרון', 'מענית', 'גליל ים', 'ניצן',
  'חורשים', 'ניצנים', 'חפץ חיים', 'כפר אוריה', 'גזר',
  'בית הלוי', 'מגל', 'המעפיל', 'גאולים', 'מכמורת', 'בני דרור',
  'כפר מונש', 'בצרה', 'קדמה', 'גלאון', 'נווה אילן',
  'חצור אשדוט', 'קרית שלמה', 'יקום', 'בני ציון', 'חרב לאת',
  'העוגן', 'משמרת', 'נצר סרני', 'יסודות', 'רגבים', 'אודים',
  'נורדיה', 'בני עטרות', 'נחלים', 'בארות יצחק', 'שורש',
  'רמת רזיאל', 'טל שחר', 'הראל', 'צובה', 'בית דגן',
  'קרית עקרון', 'אבו גוש', 'דייר ראפאת', 'עין ראפה',
  'עין נקובא', 'גנות הדר', 'ניר בנים', 'שדמה', 'בית אלעזרי',
  'משמר דוד', 'רבדים', 'אזור', 'גבעת שמש', 'צרעה',
  'בית גמליאל', 'יד בנימין', 'כפר הנגיד', 'סביון',
  'בני ראם', 'עשרת', 'בני דרום', 'ערוגות', 'צפריה',
  'פלמחים', 'בית עריף', 'מזור', 'סתריה', 'קדרון',
  'רינתיה', 'ברקאי', 'חדיד', 'משואות יצחק', 'עין צורים',
  "ג'לג'וליה", "ג'ת", 'כפר קאסם', 'מוקייבלה', 'ערערה',
  'כפר קרע', 'שער אפרים', 'טירת יהודה', 'משמר איילון',
  'בית נקופה', 'כפר טרומן', 'אביאל', 'אומץ', 'בניה',
  'נווה ימין', 'כפר אחים', 'שפיר', 'נתיב הל"ה', 'כפר חב"ד',
  'בארותיים', 'בורגתה', 'ניר ישראל', 'חצב', 'נחשונים',
  'גיאה', 'כפר דניאל', 'בית זית', 'עזריה', 'להבות חביבה',
  'אייל', 'חגור', 'ירחיב', 'ניר גלים', 'מגשימים', 'הודיה',
  'תלמי יחיאל', 'משמר השבעה', 'מישר', 'גן יאשיה',
  'רמות מאיר', 'עולש', 'שדה עוזיהו', 'אשתאול', 'שואבה',
  'מסילת ציון', 'כפר שמואל', 'גמזו', 'ברכיה', 'בית שיקמה',
  'בית מאיר', 'תעוז', 'ינוב', 'בית עזרא', 'מצליח',
  'יד חנה', 'יציץ', 'בן זכאי', 'שתולים', 'כפר מרדכי',
  'משגב דב', 'קוממיות', 'פורת', 'מבוא ביתר', 'אמונים',
  'יד נתן', 'מחסיה', 'נחשון', 'תרום', 'עמינדב', 'אורה',
  'אבן ספיר', 'בית נחמיה', 'גבעת יערים', 'זיתן', 'משען',
  'גבעתי', 'עגור', 'צלפון', 'אחיעזר', 'יגל', 'זכריה',
  'בית חנניה', 'חמד', 'גבעת כ"ח', 'אחיסמך', 'ישעי',
  'חניאל', 'ניר אליהו', 'נחם', 'זבדיאל', 'זנוח', 'עזריקם',
  'זרחיה', 'אביגדור', 'מטע', 'בר גיורא', 'כוכב מיכאל',
  'נס הרים', 'נווה מבטח', 'ישרש', 'גנות', 'עזריאל',
  'פדיה', 'פתחיה', 'אלישמע', 'געש', 'בית רבן', 'אחיטוב',
  'ניצני עוז', 'גאליה', 'שעלבים', 'כפר אביב', 'נווה ירק',
  'כסלון', 'גני יוחנן', 'גינתון', 'בקוע', 'אלוני יצחק',
  'גבעת השלושה', 'עינת', 'גאולי תימן', 'כפר עבודה',
  'בית חרות', 'עין שריד', 'איתנים', 'כפר הרי"ף',
  'המרכז האקדמי רופי', 'גבעת ישעיהו', 'שער מנשה',
  'נווה אבות', 'מבשרת ציון', 'אור עקיבא', 'חרוצים',
  'קרית מלאכי', 'גיזו', 'יעף', 'בית חשמונאי', 'עין כרם בי"ס חקלא',
  'בני עי"ש', 'אביעזר', 'נווה מיכאל', 'גן הדרום', 'בית ברל',
  'צפרירים', 'בן שמן כפר נוער', 'כרם יבנה', 'מרכז שפירא',
  'צור הדסה', 'שריגים', 'אדרת', 'מי עמי', 'ורדון', 'יד השמונה',
  'קרית יערים', 'מבוא מודיעים', 'ידידה', 'אלומה', 'צור נתן',
  'עזר', 'נופי נחמיה', 'מלכישוע', 'אחווה', 'חוות יאיר', 'שילת',
  'כפר רות', 'נווה שלום', 'מבוא חורון', 'ברכה', 'ענב',
  'חרמש', 'שערי תקווה', 'בחן', 'נחלה', 'סגולה', 'רווחה',
  'מאור', 'באר יעקב', 'גדרה', 'בית שמש', 'קרית יערים מוסד',
  'עופרים', 'רחלים', 'גבעת אסף', 'נריה', 'בנימינה גבעת עדה',
  'בנימינה',
]);

async function seedAreasAndLocalitiesForTenant(tenantId: string): Promise<void> {
  await prisma.settingsLocality.deleteMany({ where: { tenantId } });
  await prisma.settingsArea.deleteMany({ where: { tenantId } });

  const xlsx = await import('xlsx');
  const path = await import('path');

  const excelPath = path.join(__dirname, '..', '..', '..', 'Info', 'public-zones.xlsx');
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet) as { 'שם יישוב': string; 'אזור גאוגרפי': string }[];

  const excelAreaMap = new Map<string, Set<string>>();
  for (const row of data) {
    const locality = row['שם יישוב']?.trim();
    const area = row['אזור גאוגרפי']?.trim();
    if (!locality || !area) continue;
    if (!excelAreaMap.has(area)) excelAreaMap.set(area, new Set());
    excelAreaMap.get(area)!.add(locality);
  }

  const OPERATIONAL_AREAS = [
    'השרון',
    'מרכז',
    'ירושלים והסביבה',
    'צפון',
    'דרום',
    'נגב',
    'אילת ים המלח והערבה',
    'החולה ורמת הגולן',
    'עמק בית שאן ובקעת הירדן',
  ];

  const areaIdMap = new Map<string, string>();
  for (const areaName of OPERATIONAL_AREAS) {
    const area = await prisma.settingsArea.create({
      data: { tenantId, name: areaName },
    });
    areaIdMap.set(areaName, area.id);
  }

  const jlmAreaId = areaIdMap.get('ירושלים והסביבה')!;

  for (const [excelArea, localities] of excelAreaMap.entries()) {
    let targetAreaName: string;

    if (excelArea === 'מרכז') {
      targetAreaName = 'מרכז';
    } else if (excelArea === 'צפון') {
      targetAreaName = 'צפון';
    } else {
      targetAreaName = excelArea;
    }

    const targetAreaId = areaIdMap.get(targetAreaName)!;

    for (const localityName of localities) {
      const finalAreaId = SHARON_LOCALITIES.has(localityName)
        ? areaIdMap.get('השרון')!
        : targetAreaId;

      await prisma.settingsLocality.create({
        data: {
          tenantId,
          name: localityName,
          areaId: finalAreaId,
        },
      });
    }
  }

  const jerusalemLocalities = [
    'ירושלים', 'מודיעין עילית', 'כפר עציון', 'קדומים', 'אלקנה',
    'סלעית', 'ריחן', 'מבוא דותן', 'אריאל', 'שבי שומרון', 'כפר תפוח',
    'חלמיש', 'בית אל', 'בית חורון', 'אלון מורה', 'ראש צורים',
    'הר גילה', 'אלון שבות', 'עפרה', 'אלעזר', 'מעלה שומרון',
    'קרני שומרון', 'שילה', 'חיננית', 'גבעון החדשה', 'יקיר',
    'מתתיהו', 'שקד', 'אפרת', 'בית אריה', 'ברקן', 'ניל"י',
    'עטרת', 'פסגות', 'עמנואל', 'נווה דניאל', 'עלי זהב',
    'גבעת זאב', 'ברוכין', 'קרית נטפים', 'דולב', 'יצהר',
    'אלפי מנשה', 'גבעת בנימין', 'עלי', 'נחליאל', 'פדואל',
    'הר אדר', 'חשמונאים', 'עץ אפרים', 'כוכב יעקב', 'ביתר עילית',
    'נעלה', 'טלמון', 'נופים', 'צופין', 'אבני חפץ', 'בת עין',
    'רבבה', 'כפר האורנים', 'שבות רחל', 'אש קודש', 'עדי עד',
    'גבעת הראל', 'גבעת עדה', 'באקה אל ע\'רביה', 'חדרה',
    'אשקלון', 'פרדס חנה כרכור', 'בית חזון', 'גני יהודה',
    'רחובות', 'רמת גן', 'מגדל', 'עתלית', 'מרחביה קיבוץ',
    'בת שלמה', 'כפר תבור', 'אילניה', 'עין הוד', 'נהלל',
    'עין חרוד מאוחד', 'תל יוסף', 'כפר יחזקאל', 'גבע',
    'עין חרוד איחוד', 'חפצי בה', 'גיניגר',
  ];

  for (const loc of jerusalemLocalities) {
    await prisma.settingsLocality.updateMany({
      where: { tenantId, name: loc },
      data: { areaId: jlmAreaId },
    });
  }
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

router.use(authenticate);
router.use(isSuperAdmin);

router.post('/reset-demo-data', async (req: Request, res: Response) => {
  try {
    const results: Record<string, number> = {};

    const deletedWOE = await prisma.workOrderEquipment.deleteMany({});
    results.workOrderEquipment = deletedWOE.count;

    const deletedHistory = await prisma.workOrderStatusHistory.deleteMany({});
    results.workOrderStatusHistory = deletedHistory.count;

    const deletedChecklist = await prisma.checklistItem.deleteMany({});
    results.checklistItem = deletedChecklist.count;

    const deletedActivity = await prisma.activityLog.deleteMany({});
    results.activityLog = deletedActivity.count;

    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    results.workOrder = deletedWorkOrders.count;

    const deletedEquipment = await prisma.equipment.deleteMany({});
    results.equipment = deletedEquipment.count;

    const deletedSites = await prisma.site.deleteMany({});
    results.site = deletedSites.count;

    res.json({
      message: 'Demo data cleared successfully. Settings and users preserved.',
      deleted: results,
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ message: 'Server error while resetting data' });
  }
});

router.get('/tenants', async (req: AuthRequest, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(tenants.map(async (t) => {
      const count = await prisma.tenantMembership.count({ where: { tenantId: t.id } });
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        isActive: t.isActive,
        suspendedAt: t.suspendedAt,
        archivedAt: t.archivedAt,
        createdAt: t.createdAt,
        userCount: count,
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/tenants', async (req: AuthRequest, res) => {
  try {
    const { name, slug, isActive = true } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ message: 'Slug already exists' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, slug, isActive },
    });

    await seedAreasAndLocalitiesForTenant(tenant.id);

    res.json(tenant);
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/tenants/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, slug, isActive } = req.body;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.tenant.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Suspend tenant (soft-lock)
router.post('/tenants/:id/suspend', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.status === 'suspended') {
      return res.status(400).json({ message: 'Tenant already suspended' });
    }
    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: 'suspended', suspendedAt: new Date(), isActive: false },
    });
    logAdminAction(req.user!.id, req, 'TENANT_SUSPEND', { targetTenantId: id });
    res.json(updated);
  } catch (error) {
    console.error('Suspend tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate tenant
router.post('/tenants/:id/reactivate', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.status === 'active') {
      return res.status(400).json({ message: 'Tenant already active' });
    }
    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: 'active', suspendedAt: null, isActive: true },
    });
    logAdminAction(req.user!.id, req, 'TENANT_REACTIVATE', { targetTenantId: id });
    res.json(updated);
  } catch (error) {
    console.error('Reactivate tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Archive tenant (soft-delete)
router.post('/tenants/:id/archive', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.status === 'archived') {
      return res.status(400).json({ message: 'Tenant already archived' });
    }
    const updated = await prisma.tenant.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date(), isActive: false },
    });
    logAdminAction(req.user!.id, req, 'TENANT_ARCHIVE', { targetTenantId: id });
    res.json(updated);
  } catch (error) {
    console.error('Archive tenant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(users.map(async (u) => {
      const memberships = await prisma.tenantMembership.findMany({
        where: { userId: u.id },
      });
      const tenantsMap = new Map();
      for (const m of memberships) {
        const t = await prisma.tenant.findUnique({ where: { id: m.tenantId } });
        if (t) {
          tenantsMap.set(m.tenantId, { id: t.id, name: t.name, slug: t.slug });
        }
      }
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        isActive: u.isActive,
        isSuperAdmin: u.isSuperAdmin,
        suspendedAt: u.suspendedAt,
        archivedAt: u.archivedAt,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        memberships: Array.from(tenantsMap.values()).map((t: any) => ({
          tenantId: t.id,
          tenantName: t.name,
          tenantSlug: t.slug,
        })),
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { name, username, email, password, role = 'technician', tenantId, isActive = true } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Check username within tenant context (tenant-scoped uniqueness)
    if (username && tenantId) {
      const membershipUserIds = await prisma.tenantMembership.findMany({
        where: { tenantId },
        select: { userId: true },
      });
      const userIds = membershipUserIds.map(m => m.userId);
      if (userIds.length > 0) {
        const existingUsers = await prisma.user.findMany({
          where: { id: { in: userIds }, username },
        });
        if (existingUsers.length > 0) {
          return res.status(400).json({ message: 'Username already exists in this tenant' });
        }
      }
    }

    // Legacy: check global only if no tenant specified (backward compat)
    if (username && !tenantId) {
      const existingUsername = await prisma.user.findFirst({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userData: any = {
      name,
      username,
      password: hashedPassword,
      role,
      isActive,
      isSuperAdmin: false,
    };
    if (email) {
      userData.email = email;
    }

    const user = await prisma.user.create({ data: userData });

    if (tenantId) {
      await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId,
          role,
        },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, isActive, password, tenantId } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (username && username !== existing.username) {
      if (tenantId) {
        const membershipUserIds = await prisma.tenantMembership.findMany({
          where: { tenantId },
          select: { userId: true },
        });
        const userIds = membershipUserIds.map(m => m.userId);
        if (userIds.length > 0) {
          const existingUsers = await prisma.user.findMany({
            where: { id: { in: userIds }, username },
          });
          if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username already exists in this tenant' });
          }
        }
      } else {
        const usernameExists = await prisma.user.findFirst({ where: { username } });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      updateData.username = username;
    }
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }
      updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
      logAdminAction(req.user!.id, req, 'PASSWORD_CHANGE', { targetUserId: id });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (tenantId) {
      await prisma.tenantMembership.upsert({
        where: { userId_tenantId: { userId: id, tenantId } },
        update: { role },
        create: { userId: id, tenantId, role: role || 'member' },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.tenantMembership.deleteMany({ where: { userId: id } });
    await prisma.user.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date(), isActive: false },
    });

    res.json({ success: true, message: 'User archived (soft-delete)' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Suspend user (soft-lock)
router.post('/users/:id/suspend', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.status === 'suspended') {
      return res.status(400).json({ message: 'User already suspended' });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'suspended', suspendedAt: new Date(), isActive: false },
    });
    logAdminAction(req.user!.id, req, 'USER_SUSPEND', { targetUserId: id });
    res.json(updated);
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate user
router.post('/users/:id/reactivate', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.status === 'active') {
      return res.status(400).json({ message: 'User already active' });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'active', suspendedAt: null, isActive: true },
    });
    logAdminAction(req.user!.id, req, 'USER_REACTIVATE', { targetUserId: id });
    res.json(updated);
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ METRICS ENDPOINTS ============

// GET /admin/metrics/overview - Global KPIs across all tenants
router.get('/metrics/overview', async (req: AuthRequest, res) => {
  try {
    const tenants = await prisma.tenant.findMany();
    const users = await prisma.user.findMany();
    const sites = await prisma.site.findMany();
    const equipment = await prisma.equipment.findMany();
    const workOrders = await prisma.workOrder.findMany();

    const activeTenants = tenants.filter(t => t.status === 'active');
    const activeUsers = users.filter(u => u.status === 'active');

    const workOrderStats = {
      total: workOrders.length,
      open: workOrders.filter(wo => wo.status === 'open').length,
      inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
      completed: workOrders.filter(wo => wo.status === 'completed').length,
    };

    const equipmentInWork = await prisma.workOrderEquipment.count({
      where: {
        workOrder: { status: { in: ['open', 'in_progress'] } },
      },
    });

    res.json({
      tenants: {
        total: tenants.length,
        active: activeTenants.length,
        suspended: tenants.filter(t => t.status === 'suspended').length,
        archived: tenants.filter(t => t.status === 'archived').length,
      },
      users: {
        total: users.length,
        active: activeUsers.length,
      },
      sites: {
        total: sites.length,
      },
      equipment: {
        total: equipment.length,
        inWork: equipmentInWork,
      },
      workOrders: workOrderStats,
    });
  } catch (error) {
    console.error('Get overview metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /admin/metrics/tenant/:id - Per-tenant detailed metrics
router.get('/metrics/tenant/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: { tenantId: id },
    });
    const userIds = memberships.map(m => m.userId);
    const tenantUserIds = await prisma.tenantMembership.findMany({
      where: { tenantId: id },
      select: { userId: true },
    });
    const tdUserIds = tenantUserIds.map(m => m.userId);

    const sites = await prisma.site.findMany({
      where: { tenantId: id },
    });
    const siteIds = sites.map(s => s.id);

    const equipment = await prisma.equipment.findMany({
      where: { tenantId: id },
    });
    const equipmentIds = equipment.map(e => e.id);

    const workOrders = await prisma.workOrder.findMany({
      where: {
        tenantId: id,
      },
    });

    const activeUsers = await prisma.user.count({
      where: {
        id: { in: tdUserIds },
        status: 'active',
      },
    });

    const workOrderStats = {
      total: workOrders.length,
      open: workOrders.filter(wo => wo.status === 'open').length,
      inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
      completed: workOrders.filter(wo => wo.status === 'completed').length,
    };

    const equipmentInWork = await prisma.workOrderEquipment.count({
      where: {
        equipmentId: { in: equipmentIds },
        workOrder: { status: { in: ['open', 'in_progress'] } },
      },
    });

    const latestLogin = await prisma.user.findFirst({
      where: { id: { in: tdUserIds } },
      orderBy: { lastLogin: 'desc' },
      select: { lastLogin: true },
    });

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
      },
      users: {
        total: tdUserIds.length,
        active: activeUsers,
      },
      sites: {
        total: sites.length,
      },
      equipment: {
        total: equipment.length,
        inWork: equipmentInWork,
      },
      workOrders: workOrderStats,
      lastLogin: latestLogin?.lastLogin || null,
    });
  } catch (error) {
    console.error('Get tenant metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;