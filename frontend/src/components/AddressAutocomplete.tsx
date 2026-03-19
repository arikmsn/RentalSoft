import { useRef, useEffect, useCallback, useState } from 'react';

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

// ── Singleton: Google Maps loader ──────────────────────────────────
let cachedApiKey: string | null = null;
let googleReady = false;
let googleLoadPromise: Promise<boolean> | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Try build-time env
  const buildKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (buildKey) {
    console.log('[Autocomplete] Using build-time API key');
    cachedApiKey = buildKey;
    return buildKey;
  }

  // 2. Fetch from backend
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  console.log('[Autocomplete] Fetching API key from', apiUrl + '/config/public');
  try {
    const res = await fetch(`${apiUrl}/config/public`);
    if (!res.ok) {
      console.error('[Autocomplete] /api/config/public returned', res.status);
      return '';
    }
    const data = await res.json();
    console.log('[Autocomplete] /api/config/public response:', { hasKey: !!data.googleMapsApiKey });
    if (data.googleMapsApiKey) {
      cachedApiKey = data.googleMapsApiKey;
      return data.googleMapsApiKey;
    }
  } catch (err) {
    console.error('[Autocomplete] Failed to fetch config:', err);
  }

  return '';
}

function loadGoogleMaps(): Promise<boolean> {
  // Already loaded
  if (googleReady || (typeof google !== 'undefined' && google?.maps?.places)) {
    googleReady = true;
    return Promise.resolve(true);
  }

  // Already in-flight
  if (googleLoadPromise) return googleLoadPromise;

  googleLoadPromise = (async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('[Autocomplete] No API key - cannot load Google Maps');
      googleLoadPromise = null; // Allow retry
      return false;
    }

    // Check if script tag already exists (e.g. from a previous attempt)
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('[Autocomplete] Google Maps script tag already in DOM, waiting...');
      // Wait for it to finish loading
      return new Promise<boolean>((resolve) => {
        const check = setInterval(() => {
          if (typeof google !== 'undefined' && google?.maps?.places) {
            clearInterval(check);
            googleReady = true;
            resolve(true);
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(false); }, 10000);
      });
    }

    console.log('[Autocomplete] Loading Google Maps script...');
    return new Promise<boolean>((resolve) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=he&region=IL`;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        console.log('[Autocomplete] Google Maps script loaded successfully');
        googleReady = true;
        resolve(true);
      };
      s.onerror = (err) => {
        console.error('[Autocomplete] Google Maps script failed to load', err);
        googleLoadPromise = null; // Allow retry
        resolve(false);
      };
      document.head.appendChild(s);
    });
  })();

  return googleLoadPromise;
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
  const [ready, setReady] = useState(false);

  // Keep latest callbacks in refs
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const onPlaceChanged = useCallback(() => {
    const ac = acRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    console.log('[Autocomplete] place_changed fired:', place?.name);

    if (!place.geometry?.location) {
      console.warn('[Autocomplete] Place has no geometry');
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

    console.log('[Autocomplete] Selected:', { street, city, lat, lng });

    onChangeRef.current(street);
    onSelectRef.current({ address: street, city, latitude: lat, longitude: lng });
  }, []);

  // Load Google Maps and init Autocomplete
  useEffect(() => {
    let cancelled = false;

    console.log('[Autocomplete] Component mounted, starting init...');

    (async () => {
      const loaded = await loadGoogleMaps();
      if (cancelled) return;

      if (!loaded) {
        console.error('[Autocomplete] Google Maps did not load');
        return;
      }

      const input = inputRef.current;
      if (!input) {
        console.warn('[Autocomplete] Input ref not ready');
        return;
      }

      if (acRef.current) {
        console.log('[Autocomplete] Already initialized');
        setReady(true);
        return;
      }

      console.log('[Autocomplete] Creating Autocomplete instance...');

      const ac = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'il' },
        fields: ['geometry', 'address_components', 'formatted_address', 'name'],
      });

      ac.addListener('place_changed', onPlaceChanged);
      acRef.current = ac;
      setReady(true);
      console.log('[Autocomplete] Ready - suggestions should now appear when typing');
    })();

    return () => { cancelled = true; };
  }, [onPlaceChanged]);

  // Sync value from parent (e.g. form reset)
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
      {!ready && (
        <div className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-300 text-xs pointer-events-none">
          ...
        </div>
      )}
    </div>
  );
}
