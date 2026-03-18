import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type ScannerStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'not-supported' | 'not-secure';

interface QRScannerProps {
  onScan: (qrValue: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const scannerId = 'qr-scanner';

  const stopCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    scannerRef.current = null;
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    stopCamera().then(() => {
      onScan(decodedText);
    });
  }, [onScan, stopCamera]);

  const startScanner = useCallback(async () => {
    try {
      setStatus('requesting');
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('not-supported');
        setError(t('qrScanner.notSupported'));
        return;
      }

      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        setStatus('not-secure');
        setError(t('qrScanner.notSecure'));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      setStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scannerRef.current = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // QR code not found - ignore
        }
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setError(t('qrScanner.denied'));
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('not-supported');
        setError(t('qrScanner.notSupported'));
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setStatus('denied');
        setError(t('qrScanner.denied'));
      } else {
        setStatus('denied');
        setError(t('qrScanner.cameraError'));
      }
    }
  }, [t, handleScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      stopCamera();
    };
  }, []);

  const showManualInput = status === 'denied' || status === 'not-supported' || status === 'not-secure';

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

        {(status === 'denied' || status === 'not-supported' || status === 'not-secure') && (
          <div className="text-white text-center p-4 max-w-sm">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-gray-400 text-sm mb-6">{t('qrScanner.manualHint')}</p>
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
        {(showManualInput || status === 'granted') && (
          <form onSubmit={handleManualSubmit} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t('equipment.code')}
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
        )}
        
        {!showManualInput && (
          <p className="text-gray-400 text-center text-sm">
            {t('qrScanner.instructions')}
          </p>
        )}
      </div>
    </div>
  );
}
