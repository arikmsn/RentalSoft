import { useRef, useEffect, useCallback } from 'react';

export interface AddressSelection {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

// ── Singleton: fetch key + load script ─────────────────────────────
let scriptStatus: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
const waiters: Array<() => void> = [];

async function fetchApiKey(): Promise<string> {
  // 1. Try Vite build-time env (works when frontend is built with the var)
  const buildTimeKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (buildTimeKey) {
    console.log('[Autocomplete] Using build-time API key');
    return buildTimeKey;
  }

  // 2. Fetch from backend /api/config/public (works when key is only on server)
  console.log('[Autocomplete] No build-time key, fetching from backend…');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${apiUrl}/config/public`);
    if (res.ok) {
      const data = await res.json();
      if (data.googleMapsApiKey) {
        console.log('[Autocomplete] Got API key from backend');
        return data.googleMapsApiKey;
      }
    }
  } catch (err) {
    console.error('[Autocomplete] Failed to fetch key from backend:', err);
  }

  return '';
}

function ensureGoogleMaps(): Promise<void> {
  // Already available
  if (typeof google !== 'undefined' && google.maps?.places) {
    scriptStatus = 'loaded';
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (scriptStatus === 'loaded') { resolve(); return; }
    waiters.push(resolve);
    if (scriptStatus === 'loading') return;

    scriptStatus = 'loading';

    (async () => {
      const apiKey = await fetchApiKey();
      if (!apiKey) {
        console.error('[Autocomplete] No Google Maps API key available');
        scriptStatus = 'error';
        reject(new Error('Missing API key'));
        return;
      }

      console.log('[Autocomplete] Loading Google Maps script…');
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=he&region=IL`;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        console.log('[Autocomplete] Google Maps script loaded');
        scriptStatus = 'loaded';
        waiters.forEach((cb) => cb());
        waiters.length = 0;
      };
      s.onerror = () => {
        console.error('[Autocomplete] Google Maps script FAILED to load');
        scriptStatus = 'error';
        reject(new Error('Script load error'));
      };
      document.head.appendChild(s);
    })();
  });
}

// ── Component ──────────────────────────────────────────────────────
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '',
  required = false,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Keep latest callbacks in refs so the place_changed listener is never stale
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Stable handler
  const onPlaceChanged = useCallback(() => {
    const ac = acRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    console.log('[Autocomplete] place_changed', place?.name);

    if (!place.geometry?.location) {
      console.warn('[Autocomplete] No geometry');
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    let street = '';
    let city = '';

    if (place.address_components) {
      for (const c of place.address_components) {
        if (c.types.includes('route')) street = c.long_name;
        if (c.types.includes('locality')) city = c.long_name;
        if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
      }
    }
    if (!street && place.name) street = place.name;

    console.log('[Autocomplete] Parsed:', { street, city, lat, lng });

    onChangeRef.current(street);
    onSelectRef.current({ address: street, city, latitude: lat, longitude: lng });
  }, []);

  // Init once
  useEffect(() => {
    let dead = false;

    (async () => {
      try { await ensureGoogleMaps(); } catch { return; }
      if (dead) return;

      const input = inputRef.current;
      if (!input || acRef.current) return;

      console.log('[Autocomplete] Initializing on input element');

      const ac = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'il' },
        fields: ['geometry', 'address_components', 'formatted_address', 'name'],
      });

      ac.addListener('place_changed', onPlaceChanged);
      acRef.current = ac;
      console.log('[Autocomplete] Ready');
    })();

    return () => { dead = true; };
  }, [onPlaceChanged]);

  // ── Uncontrolled input with imperative sync ────────────────────
  const lastPushed = useRef(value);

  useEffect(() => {
    if (inputRef.current && value !== lastPushed.current) {
      inputRef.current.value = value;
      lastPushed.current = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    lastPushed.current = val;
    onChange(val);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onInput={handleInput}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
    </div>
  );
}
