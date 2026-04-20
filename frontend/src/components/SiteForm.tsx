import { useTranslation } from 'react-i18next';
import { AddressAutocomplete } from './AddressAutocomplete';

const AREA_BY_CITY: Record<string, string> = {
  // מרכז
  'תל אביב-יפו': 'מרכז',
  'תל אביב': 'מרכז',
  'רמת גן': 'מרכז',
  'גבעתיים': 'מרכז',
  'חולון': 'מרכז',
  'בת ים': 'מרכז',
  'ראשון לציון': 'מרכז',
  'פתח תקווה': 'מרכז',
  'נס ציונה': 'מרכז',
  'רמלה': 'מרכז',
  'לוד': 'מרכז',
  'קרית מלאכי': 'מרכז',
  'אור יהודה': 'מרכז',
  'יבנה': 'מרכז',
  'גדרה': 'מרכז',
  'בית דגן': 'מרכז',
  'גני תקווה': 'מרכז',
  'ראש העין': 'מרכז',
  'שוהם': 'מרכז',
  'מודיעין': 'מרכז',
  'מודיעין-מכבים-רעות': 'מרכז',
  'עתלית': 'מרכז',
  'אביחיל': 'מרכז',
  'בית עריף': 'מרכז',
  'יד בניה': 'מרכז',
  'גבעת חיים': 'מרכז',
  'רמות השביש': 'מרכז',
  'מתתיהו': 'מרכז',
  'גבעת ניל"י': 'מרכז',
  'כפר יונה': 'מרכז',
  'כפר תפרח': 'מרכז',
  'חירות': 'מרכז',
  'גן שלמה': 'מרכז',
  'גאליס': 'מרכז',
  'בית ברל': 'מרכז',
  'כפר דרוזי': 'מרכז',
  'דייר חוסינא': 'מרכז',
  "ג'לג'וליה": 'מרכז',
  'סגולה': 'מרכז',
  'פלחול': 'מרכז',
  'כפר ברעם': 'מרכז',
  'נהלל': 'מרכז',
  'שדה יעקב': 'מרכז',
  'גבעת עוז': 'מרכז',
  'רמת ישי': 'מרכז',
  'טירת צבי': 'מרכז',
  'מרחביה': 'מרכז',
  'גבעת הרקפת': 'מרכז',
  'רמים': 'מרכז',
  'ביר אבו גוש': 'ירושלים',
  'בני ברק': 'מרכז',
  'קרית ביאליק': 'צפון',
  'טירה': 'מרכז',
  'טייבה': 'מרכז',
  'כפר סבא': 'שרון',
  'הוד השרון': 'שרון',
  'הרצליה': 'שרון',
  'רעננה': 'שרון',
  'נתניה': 'שרון',
  'קדימה-ורד': 'שרון',
  'כפר שמריהו': 'שרון',
  'גבעת שמואל': 'שרון',
  'שפיים': 'שרון',
  'זכרון יעקב': 'מרכז',
  'פרדס חנה-כרכור': 'מרכז',
  'בנימינה-גבע בנימין': 'מרכז',
  'חרוצים': 'מרכז',
  'מעלה שומרון': 'מרכז',
  'אלפי מנשה': 'מרכז',
  'עמנואל': 'מרכז',
  'קרית נטפים': 'מרכז',
  'הושעיה': 'מרכז',
  'בורגת': 'שרון',
  'צור יצחק': 'שרון',
  // ירושלים
  'ירושלים': 'ירושלים',
  'גבעת זאב': 'ירושלים',
  'ביתר עיל': 'ירושלים',
  'מעלה אדומים': 'ירושלים',
  'קרית יערים': 'ירושלים',
  'טל שחר': 'ירושלים',
  'עין ראפ': 'ירושלים',
  'הר חוצבים': 'ירושלים',
  'לפיד': 'ירושלים',
  'עפרה': 'ירושלים',
  'אורה': 'ירושלים',
  'גבעון החדשה': 'ירושלים',
  'מבשרת ציון': 'ירושלים',
  'הר אדר': 'ירושלים',
  // צפון
  'קרית שמונה': 'צפון',
  'חיפה': 'צפון',
  'טבריה': 'צפון',
  'נהריה': 'צפון',
  'עכו': 'צפון',
  'כרמיאל': 'צפון',
  'נצרת': 'צפון',
  'עפולה': 'צפון',
  'חדרה': 'צפון',
  'קרית מוצקין': 'צפון',
  'מעלות-תרשיחא': 'צפון',
  'נוף הגליל': 'צפון',
  "באקה-ג'ת": 'צפון',
  'אום אל-פחם': 'צפון',
  'כפר כנא': 'צפון',
  'טורעאן': 'צפון',
  'כפר קרע': 'צפון',
  'רומאנה': 'צפון',
  'פקיעין': 'צפון',
  'מגדל העמק': 'צפון',
  'יקנעם': 'צפון',
  'רכסים': 'צפון',
  'מעלה יוסף': 'צפון',
  'שלומי': 'צפון',
  'טובא-זנגריה': 'צפון',
  'צפת': 'צפון',
  'קרית יובל': 'צפון',
  'טירת הכנרת': 'צפון',
  'קדרון': 'צפון',
  'מעש': 'צפון',
  'חצור הגלילית': 'צפון',
  'ראש פינה': 'צפון',
  'מעלה החרמון': 'צפון',
  'שאר ישוב': 'צפון',
  'משמר העמק': 'צפון',
  // דרום
  'באר שבע': 'דרום',
  'אילת': 'דרום',
  'אשקלון': 'דרום',
  'אשדוד': 'דרום',
  'קרית גת': 'דרום',
  'נתיבות': 'דרום',
  'שדרות': 'דרום',
  'רהט': 'דרום',
  'חורה': 'דרום',
  'ערערה': 'דרום',
  'כסיפה': 'דרום',
  'לקיה': 'דרום',
  'שגב-שלום': 'דרום',
  'באר יעקב': 'דרום',
  'מזכרת בתיה': 'דרום',
  'נחל עוז': 'דרום',
  'מצפה רמון': 'דרום',
  'תל קטינה': 'דרום',
  'צאלח': 'דרום',
  'להבים': 'דרום',
  'מיתר': 'דרום',
  'עומר': 'דרום',
  'יד מרדכי': 'מרכז',
  'שדה דוד': 'דרום',
  'כפר מנחם': 'דרום',
  'בית גוברין': 'דרום',
};

