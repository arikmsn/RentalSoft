import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrValue: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const scannerId = 'qr-scanner';

  useEffect(() => {

    const startScanner = async () => {
      try {
        setError(null);
        setIsInitializing(true);

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
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                onScan(decodedText);
              });
            }
          },
          () => {
            // QR code not found - ignore
          }
        );

        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to start QR scanner:', err);
        setError(t('qrScanner.cameraError'));
        setIsInitializing(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, t]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black">
        <h2 className="text-white font-semibold">{t('qrScanner.title')}</h2>
        <button
          onClick={onClose}
          className="text-white p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg"
            >
              {t('app.cancel')}
            </button>
          </div>
        ) : isInitializing ? (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>{t('qrScanner.initializing')}</p>
          </div>
        ) : (
          <div id={scannerId} className="w-full max-w-sm mx-auto" />
        )}
      </div>

      <div className="p-4 bg-black">
        <p className="text-gray-400 text-center text-sm">
          {t('qrScanner.instructions')}
        </p>
      </div>
    </div>
  );
}
