import { useTranslation } from 'react-i18next';
import { AddressAutocomplete } from './AddressAutocomplete';

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
  isHighlighted: boolean;
  latitude?: number;
  longitude?: number;
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
  isHighlighted: false,
};

interface SiteFormProps {
  data: SiteFormData;
  setData: React.Dispatch<React.SetStateAction<SiteFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  showRating?: boolean;
  showHighlight?: boolean;
  inline?: boolean;
}

export function SiteForm({
  data,
  setData,
  onSubmit,
  onCancel,
  saving,
  title,
  showRating = true,
  showHighlight = false,
  inline = false,
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
              return {
                ...prev,
                address: composite,
                streetName,
                city: sel.city || prev.city,
                houseNumber: sel.houseNumber || prev.houseNumber,
                latitude: sel.latitude,
                longitude: sel.longitude,
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
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.contact1')}</label>
        <input type="text" value={data.contact1Name} onChange={(e) => setData({ ...data, contact1Name: e.target.value })} className={inputClasses} />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.phone1')}</label>
        <input type="tel" autoComplete="tel" value={data.contact1Phone} onChange={(e) => setData({ ...data, contact1Phone: e.target.value })} className={inputClasses} />
      </div>

      {showHighlight && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="siteIsHighlighted"
            checked={data.isHighlighted}
            onChange={(e) => setData({ ...data, isHighlighted: e.target.checked })}
            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
          />
          <label htmlFor="siteIsHighlighted" className="text-sm text-surface-700">{t('sites.highlight')}</label>
        </div>
      )}

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
