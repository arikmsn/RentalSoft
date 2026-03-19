import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import type { WorkOrder, WorkOrderStatus, WorkOrderType, Site, Equipment } from '../types';
import type { ChecklistUpdate } from '../services/workOrderService';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { BaseQrScanner } from '../components/qr/BaseQrScanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { offlineApi } from '../services/offlineApi';
import { workOrderService } from '../services/workOrderService';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { equipmentService } from '../services/equipmentService';
import { formatDate, formatDateFull } from '../utils/date';

const typeIcons: Record<string, string> = {
  installation: '🔧',
  inspection: '🔍',
  removal: '📤',
  general: '📝',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

interface ScannedEquipment extends Equipment {
  addedAt: Date;
}

export function WorkOrderDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { syncStatus } = useAppStore();
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  
  const [done, setDone] = useState('');
  const [todo, setTodo] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistUpdate[]>([]);
  
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedEquipment, setScannedEquipment] = useState<ScannedEquipment[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  const closeScanner = useCallback(() => {
    console.log('[QR] Closing scanner');
    setScannerOpen(false);
    setSelectedEquipmentId('');
    setScanError(null);
  }, []);
  
  const loadAvailableEquipment = useCallback(async () => {
    setLoadingEquipment(true);
    try {
      const equipment = await equipmentService.getAll({ available: true });
      const attachedIds = scannedEquipment.map(eq => eq.id);
      setAvailableEquipment(equipment.filter(eq => !attachedIds.includes(eq.id)));
    } catch (err) {
      console.error('Failed to load available equipment:', err);
    } finally {
      setLoadingEquipment(false);
    }
  }, [scannedEquipment]);
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editFormData, setEditFormData] = useState({
    type: '' as WorkOrderType,
    status: '' as WorkOrderStatus,
    siteId: '',
    technicianId: '',
    plannedDate: '',
    plannedRemovalDate: '',
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; name: string; active: boolean}[]>([]);
  const [deleting, setDeleting] = useState(false);

  const isAssignedTechnician = user?.id === workOrder?.technicianId;
  const canEdit = user?.role === 'manager' || user?.role === 'admin' || isAssignedTechnician;
  const canDelete = user?.role === 'manager' || user?.role === 'admin';
  const canChangeStatus = canEdit;

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const wo = await offlineApi.getWorkOrderWithDetails(id);
      if (!wo.data) {
        setError(t('errors.notFound'));
        setLoading(false);
        return;
      }
      setWorkOrder(wo.data);
      setDone(wo.data.done || '');
      setTodo(wo.data.todo || '');
      setChecklistItems(
        (wo.data.checklist || []).map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          isChecked: item.isChecked,
          value: item.value,
        }))
      );
      
      // Load existing equipment from work order
      const existingEquipment = (wo.data as any).equipment || [];
      setScannedEquipment(existingEquipment.map((eq: any) => ({
        id: eq.equipment.id,
        qrTag: eq.equipment.qrTag,
        type: eq.equipment.type,
        status: eq.equipment.status,
        siteId: eq.equipment.siteId,
        addedAt: new Date(eq.createdAt),
      })));
      
      setFromCache(!!wo.fromCache);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch work order:', err);
      if (err.fromCache && err.data) {
        setWorkOrder(err.data);
        setFromCache(true);
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (scannerOpen) {
      loadAvailableEquipment();
    }
  }, [scannerOpen, loadAvailableEquipment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showStatusDropdown && !target.closest('.status-dropdown') && !target.closest('button')) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showStatusDropdown]);

  const handleChecklistChange = (index: number, field: 'isChecked' | 'value', value: boolean | string) => {
    const newItems = [...checklistItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setChecklistItems(newItems);
  };

  const handleSaveChecklist = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await offlineApi.updateChecklist(id, checklistItems);
      setSuccess(t('app.success'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.message === 'offline_queued') {
        setSuccess(t('sync.syncedLater'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await offlineApi.updateWorkOrderNotes(id, { done, todo });
      setSuccess(t('app.success'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.message === 'offline_queued') {
        setSuccess(t('sync.syncedLater'));
        setTimeout(() => setSuccess(null), 3000);
      } else if (err?.response?.status === 400) {
        setError(err?.response?.data?.message || t('errors.validationError'));
        setTimeout(() => setError(null), 5000);
      } else {
        setError(t('errors.serverError'));
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (site: Site | undefined) => {
    if (!site) return;
    let wazeUrl = '';
    wazeUrl = `https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`;
    window.open(wazeUrl, '_blank');
  };

  const handleCall = (phone: string | undefined) => {
    if (!phone) return;
    window.open(`tel:${phone}`, '_blank');
  };

  const handleScanQR = async (qrValue: string) => {
    setScanError(null);
    setScannerOpen(false);

    try {
      const result = await offlineApi.getEquipmentByQr(qrValue);
      const equipment = result.data;
      
      if (!equipment) {
        setScanError(t('workOrder.invalidEquipment'));
        return;
      }
      
      await handleEquipmentSelected(equipment);
    } catch (err: any) {
      if (err.fromCache) {
        setScanError(t('workOrder.invalidEquipment'));
      } else if (err.message === 'offline_queued') {
        setScanError(t('workOrder.invalidEquipment'));
      } else {
        setScanError(t('errors.serverError'));
      }
    }
  };

  const handleEquipmentSelected = async (equipment: Equipment) => {
    setScanError(null);
    
    if (!equipment) {
      setScanError(t('workOrder.invalidEquipment'));
      return;
    }
    
    if (scannedEquipment.some(eq => eq.id === equipment.id)) {
      setScanError(t('workOrder.equipmentAlreadyAdded'));
      return;
    }

    if (id) {
      try {
        await workOrderService.addEquipment(id, equipment.id);
      } catch (apiErr: any) {
        if (apiErr.response?.status === 400 && apiErr.response?.data?.message?.includes('already')) {
          setScanError(t('workOrder.equipmentAlreadyAdded'));
          return;
        }
        console.warn('Failed to persist equipment to backend:', apiErr);
      }
    }

    setScannedEquipment(prev => [...prev, { ...equipment, addedAt: new Date() }]);
    setSuccess(t('workOrder.equipmentAdded'));
    setTimeout(() => setSuccess(null), 2000);
    setSelectedEquipmentId('');
    setScannerOpen(false);
  };

  const handleDropdownSelect = () => {
    if (selectedEquipmentId) {
      const equipment = availableEquipment.find(eq => eq.id === selectedEquipmentId);
      if (equipment) {
        handleEquipmentSelected(equipment);
      }
    }
  };

  const handleRemoveEquipment = async (equipmentId: string) => {
    // Try to remove from backend
    if (id) {
      try {
        await workOrderService.removeEquipment(id, equipmentId);
      } catch (apiErr) {
        console.warn('Failed to remove equipment from backend:', apiErr);
      }
    }
    // Remove from local state
    setScannedEquipment(prev => prev.filter(eq => eq.id !== equipmentId));
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await workOrderService.delete(id);
      navigate('/workorders');
    } catch (err: any) {
      console.error('Failed to delete work order:', err);
      alert(err?.response?.data?.message || 'Failed to delete work order');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditClick = () => {
    if (!workOrder) return;
    setEditFormData({
      type: workOrder.type,
      status: workOrder.status,
      siteId: workOrder.siteId,
      technicianId: workOrder.technicianId,
      plannedDate: new Date(workOrder.plannedDate).toISOString().slice(0, 10),
      plannedRemovalDate: workOrder.plannedRemovalDate ? new Date(workOrder.plannedRemovalDate).toISOString().slice(0, 10) : '',
    });
    Promise.all([
      siteService.getAll(),
      api.get('/settings/technicians').then(res => res.data),
    ]).then(([sitesData, techsData]) => {
      setSites(sitesData);
      setTechnicians(techsData);
      setShowEditForm(true);
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await workOrderService.update(id, {
        type: editFormData.type,
        status: editFormData.status,
        siteId: editFormData.siteId,
        technicianId: editFormData.technicianId,
        plannedDate: new Date(editFormData.plannedDate),
        plannedRemovalDate: editFormData.plannedRemovalDate ? new Date(editFormData.plannedRemovalDate) : undefined,
      });
      setShowEditForm(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update work order:', err);
      alert(err?.response?.data?.message || 'Failed to update work order');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!id) return;
    setShowStatusDropdown(false);
    setSaving(true);
    try {
      await workOrderService.update(id, { status: newStatus });
      setSuccess(t('app.success'));
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err?.response?.data?.message || t('errors.serverError'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500">{error || t('errors.notFound')}</div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          {t('app.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black">
            <h2 className="text-white font-semibold">{t('qrScanner.title')}</h2>
            <button onClick={closeScanner} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <BaseQrScanner onScan={handleScanQR} />
          </div>
          
          <div className="p-4 bg-black border-t border-gray-800">
            <div className="mb-3">
              <label className="text-gray-400 text-sm mb-2 block">{t('workOrder.selectEquipment')}</label>
              {loadingEquipment ? (
                <div className="text-gray-400 text-center py-3">{t('app.loading')}</div>
              ) : availableEquipment.length === 0 ? (
                <div className="text-gray-400 text-center py-3">{t('workOrder.noAvailableEquipment')}</div>
              ) : (
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary-500 outline-none"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.type} - {eq.qrTag}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDropdownSelect}
                disabled={!selectedEquipmentId || loadingEquipment}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {t('app.add')}
              </button>
              <button
                onClick={closeScanner}
                className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                {t('app.cancel')}
              </button>
            </div>
            {scannedEquipment.length > 0 && (
              <p className="text-gray-400 text-xs mt-3 text-center">
                {scannedEquipment.length} {t('workOrder.equipmentAttached')}
              </p>
            )}
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('app.edit')}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.type')}</label>
                <select
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as WorkOrderType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="installation">{t('workOrders.types.installation')}</option>
                  <option value="inspection">{t('workOrders.types.inspection')}</option>
                  <option value="removal">{t('workOrders.types.removal')}</option>
                  <option value="general">{t('workOrders.types.general')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.status')}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as WorkOrderStatus })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="open">{t('workOrders.statuses.open')}</option>
                  <option value="in_progress">{t('workOrders.statuses.in_progress')}</option>
                  <option value="completed">{t('workOrders.statuses.completed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.site')}</label>
                <select
                  value={editFormData.siteId}
                  onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.technician')}</label>
                <select
                  value={editFormData.technicianId}
                  onChange={(e) => setEditFormData({ ...editFormData, technicianId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.plannedDate')}</label>
                <input
                  type="date"
                  value={editFormData.plannedDate ? editFormData.plannedDate.slice(0, 10) : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, plannedDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.plannedRemoval')}</label>
                <input
                  type="date"
                  value={editFormData.plannedRemovalDate}
                  onChange={(e) => setEditFormData({ ...editFormData, plannedRemovalDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? t('app.loading') : t('app.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('app.back')}
        </button>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 p-1"
              title={t('app.delete')}
            >
              🗑️
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleEditClick}
              className="text-primary-600 hover:text-primary-700 p-1"
              title={t('app.edit')}
            >
              ✏️
            </button>
          )}
          <div className="relative">
            {canChangeStatus && showStatusDropdown ? (
              <select
                value={workOrder.status}
                onChange={(e) => handleStatusChange(e.target.value as WorkOrderStatus)}
                onBlur={() => setShowStatusDropdown(false)}
                autoFocus
                className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer ${statusColors[workOrder.status]}`}
              >
                <option value="open">{t('workOrders.statuses.open')}</option>
                <option value="in_progress">{t('workOrders.statuses.in_progress')}</option>
                <option value="completed">{t('workOrders.statuses.completed')}</option>
              </select>
            ) : (
              <button
                onClick={() => setShowStatusDropdown(true)}
                disabled={!canChangeStatus}
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[workOrder.status]} ${canChangeStatus ? 'cursor-pointer hover:opacity-80' : ''}`}
                title={canChangeStatus ? t('app.edit') : ''}
              >
                {t(`workOrders.statuses.${workOrder.status}`)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Offline indicator */}
      {(fromCache || syncStatus === 'offline' || syncStatus === 'pending') && (
        <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{t('sync.offline')} - {t('sync.syncedLater')}</span>
        </div>
      )}

      {scanError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center">
          {scanError}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-center">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{typeIcons[workOrder.type]}</span>
          <div>
            <h1 className="text-xl font-bold">{t(`workOrders.types.${workOrder.type}`)}</h1>
            <p className="text-sm text-gray-500">
              {formatDateFull(workOrder.plannedDate)}
            </p>
          </div>
        </div>

        {workOrder.site && (
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">{t('workOrder.siteDetails')}</h3>
            <p className="font-medium">{workOrder.site.name}</p>
            <p className="text-sm text-gray-500">{workOrder.site.address}</p>
            {workOrder.site.floor && (
              <p className="text-sm text-gray-500">{t('sites.floor')}: {workOrder.site.floor}</p>
            )}
            <div className="flex gap-2 mt-3">
              {workOrder.site.contact1Phone && (
                <button
                  onClick={() => handleCall(workOrder.site?.contact1Phone)}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                >
                  📞 {t('workOrder.callContact')}
                </button>
              )}
              <button
                onClick={() => handleNavigate(workOrder.site)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                🚗 {t('sites.navigate')}
              </button>
            </div>
          </div>
        )}

        {workOrder.type === 'removal' && workOrder.plannedRemovalDate && (
          <div className="p-3 bg-orange-50 rounded-lg mb-4">
            <p className="text-sm text-orange-800">
              {t('equipment.plannedRemoval')}: {formatDate(workOrder.plannedRemovalDate)}
            </p>
          </div>
        )}

        <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-700">{t('workOrders.status')}:</span>
            {canChangeStatus ? (
              <select
                value={workOrder.status}
                onChange={(e) => handleStatusChange(e.target.value as WorkOrderStatus)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${statusColors[workOrder.status]}`}
              >
                <option value="open">{t('workOrders.statuses.open')}</option>
                <option value="in_progress">{t('workOrders.statuses.in_progress')}</option>
                <option value="completed">{t('workOrders.statuses.completed')}</option>
              </select>
            ) : (
              <span className={`px-3 py-2 rounded-lg text-sm font-medium ${statusColors[workOrder.status]}`}>
                {t(`workOrders.statuses.${workOrder.status}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('workOrder.scanQRToAddEquipment')}</h2>
        </div>
        
        {scannedEquipment.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-600">{t('workOrder.scannedEquipment')}</h3>
            {scannedEquipment.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">{eq.type}</p>
                  <p className="text-sm text-gray-500">{eq.qrTag}</p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveEquipment(eq.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title={t('workOrder.removeEquipment')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { console.log('[QR] 📱 Opening scanner from WorkOrderDetails'); setScannerOpen(true); }}
          className="w-full py-4 sm:py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span className="font-medium text-base">{t('workOrder.scanQR')}</span>
        </button>
      </div>

      {checklistItems.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('workOrder.checklist')}</h2>
            {canEdit && (
              <button
                onClick={handleSaveChecklist}
                disabled={saving}
                className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? t('app.loading') : t('app.save')}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {checklistItems.map((item, index) => (
              <div key={item.id || index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={(e) => handleChecklistChange(index, 'isChecked', e.target.checked)}
                  disabled={!canEdit}
                  className="mt-1 w-5 h-5 rounded text-primary-600"
                />
                <div className="flex-1">
                  <p className={`font-medium ${item.isChecked ? 'line-through text-gray-400' : ''}`}>
                    {item.itemName}
                  </p>
                  {item.isChecked && (
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleChecklistChange(index, 'value', e.target.value)}
                      placeholder={t('workOrder.donePlaceholder')}
                      disabled={!canEdit}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">{t('workOrder.editNotes')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('workOrders.done')}
              </label>
              <textarea
                value={done}
                onChange={(e) => setDone(e.target.value)}
                placeholder={t('workOrder.donePlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('workOrders.todo')}
              </label>
              <textarea
                value={todo}
                onChange={(e) => setTodo(e.target.value)}
                placeholder={t('workOrder.todoPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? t('app.loading') : t('app.save')}
            </button>
          </div>
        </div>
      )}

      {workOrder.status === 'completed' && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-center">
          ✅ {t('workOrder.workOrderCompleted')}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={t('app.delete')}
          message={t('app.confirmDelete') + '?'}
          confirmLabel={t('app.delete')}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  );
}
