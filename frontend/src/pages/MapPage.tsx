import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { siteService } from '../services/siteService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface MapFilters {
  status: ('open' | 'in_progress' | 'completed')[];
  cities: string[];
  colors: ('black' | 'red' | 'orange' | 'green')[];
  nearMe: boolean;
  userLat?: number;
  userLng?: number;
}

const emptyFilters: MapFilters = {
  status: [],
  cities: [],
  colors: [],
  nearMe: false,
};

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
  houseNumber?: string | null;
  floor?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isHighlighted: boolean;
  overallStatus?: 'black' | 'red' | 'orange' | 'green' | null;
  earliestRemovalDate?: string | null;
  workOrders?: Array<{
    id: string;
    status: string;
    type: string;
    workTypeName?: string;
    plannedDate: Date | string;
    plannedRemovalDate?: Date | string | null;
    isNextVisitPotentialRemoval?: boolean;
  }>;
  equipmentCount?: number;
  hasEquipment?: boolean;
  hasPotentialRemoval?: boolean;
}

const statusColors: Record<string, string> = {
  black: '#1f2937',
  red: '#dc2626',
  orange: '#ea580c',
  green: '#16a34a',
};

const getMarkerIcon = (status?: 'black' | 'red' | 'orange' | 'green' | null, selected?: boolean, hasEquipment?: boolean, hasPotentialRemoval?: boolean) => {
  const color = status ? statusColors[status] : '#9ca3af';
  const size = selected ? 32 : 24;
  const borderWidth = selected ? 4 : 4;
  const isHollow = !hasEquipment;
  const innerIcon = hasPotentialRemoval ? 'פ' : '';
  const borderColor = isHollow ? color : (status === 'green' ? '#15803d' : (status === 'orange' ? '#c2410c' : (status === 'red' ? '#b91c1c' : (status === 'black' ? '#000000' : 'white'))));
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${isHollow ? 'transparent' : color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${borderWidth} solid ${borderColor};
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      ${selected ? 'z-index: 1000;' : ''}
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${hasPotentialRemoval ? '14px' : '0'};
      color: white;
      font-weight: bold;
    ">${innerIcon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

function MapEventHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  useMapEvents({
    moveend: (e) => {
      if (e.target) {
        onBoundsChange(e.target.getBounds());
      }
    },
    zoomend: (e) => {
      if (e.target) {
        onBoundsChange(e.target.getBounds());
      }
    },
  });
  return null;
}

export function MapPage() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<SiteWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSiteList, setShowSiteList] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedBounds = useRef(false);

  // Filters state
  const [filters, setFilters] = useState<MapFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Calculate distance between two coordinates (km)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Request user location
  const requestUserLocation = (centerMap = true) => {
    if (!navigator.geolocation) {
      setLocationError('הדפדפן אינו תומך במיקום');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        setLocationLoading(false);
        if (centerMap && mapRef.current) {
          mapRef.current.panTo([newLocation.lat, newLocation.lng], { animate: true, duration: 0.5 });
        }
      },
      (error) => {
        let errorMsg = 'שגיאה בקבלת מיקום';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'הרשאת מיקום נדחתה';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'המיקום אינו זמין';
        }
        setLocationError(errorMsg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Get unique cities from sites
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    sites.forEach(site => {
      if (site.city) citySet.add(site.city);
    });
    return Array.from(citySet).sort();
  }, [sites]);

  // Calculate status color for a site (based on work orders)
  const getSiteStatusColor = (site: SiteWithStatus): 'black' | 'red' | 'orange' | 'green' => {
    if (!site.earliestRemovalDate) return 'green';
    const days = Math.ceil((new Date(site.earliestRemovalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'black';
    if (days <= 3) return 'red';
    if (days <= 7) return 'orange';
    return 'green';
  };

  // Count active filters
  const activeFilterCount = 
    filters.status.length + 
    filters.cities.length + 
    filters.colors.length + 
    (filters.nearMe ? 1 : 0);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

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
    .filter(site => {
      // Status filter
      if (filters.status.length > 0) {
        const siteHasOpenWo = site.workOrders?.some(wo => wo.status === 'open');
        const siteHasInProgressWo = site.workOrders?.some(wo => wo.status === 'in_progress');
        const siteHasCompletedWo = site.workOrders?.some(wo => wo.status === 'completed');
        
        if (filters.status.includes('open') && !siteHasOpenWo) return false;
        if (filters.status.includes('in_progress') && !siteHasInProgressWo) return false;
        if (filters.status.includes('completed') && !siteHasCompletedWo) return false;
      }
      return true;
    })
    .filter(site => {
      // City filter
      if (filters.cities.length > 0) {
        if (!filters.cities.includes(site.city)) return false;
      }
      return true;
    })
    .filter(site => {
      // Color filter
      if (filters.colors.length > 0) {
        const siteColor = getSiteStatusColor(site);
        if (!filters.colors.includes(siteColor)) return false;
      }
      return true;
    })
    .filter(site => {
      // Near me filter (10km radius)
      if (filters.nearMe && userLocation && site.latitude && site.longitude) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, Number(site.latitude), Number(site.longitude));
        if (distance > 10) return false;
      }
      return true;
    })
    .sort((a, b) => a.city.localeCompare(b.city, 'he'));

  const viewportFilteredSites = mapBounds
    ? filteredSites.filter(site => {
        if (!site.latitude || !site.longitude) return false;
        const lat = Number(site.latitude);
        const lng = Number(site.longitude);
        return mapBounds.contains([lat, lng]);
      })
    : filteredSites;

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
      
      const primaryWo = site.workOrders && site.workOrders.length > 0 ? site.workOrders[0] : null;
      const workType = primaryWo ? (primaryWo.workTypeName || primaryWo.type) : null;
      const woDetailUrl = primaryWo ? `/workorders/${primaryWo.id}` : `/sites/${site.id}`;

      const fullAddress = site.address;

      // Installation date from earliest work order
      const installationDate = site.workOrders && site.workOrders.length > 0
        ? new Date(site.workOrders[site.workOrders.length - 1].plannedDate).toLocaleDateString('he-IL')
        : null;

      // Removal date
      const removalDate = site.earliestRemovalDate
        ? new Date(site.earliestRemovalDate).toLocaleDateString('he-IL')
        : null;

      const statusColorMap: Record<string, string> = {
        black: '#1f2937', red: '#ef4444', orange: '#f97316', green: '#22c55e',
      };
      const statusLabelMap: Record<string, string> = {
        black: 'עבר תאריך', red: 'בימים הקרובים', orange: 'מתקרב', green: 'יש זמן',
      };
      const statusEmojiMap: Record<string, string> = {
        black: '⚫', red: '🔴', orange: '🟠', green: '🟢',
      };

      let statusHtml = '';
      if (!site.hasEquipment) {
        statusHtml = `<div style="margin-top:8px; display:flex; justify-content:center;">
            <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; color:#9ca3af; background-color:transparent; border:2px solid #9ca3af;">
              ⚪ אין ציוד
            </span>
          </div>`;
      } else if (site.overallStatus) {
        statusHtml = `<div style="margin-top:8px; display:flex; justify-content:center;">
            <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; color:#fff; background-color:${statusColorMap[site.overallStatus]};">
              ${statusEmojiMap[site.overallStatus]} ${statusLabelMap[site.overallStatus]}
            </span>
          </div>`;
      }

      const popup = L.popup({
        closeButton: true,
        className: 'site-popup',
        maxWidth: 280,
        minWidth: 200,
      })
        .setLatLng([lat, lng])
        .setContent(`
          <div style="text-align:right; min-width:200px; padding:4px; font-family:Inter,system-ui,sans-serif;">
            <div style="font-weight:700; font-size:15px; color:#1e293b;">${site.name}</div>
            <div style="font-size:12px; color:#475569; margin-top:2px; line-height:1.4;">${fullAddress}</div>
            ${workType ? `<div style="font-size:11px; color:#64748b; margin-top:2px;">${workType}</div>` : ''}
            <div style="margin-top:8px; font-size:11px; line-height:1.6;">
              ${installationDate ? `<div><span style="color:#64748b; font-weight:500;">תאריך התקנה:</span> <span style="color:#1e293b; font-weight:600;">${installationDate}</span></div>` : ''}
              ${removalDate ? `<div><span style="color:#64748b; font-weight:500;">מתפנה בתאריך:</span> <span style="color:#1e293b; font-weight:600;">${removalDate}</span></div>` : ''}
            </div>
            ${statusHtml}
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
              <a href="https://www.waze.com/ul?ll=${lat},${lng}&q=${encodeURIComponent(fullAddress)}" target="_blank" rel="noopener noreferrer" style="display:block; padding:8px 12px; border-radius:10px; font-size:13px; font-weight:600; text-align:center; color:#fff; background:#0284c7; text-decoration:none;">ניווט</a>
              <a href="${woDetailUrl}" style="display:block; padding:8px 12px; border-radius:10px; font-size:13px; font-weight:500; text-align:center; color:#475569; background:#f1f5f9; text-decoration:none;">פירוט</a>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => requestUserLocation(true)}
            disabled={locationLoading}
            className="p-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium min-h-[44px] shadow-sm hover:shadow-md transition-all flex items-center justify-center"
            title="המיקום שלי"
          >
            {locationLoading ? (
              <svg className="w-5 h-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border rounded-xl transition-all flex items-center gap-2 min-h-[44px] ${
              showFilters || activeFilterCount > 0
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">סינון</span>
            {activeFilterCount > 0 && (
              <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setShowSiteList(!showSiteList)}
            className="lg:hidden px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium min-h-[44px] shadow-sm hover:shadow-md transition-all"
          >
            {showSiteList ? t('map.title') : `📋 ${showSiteList && mapBounds ? viewportFilteredSites.length : filteredSites.length}`}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 border-b border-surface-200 space-y-4">
          {/* Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">סטטוס</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'open' as const, label: 'פתוח' },
                { key: 'in_progress' as const, label: 'בביצוע' },
                { key: 'completed' as const, label: 'הושלם' },
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      status: prev.status.includes(status.key)
                        ? prev.status.filter(s => s !== status.key)
                        : [...prev.status, status.key]
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.status.includes(status.key)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">צבע (דחיפות)</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'black' as const, label: 'שחור', color: 'bg-surface-800' },
                { key: 'red' as const, label: 'אדום', color: 'bg-danger-500' },
                { key: 'orange' as const, label: 'כתום', color: 'bg-warning-500' },
                { key: 'green' as const, label: 'ירוק', color: 'bg-success-500' },
              ].map((color) => (
                <button
                  key={color.key}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      colors: prev.colors.includes(color.key)
                        ? prev.colors.filter(c => c !== color.key)
                        : [...prev.colors, color.key]
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filters.colors.includes(color.key)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${color.color}`}></span>
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cities Filter */}
          {cities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-700 mb-2">ערים</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {cities.slice(0, 20).map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        cities: prev.cities.includes(city)
                          ? prev.cities.filter(c => c !== city)
                          : [...prev.cities, city]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filters.cities.includes(city)
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Near Me Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">קרוב אלי</h3>
            <button
              onClick={() => {
                if (filters.nearMe) {
                  setFilters(prev => ({ ...prev, nearMe: false }));
                } else {
                  if (!userLocation) {
                    requestUserLocation(false);
                  }
                  if (userLocation) {
                    setFilters(prev => ({ ...prev, nearMe: true, userLat: userLocation.lat, userLng: userLocation.lng }));
                  }
                }
              }}
              disabled={locationLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filters.nearMe
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationLoading ? 'מאתר...' : 'קרוב אלי (עד 10 ק"מ)'}
            </button>
            {locationError && (
              <p className="text-xs text-danger-600 mt-1">{locationError}</p>
            )}
            {filters.nearMe && !userLocation && !locationLoading && (
              <button
                onClick={() => requestUserLocation(false)}
                className="text-xs text-primary-600 underline mt-1"
              >
                לחץ כאן לאפשר מיקום
              </button>
            )}
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="text-sm text-danger-600 hover:text-danger-700"
            >
              נקה פילטרים
            </button>
          )}
        </div>
      )}

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
            <MapEventHandler onBoundsChange={handleBoundsChange} />
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: `<div style="
                    background-color: #3b82f6;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 4px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  "></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                  popupAnchor: [0, -10],
                })}
              />
            )}
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
                icon={getMarkerIcon(site.overallStatus, selectedSiteId === site.id, site.hasEquipment, site.hasPotentialRemoval)}
                eventHandlers={{
                  click: () => handleSiteClick(site),
                }}
              >
                <Popup>
                  <div className="text-right min-w-[180px] p-1">
                    <h3 className="font-semibold text-surface-800 text-sm">
                      {site.name}
                    </h3>
                    <p className="text-xs text-surface-600 mt-1">
                      {site.address}{site.floor ? `, קומה ${site.floor}` : ''}
                    </p>
                    {site.workOrders && site.workOrders.length > 0 && (
                      <div className="mt-2 text-xs space-y-0.5">
                        <div><span className="font-medium text-surface-600">תאריך התקנה:</span> <span className="text-surface-800">{new Date(site.workOrders[site.workOrders.length - 1].plannedDate).toLocaleDateString('he-IL')}</span></div>
                        {site.earliestRemovalDate && (
                          <div><span className="font-medium text-surface-600">מתפנה בתאריך:</span> <span className="text-surface-800">{new Date(site.earliestRemovalDate).toLocaleDateString('he-IL')}</span></div>
                        )}
                      </div>
                    )}
                    {site.overallStatus && (
                      <div className="mt-2 flex items-center justify-center">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: statusColors[site.overallStatus] }}
                        >
                            {site.overallStatus === 'black' ? '⚫' : site.overallStatus === 'red' ? '🔴' : site.overallStatus === 'orange' ? '🟠' : '🟢'}
                            {site.overallStatus === 'black' ? 'עבר תאריך' : site.overallStatus === 'red' ? 'בימים הקרובים' : site.overallStatus === 'orange' ? 'מתקרב' : 'יש זמן'}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                      <button
                        onClick={() => handleNavigate(site)}
                        className="w-full px-2 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        ניווט
                      </button>
                      <Link
                        to={site.workOrders && site.workOrders.length > 0 ? `/workorders/${site.workOrders[0].id}` : `/sites/${site.id}`}
                        className="w-full px-2 py-2 bg-surface-100 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-200 transition-colors text-center"
                      >
                        פירוט
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
            <h2 className="font-semibold mb-3 text-surface-800">
              {t('sites.title')} ({showSiteList && mapBounds ? viewportFilteredSites.length : filteredSites.length})
              {showSiteList && mapBounds && viewportFilteredSites.length !== filteredSites.length && (
                <span className="text-xs text-surface-500 mr-2">(מסונן לפי המפה)</span>
              )}
            </h2>
            <div className="space-y-2">
              {(showSiteList && mapBounds ? viewportFilteredSites : filteredSites).map((site) => (
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
                            {site.overallStatus === 'black' ? '⚫' : site.overallStatus === 'red' ? '🔴' : site.overallStatus === 'orange' ? '🟠' : '🟢'}
                            {site.overallStatus === 'black' ? 'עבר' : site.overallStatus === 'red' ? 'בימים הקרובים' : site.overallStatus === 'orange' ? 'מתקרב' : 'יש זמן'}
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
            <span className="w-3 h-3 rounded-full bg-gray-700"></span>
            <span className="text-xs text-surface-600">עבר תאריך</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success-500"></span>
            <span className="text-xs text-surface-600">{t('equipment.progress.green')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning-500"></span>
            <span className="text-xs text-surface-600">מתקרב</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger-500"></span>
            <span className="text-xs text-surface-600">בימים הקרובים</span>
          </div>
        </div>
      </div>
    </div>
  );
}