const DISTRICT_TO_AREA: Record<string, string> = {
  'מרכז': 'מרכז',
  'המרכז': 'מרכז',
  'שרון': 'שרון',
  'השרון': 'שרון',
  'ירושלים': 'ירושלים',
  'הירושלים': 'ירושלים',
  'צפון': 'צפון',
  'הצפון': 'צפון',
  'דרום': 'דרום',
  'הדרום': 'דרום',
  'חיפה': 'צפון',
  'תל אביב': 'מרכז',
  'באר שבע': 'דרום',
  'נגב': 'דרום',
  'הנגב': 'דרום',
};

function normalize(str: string): string {
  return str.trim().replace(/[\s\-_]/g, '').toLowerCase();
}

function getInferredArea(city: string, district?: string): string {
  if (!city && !district) return '';

  if (city) {
    const normalizedCity = normalize(city);
    for (const [key, value] of Object.entries(AREA_BY_CITY)) {
      if (normalize(key) === normalizedCity) {
        return value;
      }
    }
  }

  if (district) {
    const normalizedDistrict = normalize(district);
    for (const [key, value] of Object.entries(DISTRICT_TO_AREA)) {
      if (normalize(key) === normalizedDistrict) {
        return value;
      }
    }
    if (normalize(district) === normalize('המרכז')) return 'מרכז';
    if (normalize(district) === normalize('הצפון')) return 'צפון';
    if (normalize(district) === normalize('הדרום')) return 'דרום';
    if (normalize(district) === normalize('השרון')) return 'שרון';
    if (normalize(district) === normalize('ירושלים')) return 'ירושלים';
  }

  return '';
}

export interface SiteFormData {
  name: string;
  address: string;
  streetName: string;
  city: string;
  houseNumber: string;
  floor: string;
  contact1Name: string;
  contact1Phone: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  area?: string;
  source?: string;
  orderNumber?: number;
}

export const emptySiteForm: SiteFormData = {
  name: '',
  address: '',
  streetName: '',
  city: '',
  houseNumber: '',
  floor: '',
  contact1Name: '',
  contact1Phone: '',
  rating: 3,
  area: '',
  source: '',
  orderNumber: undefined,
};

