import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Site } from '../types';
import { siteService } from '../services/siteService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SiteWithStatus extends Site {
  statusCounts?: {
    red: number;
    orange: number;
    green: number;
  };
  overallStatus?: 'red' | 'orange' | 'green';
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
  const [showSiteList, setShowSiteList] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const data = await siteService.getWithEquipmentStatus() as SiteWithStatus[];
        setSites(data.filter(s => s.latitude && s.longitude));
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  const handleSiteClick = (site: SiteWithStatus) => {
    setSelectedSiteId(site.id);
    if (mapRef.current && site.latitude && site.longitude) {
      mapRef.current.setView([site.latitude, site.longitude], 15);
    }
  };

  const handleNavigate = (site: SiteWithStatus) => {
    if (site.latitude && site.longitude) {
      window.open(
        `https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`,
        '_blank'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [31.0461, 34.8516];

  return (
    <div className="space-y-3 sm:space-y-4 h-[calc(100vh-140px)] sm:h-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('map.title')}</h1>
        <button
          onClick={() => setShowSiteList(!showSiteList)}
          className="lg:hidden px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium min-h-[40px]"
        >
          {showSiteList ? t('map.title') : `📋 ${sites.length}`}
        </button>
      </div>

      {/* Mobile: Toggle between map and list, Desktop: Map takes most space */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full">
        {/* Map - takes most space on desktop (3/4) */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${showSiteList ? 'hidden lg:block' : ''} flex-1 min-h-[300px] sm:min-h-[400px] lg:flex-[3]`}>
          <MapContainer
            center={defaultCenter}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {sites.map((site) => (
              <Marker
                key={site.id}
                position={[site.latitude!, site.longitude!]}
                icon={getMarkerIcon(site.overallStatus, selectedSiteId === site.id)}
                eventHandlers={{
                  click: () => setSelectedSiteId(site.id),
                }}
              >
                <Popup>
                  <div className="text-center min-w-[150px]">
                    <h3 className="font-semibold">{site.name}</h3>
                    <p className="text-sm text-gray-600">{site.address}</p>
                    {site.statusCounts && (
                      <div className="mt-2 flex justify-center gap-2 text-xs">
                        {site.statusCounts.red > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">🔴 {site.statusCounts.red}</span>
                        )}
                        {site.statusCounts.orange > 0 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">🟠 {site.statusCounts.orange}</span>
                        )}
                        {site.statusCounts.green > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">🟢 {site.statusCounts.green}</span>
                        )}
                      </div>
                    )}
                    {site.isHighlighted && (
                      <span className="text-xs text-red-600">⚠️ {t('sites.highlight')}</span>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                      <button
                        onClick={() => handleNavigate(site)}
                        className="w-full px-2 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        🚗 {t('sites.navigate')}
                      </button>
                      <Link
                        to={`/sites/${site.id}`}
                        className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        {t('app.actions')}
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Site List - sidebar on desktop (1/4), overlay on mobile */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto ${showSiteList ? 'block' : 'hidden lg:block'} ${showSiteList ? 'max-h-[50vh]' : 'lg:max-h-[600px]'} lg:flex-1`}>
          <div className="p-3 sm:p-4">
            <h2 className="font-semibold mb-3 hidden lg:block">{t('sites.title')} ({sites.length})</h2>
            <div className="space-y-2">
              {sites.map((site) => (
                <div
                  key={site.id}
                  onClick={() => handleSiteClick(site)}
                  className={`p-2 sm:p-3 border border-gray-100 rounded-lg cursor-pointer transition-colors ${
                    selectedSiteId === site.id 
                      ? 'bg-primary-50 border-primary-300' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium text-sm truncate">{site.name}</h3>
                        {site.isHighlighted && <span className="text-yellow-500">⭐</span>}
                      </div>
                      <p className="text-xs text-gray-600 font-medium">{site.city}</p>
                      <p className="text-xs text-gray-400 truncate">{site.address}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(site);
                      }}
                      className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium whitespace-nowrap min-h-[32px]"
                    >
                      🚗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend - hidden on mobile to save space */}
      <div className="hidden sm:block bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('map.legend')}</h2>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span>🟢</span>
            <span className="text-xs sm:text-sm">{t('equipment.progress.green')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🟡</span>
            <span className="text-xs sm:text-sm">{t('equipment.progress.yellow')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🟠</span>
            <span className="text-xs sm:text-sm">{t('equipment.progress.orange')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔴</span>
            <span className="text-xs sm:text-sm">{t('equipment.progress.red')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
