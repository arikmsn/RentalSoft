import { useState, useRef, useEffect, useCallback } from 'react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    state?: string;
    country?: string;
  };
}

export interface AddressSelection {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  city?: string;
  onChange: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function AddressAutocomplete({
  value,
  city,
  onChange,
  onSelect,
  placeholder = '',
  required = false,
  className = '',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const searchQuery = city ? `${query}, ${city}, ישראל` : `${query}, ישראל`;
      const encoded = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=il&addressdetails=1&accept-language=he`,
        { headers: { 'User-Agent': 'RentalSoft/1.0', 'Accept-Language': 'he' } }
      );
      
      if (response.ok) {
        const data: NominatimResult[] = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (err) {
      console.error('[AddressAutocomplete] Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [city]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 400);
  };

  const formatDisplayName = (result: NominatimResult): string => {
    const addr = result.address;
    const parts: string[] = [];
    if (addr?.road) parts.push(addr.road);
    const cityName = addr?.city || addr?.town || addr?.village || '';
    if (cityName) parts.push(cityName);
    if (parts.length > 0) return parts.join(', ');
    // Fallback: take the first 2-3 comma parts of display_name
    const displayParts = result.display_name.split(',').map(s => s.trim());
    return displayParts.slice(0, 3).join(', ');
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    const addr = result.address;
    // Extract street name only (no house number)
    const street = addr?.road || result.display_name.split(',')[0].trim();
    const cityStr = addr?.city || addr?.town || addr?.village || '';

    skipNextSearch.current = true;
    onChange(street);
    setShowSuggestions(false);
    setSuggestions([]);

    onSelect({
      address: street,
      city: cityStr,
      latitude: lat,
      longitude: lng,
    });

    console.log('[AddressAutocomplete] Selected:', { street, city: cityStr, lat, lng, displayName: result.display_name });
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs">
          ...
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-right px-4 py-3 hover:bg-surface-50 text-sm text-surface-700 border-b border-surface-100 last:border-b-0 transition-colors"
            >
              {formatDisplayName(result)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