interface SiteFormProps {
  data: SiteFormData;
  setData: React.Dispatch<React.SetStateAction<SiteFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  showRating?: boolean;
  inline?: boolean;
  leadSources?: {id: string; name: string}[];
}

export function SiteForm({
  data,
  setData,
  onSubmit,
  onCancel,
  saving,
  title,
  showRating = true,
  inline = false,
  leadSources = [],
}: SiteFormProps) {
  const { t } = useTranslation();

  const inputClasses = inline
    ? "w-full px-3 py-2 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
    : "w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800";

  const containerClasses = inline
    ? "space-y-3"
    : "space-y-4";

  const buttonClasses = inline
    ? "flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm hover:bg-surface-100"
    : "flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium";

  const submitButtonClasses = inline
    ? "flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
    : "flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const formContent = (
    <>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.name')}</label>
        <input type="text" required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className={inputClasses} />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.address')}</label>
        <AddressAutocomplete
          value={data.address}
          onChange={(val) => setData((prev) => ({ ...prev, address: val }))}
          onSelect={(sel) => {
            setData((prev) => {
              const streetName = sel.address.split(',')[0].trim();
              const composite = sel.houseNumber
                ? `${streetName} ${sel.houseNumber}, ${sel.city}`
                : sel.address;
              const city = sel.city || prev.city;
              const inferredArea = getInferredArea(city, sel.district);
              return {
                ...prev,
                address: composite,
                streetName,
                city,
                houseNumber: sel.houseNumber || prev.houseNumber,
                latitude: sel.latitude,
                longitude: sel.longitude,
                area: prev.area || inferredArea,
              };
            });
          }}
          required
          className={inputClasses}
        />
        {data.latitude && data.longitude && (
          <p className="text-xs text-success-600 mt-1">✓ {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.floor')}</label>
        <input
          type="text"
          value={data.floor}
          onChange={(e) => setData({ ...data, floor: e.target.value })}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">אזור</label>
        <select
          value={data.area || ''}
          onChange={(e) => setData({ ...data, area: e.target.value })}
          className={inputClasses}
        >
          <option value="">-- בחר אזור --</option>
          {['צפון', 'דרום', 'מרכז', 'ירושלים', 'שרון'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.contact1')}</label>
        <input type="text" value={data.contact1Name} onChange={(e) => setData({ ...data, contact1Name: e.target.value })} className={inputClasses} />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.phone1')}</label>
        <input type="tel" autoComplete="tel" value={data.contact1Phone} onChange={(e) => setData({ ...data, contact1Phone: e.target.value })} className={inputClasses} />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">מקור</label>
        <select
          value={data.source || ''}
          onChange={(e) => setData({ ...data, source: e.target.value })}
          className={inputClasses}
          disabled={leadSources.length === 0}
        >
          <option value="">-- בחר מקור --</option>
          {leadSources.map(ls => (
            <option key={ls.id} value={ls.name}>{ls.name}</option>
          ))}
        </select>
        {leadSources.length === 0 && (
          <p className="text-xs text-surface-500 mt-1">לא הוגדרו מקורות במסך ההגדרות</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">מס' הזמנה</label>
        <input
          type="number"
          value={data.orderNumber || ''}
          onChange={(e) => setData({ ...data, orderNumber: e.target.value ? parseInt(e.target.value) : undefined })}
          placeholder="מספר הזמנה"
          className={inputClasses}
        />
      </div>

      <div className={`flex gap-3 ${inline ? 'pt-2' : 'pt-3'}`}>
        <button type="button" onClick={onCancel} className={buttonClasses}>
          {t('app.cancel')}
        </button>
        {inline ? (
          <button type="button" disabled={saving} onClick={handleSubmit} className={submitButtonClasses}>
            {saving ? t('app.loading') : t('app.save')}
          </button>
        ) : (
          <button type="submit" disabled={saving} className={submitButtonClasses}>
            {saving ? t('app.loading') : t('app.save')}
          </button>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
        <div className={containerClasses}>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-800">{title}</h2>
          {showRating && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-500">{t('sites.rating')}:</span>
              <select
                value={data.rating}
                onChange={(e) => setData({ ...data, rating: Number(e.target.value) })}
                className="px-2 py-1 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className={containerClasses}>
          {formContent}
        </form>
      </div>
    </div>
  );
}
