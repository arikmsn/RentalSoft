import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { siteService } from '../services/siteService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SiteWithStatus {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  isHighlighted: boolean;
  overallStatus?: 'red' | 'orange' | 'green';
  workOrders?: Array<{
    id: string;
    status: string;
    type: string;
    plannedDate: Date | string;
  }>;
  equipmentCount?: number;
}

const statusColors = {
  red: '#ef4444',
  orange: '#f97316',
  green: '#22c55e',
};

const getMarkerIcon = (status?: 'red' | 'orange' | 'green', selected?: boolean) => {
  const color = statusColors[status || 'green'];
  const size = selected ? 32 : 24;
  const borderWidth = selected ? 4 : 3;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${borderWidth} solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ${selected ? 'z-index: 1000;' : ''}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

export function MapPage() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<SiteWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSiteList, setShowSiteList] = useState(false); // Start with map visible on mobile
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedBounds = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[Map] Fetching sites...');
        const sitesData: SiteWithStatus[] = [];
        try {
          const response = await siteService.getWithEquipmentStatus() as SiteWithStatus[];
          sitesData.push(...(response || []));
          console.log('[Map] Received', sitesData.length, 'sites');
          
          // Log first site as example
          if (sitesData.length > 0) {
            const example = sitesData[0];
            console.log('[Map] Example site:', {
              name: example.name,
              address: example.address,
              city: example.city,
              latitude: example.latitude,
              longitude: example.longitude,
            });
          }
        } catch (e) {
          console.error('[Map] Failed to fetch sites:', e);
        }
        
        setSites(sitesData);
      } catch (error: any) {
        console.error('[Map] Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filteredSites = sites
    .filter(site => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        site.name.toLowerCase().includes(searchLower) ||
        site.city.toLowerCase().includes(searchLower) ||
        site.address.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => a.city.localeCompare(b.city, 'he'));

  const handleSiteClick = (site: SiteWithStatus) => {
    console.log('[Map] handleSiteClick:', site.id, site.name);
    setSelectedSiteId(site.id);
    
    if (mapRef.current && site.latitude && site.longitude) {
      const lat = Number(site.latitude);
      const lng = Number(site.longitude);
      const currentZoom = mapRef.current.getZoom();
      console.log('[Map] Centering on site:', site.name, 'lat:', lat, 'lng:', lng, 'currentZoom:', currentZoom);
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
    if (window.innerWidth < 1024) {
      setShowSiteList(false);
    }
  };

  // Open popup when selectedSiteId changes
  useEffect(() => {
    if (!selectedSiteId || !mapRef.current) return;
    
    const site = sites.find(s => s.id === selectedSiteId);
    if (site && site.latitude && site.longitude) {
      const lat = Number(site.latitude);
      const lng = Number(site.longitude);
      
      const workOrdersHtml = site.workOrders && site.workOrders.length > 0
        ? `<div class="mt-2 text-xs text-right max-h-24 overflow-y-auto">
            <div class="font-medium text-surface-700 mb-1">הזמנות עבודה:</div>
            ${site.workOrders.map(wo => `
              <a href="/workorders/${wo.id}" class="block py-1 px-2 mb-1 bg-surface-50 hover:bg-surface-100 rounded text-primary-600 hover:text-primary-700 text-decoration-none truncate">
                ${t(`workOrders.types.${wo.type}`)} - ${new Date(wo.plannedDate).toLocaleDateString('he-IL')}
              </a>
            `).join('')}
          </div>`
        : '';

      const statusColorMap: Record<string, string> = {
        red: '#ef4444',
        orange: '#f97316',
        green: '#22c55e',
      };
      const statusLabelMap: Record<string, string> = {
        red: 'באיחור',
        orange: 'קרוב לפירוק',
        green: 'יש זמן',
      };

      const statusHtml = site.overallStatus
        ? `<div class="mt-2 flex items-center justify-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style="background-color: ${statusColorMap[site.overallStatus]}">
              ${site.overallStatus === 'red' ? '🔴' : site.overallStatus === 'orange' ? '🟠' : '🟢'}
              ${statusLabelMap[site.overallStatus]}
            </span>
          </div>`
        : '';

      const primaryWorkOrderId = site.workOrders && site.workOrders.length > 0 ? site.workOrders[0].id : null;
      const actionsUrl = primaryWorkOrderId ? `/workorders/${primaryWorkOrderId}` : `/sites/${site.id}`;

      const popup = L.popup({
        closeButton: true,
        className: 'site-popup'
      })
        .setLatLng([lat, lng])
        .setContent(`
          <div class="text-center min-w-[150px] p-1">
            <h3 class="font-semibold text-surface-800">${site.name}</h3>
            <p class="text-sm text-surface-600">${site.address}</p>
            ${statusHtml}
            ${site.isHighlighted ? `<span class="text-xs text-warning-600 font-medium">⚠️</span>` : ''}
            ${workOrdersHtml}
            <div class="mt-2 flex flex-col gap-1">
              <a href="https://www.waze.com/ul?ll=${lat},${lng}&q=${encodeURIComponent(site.address)}" target="_blank" rel="noopener noreferrer" class="w-full px-2 py-2 rounded-lg text-sm font-medium text-center text-white bg-primary-600 hover:bg-primary-700" style="color: #ffffff !important;">ניווט</a>
              <a href="${actionsUrl}" class="w-full px-2 py-2 bg-surface-100 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-200 text-center" style="color: #374151;">פעולות</a>
            </div>
          </div>
        `);
      
      mapRef.current.openPopup(popup);
    }
  }, [selectedSiteId, sites, t]);

  const handleNavigate = (site: SiteWithStatus) => {
    if (site.latitude && site.longitude) {
      window.open(
        `https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`,
        '_blank'
      );
    }
  };

  // Fit map bounds to markers only on initial load
  useEffect(() => {
    if (!mapRef.current || filteredSites.length === 0 || hasInitializedBounds.current) return;
    
    const coords = filteredSites
      .filter(s => s.latitude && s.longitude)
      .map(s => [Number(s.latitude), Number(s.longitude)] as [number, number]);
    
    if (coords.length > 0) {
      console.log('[Map] Fitting bounds to', coords.length, 'sites');
      hasInitializedBounds.current = true;
      const bounds = L.latLngBounds(coords);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      // Ensure map size is correct after fitting bounds
      setTimeout(() => {
        mapRef.current?.invalidateSize({ pan: false });
      }, 300);
    }
  }, [filteredSites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [31.0461, 34.8516];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 shrink-0 bg-white border-b border-surface-200">
        <h1 className="text-lg sm:text-xl font-bold text-surface-800">{t('map.title')}</h1>
        <button
          onClick={() => setShowSiteList(!showSiteList)}
          className="lg:hidden px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium min-h-[44px] shadow-sm hover:shadow-md transition-all"
        >
          {showSiteList ? t('map.title') : `📋 ${filteredSites.length}`}
        </button>
      </div>

      {/* Content - flex row on desktop, column on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map Container */}
        <div 
          ref={mapContainerRef}
          className="flex-1 relative min-h-[50vh] lg:min-h-0"
          style={{ height: '100%' }}
        >
          <MapContainer
            center={defaultCenter}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            whenReady={() => {
              setTimeout(() => {
                mapRef.current?.invalidateSize({ pan: false });
              }, 100);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Site Markers */}
            {filteredSites.map((site) => {
              const rawLat = site.latitude;
              const rawLng = site.longitude;
              const lat = Number(rawLat);
              const lng = Number(rawLng);
              
              // Skip sites with invalid or missing coordinates
              if (rawLat == null || rawLng == null) {
                console.warn('[Map] Skipping site - null coordinates:', site.name);
                return null;
              }
              
              if (isNaN(lat) || isNaN(lng)) {
                console.warn('[Map] Skipping site - invalid coordinates:', site.name, 'raw lat:', rawLat, 'raw lng:', rawLng);
                return null;
              }
              
              // Validate coordinates are in Israel range
              const isValidCoords = lat > 29 && lat < 35 && lng > 33 && lng < 36;
              if (!isValidCoords) {
                console.warn('[Map] Skipping site - outside Israel range:', site.name, 'lat:', lat, 'lng:', lng);
                return null;
              }
              
              console.log('[Map] Creating marker for site:', site.name, 'lat:', lat, 'lng:', lng, 'status:', site.overallStatus);
              
              return (
              <Marker
                key={site.id}
                position={[lat, lng]}
                icon={getMarkerIcon(site.overallStatus, selectedSiteId === site.id)}
                eventHandlers={{
                  click: () => handleSiteClick(site),
                }}
              >
                <Popup>
                  <div className="text-center min-w-[150px] p-1">
                    <h3 className="font-semibold text-surface-800">{site.name}</h3>
                    <p className="text-sm text-surface-600">{site.address}</p>
                    {site.overallStatus && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: statusColors[site.overallStatus] }}
                        >
                          {site.overallStatus === 'red' ? '🔴' : site.overallStatus === 'orange' ? '🟠' : '🟢'}
                          {site.overallStatus === 'red' ? 'באיחור' : site.overallStatus === 'orange' ? 'קרוב לפירוק' : 'יש זמן'}
                        </span>
                      </div>
                    )}
                    {site.isHighlighted && (
                      <span className="text-xs text-warning-600 font-medium">⚠️ {t('sites.highlight')}</span>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                      <button
                        onClick={() => handleNavigate(site)}
                        className="w-full px-2 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        🚗 {t('sites.navigate')}
                      </button>
                      <Link
                        to={`/sites/${site.id}`}
                        className="w-full px-2 py-2 bg-surface-100 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-200 transition-colors"
                      >
                        {t('app.actions')}
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Site List - sidebar on desktop, below map on mobile */}
        <div className={`bg-white overflow-auto lg:overflow-y-auto lg:flex-1 lg:max-w-[360px] ${showSiteList ? 'h-[50vh] lg:h-auto' : 'hidden lg:block'}`}>
          <div className="p-3 sm:p-4">
            <input
              type="text"
              placeholder={t('app.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 mb-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm bg-white text-surface-800 placeholder:text-surface-400"
            />
            <h2 className="font-semibold mb-3 text-surface-800">{t('sites.title')} ({filteredSites.length})</h2>
            <div className="space-y-2">
              {filteredSites.map((site) => (
                <div
                  key={site.id}
                  onClick={() => handleSiteClick(site)}
                  className={`p-3 sm:p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedSiteId === site.id 
                      ? 'bg-primary-50 border-primary-300 shadow-sm' 
                      : 'border-surface-100 hover:bg-surface-50 hover:border-surface-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium text-sm text-surface-800 truncate">{site.name}</h3>
                        {site.isHighlighted && <span className="text-warning-500">⭐</span>}
                      </div>
                      <p className="text-xs text-surface-600 font-medium mt-0.5">{site.city}</p>
                      <p className="text-xs text-surface-400 truncate mt-0.5">{site.address}</p>
                      {site.overallStatus && (
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: statusColors[site.overallStatus] }}
                          >
                            {site.overallStatus === 'red' ? '🔴' : site.overallStatus === 'orange' ? '🟠' : '🟢'}
                            {site.overallStatus === 'red' ? 'באיחור' : site.overallStatus === 'orange' ? 'קרוב' : 'יש זמן'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(site);
                      }}
                      className="ms-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] hover:bg-primary-700 transition-colors"
                    >
                      🚗
                    </button>
                  </div>
                </div>
              ))}
              {filteredSites.length === 0 && (
                <div className="text-center py-8 text-surface-500 text-sm">
                  {t('errors.notFound')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-3 sm:p-4 border-t border-surface-200 shrink-0">
        <h2 className="font-semibold mb-2 text-sm text-surface-800">{t('map.legend')}</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success-500"></span>
            <span className="text-xs text-surface-600">{t('equipment.progress.green')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning-500"></span>
            <span className="text-xs text-surface-600">{t('equipment.progress.orange')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger-500"></span>
            <span className="text-xs text-surface-600">{t('equipment.progress.red')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
