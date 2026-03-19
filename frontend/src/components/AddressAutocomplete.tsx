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

// ── Google Maps script loader (singleton) ──────────────────────────
let scriptStatus: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
const waiters: Array<() => void> = [];

function ensureGoogleMaps(): Promise<void> {
  // Already available (e.g. loaded by another component or a previous render)
  if (typeof google !== 'undefined' && google.maps?.places) {
    scriptStatus = 'loaded';
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (scriptStatus === 'loaded') { resolve(); return; }

    waiters.push(resolve);
    if (scriptStatus === 'loading') return; // script tag already appended

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Autocomplete] VITE_GOOGLE_MAPS_API_KEY is not set');
      scriptStatus = 'error';
      reject(new Error('Missing API key'));
      return;
    }

    scriptStatus = 'loading';
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

  // Stable handler that reads from refs
  const onPlaceChanged = useCallback(() => {
    const ac = acRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    console.log('[Autocomplete] place_changed fired', place?.name, place?.geometry?.location?.lat());

    if (!place.geometry?.location) {
      console.warn('[Autocomplete] No geometry on selected place');
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

    console.log('[Autocomplete] Parsed:', { street, city, lat, lng, formatted: place.formatted_address });

    // Update the React-controlled value
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
      if (!input) { console.warn('[Autocomplete] inputRef not ready'); return; }
      if (acRef.current) return; // already bound

      console.log('[Autocomplete] Initializing Autocomplete on input');

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

  // ── Render ─────────────────────────────────────────────────────
  // We use an **uncontrolled** input so Google can freely mutate its value.
  // We sync the initial / programmatic value via defaultValue + imperative set.
  const lastPushedValue = useRef(value);

  useEffect(() => {
    // Only push value changes that come from outside (e.g. form reset)
    if (inputRef.current && value !== lastPushedValue.current) {
      inputRef.current.value = value;
      lastPushedValue.current = value;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    lastPushedValue.current = val;
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
