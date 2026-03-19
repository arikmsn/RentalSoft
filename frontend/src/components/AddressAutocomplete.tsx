import { useRef, useEffect, useCallback } from 'react';

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

// Track whether the Google Maps script is loading / loaded
let googleScriptStatus: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
const loadCallbacks: Array<() => void> = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (googleScriptStatus === 'loaded') {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleScriptStatus === 'loading') return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[AddressAutocomplete] VITE_GOOGLE_MAPS_API_KEY is not set');
      googleScriptStatus = 'error';
      reject(new Error('Missing Google Maps API key'));
      return;
    }

    googleScriptStatus = 'loading';

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=he&region=IL`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleScriptStatus = 'loaded';
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    script.onerror = () => {
      googleScriptStatus = 'error';
      console.error('[AddressAutocomplete] Failed to load Google Maps script');
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '',
  required = false,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const skipNextChange = useRef(false);

  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) {
      console.warn('[AddressAutocomplete] Place has no geometry:', place);
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Extract address components
    let street = '';
    let city = '';

    if (place.address_components) {
      for (const comp of place.address_components) {
        if (comp.types.includes('route')) {
          street = comp.long_name;
        }
        if (comp.types.includes('locality')) {
          city = comp.long_name;
        }
        if (!city && comp.types.includes('administrative_area_level_2')) {
          city = comp.long_name;
        }
      }
    }

    // Fallback: use structured_formatting or name
    if (!street && place.name) {
      street = place.name;
    }

    skipNextChange.current = true;
    onChange(street);

    onSelect({
      address: street,
      city,
      latitude: lat,
      longitude: lng,
    });

    console.log('[AddressAutocomplete] Selected:', { street, city, lat, lng, formattedAddress: place.formatted_address });
  }, [onChange, onSelect]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMapsScript();
      } catch {
        return;
      }

      if (cancelled || !inputRef.current) return;
      if (autocompleteRef.current) return; // Already initialized

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'il' },
        fields: ['geometry', 'address_components', 'formatted_address', 'name'],
      });

      autocomplete.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = autocomplete;
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [handlePlaceChanged]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (skipNextChange.current) {
      skipNextChange.current = false;
      return;
    }
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
    </div>
  );
}
