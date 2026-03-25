import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { equipmentService } from '../services/equipmentService';
import { api } from '../services/api';
import { formatDate } from '../utils/date';
import { useAuthStore } from '../stores/authStore';
import { CustomDatePicker } from '../components/CustomDatePicker';

interface SettingsEquipmentLocation {
  id: string;
  name: string;
  isSystem?: boolean;
}

interface EquipmentNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy?: {
    name: string;
  };
}

const statusColors: Record<string, string> = {
  available: 'bg-success-100 text-success-700',
  assigned_to_work: 'bg-primary-100 text-primary-700',
};

export function EquipmentDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [equipment, setEquipment] = useState<any>(null);
  const [locations, setLocations] = useState<SettingsEquipmentLocation[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<{id: string; name: string}[]>([]);
  const [notes, setNotes] = useState<EquipmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showNotOkConfirm, setShowNotOkConfirm] = useState(false);
  const [showOkConfirm, setShowOkConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '',
    conditionState: 'OK' as 'OK' | 'NOT_OK',
    purchaseDate: '',
    currentLocationId: '',
  });
  
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!id) return;
    
    Promise.all([
      equipmentService.getById(id),
      api.get<SettingsEquipmentLocation[]>('/settings/equipment-locations').then(res => res.data),
      api.get<{id: string; name: string}[]>('/settings/equipment-types').then(res => res.data),
    ]).then(([eqData, locData, typesData]) => {
      setEquipment(eqData);
      setLocations(locData);
      setEquipmentTypes(typesData || []);
      setFormData({
        type: eqData.type,
        conditionState: eqData.conditionState || 'OK',
        purchaseDate: eqData.purchaseDate ? new Date(eqData.purchaseDate).toISOString().split('T')[0] : '',
        currentLocationId: eqData.currentLocationId || '',
      });
      
      if (eqData.id) {
        return api.get<EquipmentNote[]>(`/equipment/${eqData.id}/notes`).then(res => res.data);
      }
      return [];
    }).then(notesData => {
      setNotes(notesData || []);
    }).catch((err) => {
      console.error('Failed to fetch equipment:', err);
      navigate('/equipment');
    }).finally(() => {
      setLoading(false);
    });
  }, [id, navigate]);

  const handleSave = async () => {
    if (!equipment) return;
    setSaving(true);
    try {
      await equipmentService.update(equipment.id, {
        type: formData.type,
        conditionState: formData.conditionState,
        purchaseDate: formData.purchaseDate || null,
        currentLocationId: formData.currentLocationId || null,
      });
      const updated = await equipmentService.getById(equipment.id);
      setEquipment(updated);
    } catch (err: any) {
      console.error('Failed to update equipment:', err);
      alert(err?.response?.data?.message || 'Failed to update equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!equipment || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await api.post<EquipmentNote>(`/equipment/${equipment.id}/notes`, {
        text: newNote.trim(),
      });
      setNotes([...notes, res.data]);
      setNewNote('');
    } catch (err: any) {
      console.error('Failed to add note:', err);
      alert(err?.response?.data?.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!equipment) return;
    try {
      await api.delete(`/equipment/${equipment.id}/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      alert(err?.response?.data?.message || 'Failed to delete note');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="text-center py-12 text-surface-500">
        {t('errors.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/equipment')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-surface-800">{t('equipment.details')}</h1>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-semibold mb-4 text-surface-800">{t('equipment.basicInfo')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-surface-500 mb-1">{t('equipment.qrTag')}</label>
            <p className="text-surface-800 font-medium">{equipment.qrTag}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-500 mb-1">{t('equipment.type')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
            >
              <option value="">-- {t('app.select')} --</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-500 mb-1">{t('equipment.location')}</label>
            <select
              value={formData.currentLocationId}
              onChange={(e) => setFormData({ ...formData, currentLocationId: e.target.value })}
              className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
            >
              <option value="">-- {t('app.select')} --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assigned Work - with status in header row */}
      {equipment.activeWorkOrder && (
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-surface-800">{t('equipment.assignedWorkOrder')}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[equipment.status]}`}>
                {equipment.status === 'available' ? t('equipment.statuses.available') : t('equipment.statuses.assigned_to_work')}
              </span>
              {(equipment as any).conditionState === 'NOT_OK' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
                  {t('equipment.conditionState.notOk')}
                </span>
              )}
            </div>
          </div>
          <div className="p-4 bg-primary-50 rounded-xl">
            <button
              onClick={() => navigate(`/workorders/${equipment.activeWorkOrder?.id}`)}
              className="text-primary-700 font-medium hover:underline text-right block w-full"
            >
              {equipment.activeWorkOrder.site?.name}
            </button>
            {equipment.activeWorkOrder.site?.address && (
              <p className="text-surface-600 text-sm mt-1">{equipment.activeWorkOrder.site.address}</p>
            )}
          </div>
        </div>
      )}

      {/* Condition and Location */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-semibold mb-4 text-surface-800">{t('equipment.conditionAndLocation')}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.condition')}</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (formData.conditionState === 'NOT_OK') {
                    setShowOkConfirm(true);
                  } else {
                    setFormData({ ...formData, conditionState: 'OK' });
                  }
                }}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                  formData.conditionState === 'OK'
                    ? 'border-success-500 bg-success-50 text-success-700'
                    : 'border-surface-200 text-surface-600 hover:border-surface-300'
                }`}
              >
                ✅ {t('equipment.conditionState.ok')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNotOkConfirm(true);
                }}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                  formData.conditionState === 'NOT_OK'
                    ? 'border-danger-500 bg-danger-50 text-danger-700'
                    : 'border-surface-200 text-surface-600 hover:border-surface-300'
                }`}
              >
                ⚠️ {t('equipment.conditionState.notOk')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.purchaseDate')}</label>
            <CustomDatePicker
              value={formData.purchaseDate}
              onDateSelect={(date) => setFormData({ ...formData, purchaseDate: date })}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-surface-800">{t('equipment.notes')}</h2>
        </div>
        
        <div className="space-y-3 mb-4">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="flex-1">
                <p className="text-surface-800">{note.text}</p>
                <p className="text-xs text-surface-500 mt-1">
                  {formatDate(note.createdAt)}
                  {note.createdBy && ` • ${note.createdBy.name}`}
                </p>
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="text-surface-400 hover:text-danger-600 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-surface-400 text-sm">{t('equipment.noNotes')}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t('equipment.addNote')}
            className="flex-1 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200"
          >
            {savingNote ? t('app.loading') : t('app.add')}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/equipment')}
          className="px-6 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium"
        >
          {t('app.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200"
        >
          {saving ? t('app.loading') : t('app.save')}
        </button>
      </div>

      {/* NOT_OK Confirmation Modal */}
      {showNotOkConfirm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-float">
            <h2 className="text-xl font-bold mb-4 text-surface-800">העברת ציוד למצב 'לא תקין'</h2>
            <p className="text-surface-600 mb-6">
              {equipment.activeWorkOrder 
                ? "בטוח שברצונך להעביר את הציוד למצב 'לא תקין'? הציוד יוסר מהעבודה המשויכת לו."
                : "בטוח שברצונך להעביר את הציוד למצב 'לא תקין'?"
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNotOkConfirm(false);
                }}
                className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium"
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  setShowNotOkConfirm(false);
                  setSaving(true);
                  try {
                    // Unassign from work if needed
                    if (equipment.activeWorkOrder) {
                      await api.delete(`/workorders/${equipment.activeWorkOrder.id}/equipment/${equipment.id}`);
                    }
                    
                    // Update equipment to NOT_OK and clear location
                    await equipmentService.update(equipment.id, { 
                      conditionState: 'NOT_OK',
                      currentLocationId: null,
                      status: equipment.activeWorkOrder ? 'available' : undefined,
                    });
                    
                    // Add system note
                    const now = new Date();
                    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                    const userName = user?.name || 'מערכת';
                    try {
                      await api.post(`/equipment/${equipment.id}/notes`, {
                        text: `הועבר למצב 'לא תקין' על ידי ${userName} בתאריך ${dateStr}`,
                      });
                    } catch (noteErr) {
                      console.warn('Failed to add system note:', noteErr);
                    }
                    
                    // Refresh equipment data
                    const updated = await equipmentService.getById(equipment.id);
                    setEquipment(updated);
                    setFormData({
                      ...formData,
                      conditionState: 'NOT_OK',
                      currentLocationId: '',
                    });
                    
                    // Refresh notes
                    const notesData = await api.get<EquipmentNote[]>(`/equipment/${equipment.id}/notes`).then(res => res.data);
                    setNotes(notesData || []);
                    
                  } catch (err) {
                    console.error('Failed to update equipment:', err);
                    alert('Failed to update equipment');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 px-4 py-3 bg-danger-600 text-white rounded-xl hover:bg-danger-700 font-medium transition-all duration-200"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OK Confirmation Modal */}
      {showOkConfirm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-float">
            <h2 className="text-xl font-bold mb-4 text-surface-800">העברת ציוד למצב 'תקין'</h2>
            <p className="text-surface-600 mb-6">האם להעביר את הציוד למצב תקין?</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOkConfirm(false);
                }}
                className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium"
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  setShowOkConfirm(false);
                  setSaving(true);
                  try {
                    // Update equipment to OK
                    await equipmentService.update(equipment.id, { 
                      conditionState: 'OK',
                    });
                    
                    // Add system note
                    const now = new Date();
                    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                    const userName = user?.name || 'מערכת';
                    try {
                      await api.post(`/equipment/${equipment.id}/notes`, {
                        text: `הוחזר למצב 'תקין' על ידי ${userName} בתאריך ${dateStr}`,
                      });
                    } catch (noteErr) {
                      console.warn('Failed to add system note:', noteErr);
                    }
                    
                    // Refresh equipment data
                    const updated = await equipmentService.getById(equipment.id);
                    setEquipment(updated);
                    setFormData({
                      ...formData,
                      conditionState: 'OK',
                    });
                    
                    // Refresh notes
                    const notesData = await api.get<EquipmentNote[]>(`/equipment/${equipment.id}/notes`).then(res => res.data);
                    setNotes(notesData || []);
                    
                  } catch (err) {
                    console.error('Failed to update equipment:', err);
                    alert('Failed to update equipment');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 px-4 py-3 bg-success-600 text-white rounded-xl hover:bg-success-700 font-medium transition-all duration-200"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}