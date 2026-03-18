import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

console.log('[QR] Scanner file loaded');

type ScannerStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'not-supported' | 'not-secure' | 'in-use' | 'dom-error';

interface QRScannerProps {
  onScan: (qrValue: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  console.log('[QR] 🔧 Scanner component rendered');
  
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const mountedRef = useRef(true);

  const scannerId = 'qr-scanner';

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.error('[QR] Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    console.log('[QR] Scan success:', decodedText);
    stopCamera().then(() => {
      onScan(decodedText);
    });
  }, [onScan, stopCamera]);

  const mapErrorToStatus = useCallback((err: Error): { status: ScannerStatus; message: string } => {
    const errorName = err.name || '';
    const errorMessage = err.message || '';
    
    console.error('[QR] Camera error:', errorName, errorMessage);

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return { status: 'denied', message: t('qrScanner.denied') };
    }
    
    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return { status: 'not-supported', message: t('qrScanner.notSupported') };
    }
    
    if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorMessage.includes('not readable')) {
      return { status: 'in-use', message: t('qrScanner.inUse') };
    }
    
    if (errorName === 'OverconstrainedError') {
      return { status: 'not-supported', message: t('qrScanner.notSupported') };
    }

    return { status: 'denied', message: t('qrScanner.cameraError') };
  }, [t]);

  // Initialize scanner after component mounts - use setTimeout to ensure DOM is ready
  useEffect(() => {
    mountedRef.current = true;
    console.log('[QR] 🚀 Starting permission flow');
    
    const initScanner = async () => {
      try {
        setStatus('requesting');
        setError(null);

        console.log('[QR] location.protocol:', window.location.protocol);
        console.log('[QR] hostname:', window.location.hostname);
        console.log('[QR] has mediaDevices:', !!navigator.mediaDevices);
        console.log('[QR] has getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log('[QR] mediaDevices not supported');
          setStatus('not-supported');
          setError(t('qrScanner.notSupported'));
          return;
        }

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isSecure = protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
        
        console.log('[QR] isSecure:', isSecure, { protocol, hostname });
        
        if (!isSecure) {
          console.log('[QR] Not secure connection');
          setStatus('not-secure');
          setError(t('qrScanner.notSecure'));
          return;
        }

        // Use setTimeout to ensure DOM is fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mountedRef.current) return;

        console.log('[QR] Looking for DOM element...');
        const container = document.getElementById(scannerId);
        
        if (!container) {
          console.error('[QR] qr-scanner element NOT found in DOM');
          setStatus('dom-error');
          setError(t('qrScanner.notSupported'));
          return;
        }
        
        console.log('[QR] DOM element found, creating Html5Qrcode...');

        scannerRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        console.log('[QR] Starting Html5Qrcode scanner...');
        
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            console.log('[QR] QR code detected:', decodedText);
            handleScanSuccess(decodedText);
          },
          (_errorMessage) => {
            // Normal when no QR in frame - ignore
          }
        );

        if (!mountedRef.current) {
          await scannerRef.current.stop();
          return;
        }

        console.log('[QR] Scanner started successfully');
        setStatus('granted');
      } catch (err: any) {
        if (!mountedRef.current) return;
        console.error('[QR] Failed to start scanner:', err);
        const { status: errorStatus, message } = mapErrorToStatus(err);
        setStatus(errorStatus);
        setError(message);
      }
    };

    initScanner();

    return () => {
      console.log('[QR] Cleaning up scanner on unmount');
      mountedRef.current = false;
      stopCamera();
    };
  }, [t, handleScanSuccess, mapErrorToStatus, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
    }
  };

  const showManualInput = status === 'denied' || status === 'not-supported' || status === 'not-secure' || status === 'in-use' || status === 'dom-error';

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black">
        <h2 className="text-white font-semibold">{t('qrScanner.title')}</h2>
        <button onClick={onClose} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {status === 'requesting' && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>{t('qrScanner.requesting')}</p>
          </div>
        )}

        {status === 'granted' && (
          <div id={scannerId} className="w-full max-w-sm mx-auto" />
        )}

        {showManualInput && (
          <div className="text-white text-center p-4 max-w-sm">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-gray-400 text-sm">{t('qrScanner.manualHint')}</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>{t('qrScanner.initializing')}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-black">
        {/* Always render the container element - required by Html5Qrcode */}
        <div 
          id={scannerId} 
          style={{ display: status === 'granted' ? 'block' : 'none' }}
          className="w-full max-w-sm mx-auto"
        />

        <form onSubmit={handleManualSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={t('qr.equipmentCodeLabel')}
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary-500 outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-3 bg-primary-600 text-white rounded-lg disabled:opacity-50"
            >
              {t('app.add')}
            </button>
          </div>
        </form>
        
        {!showManualInput && status === 'granted' && (
          <p className="text-gray-400 text-center text-sm">
            {t('qrScanner.instructions')}
          </p>
        )}
      </div>
    </div>
  );
}
