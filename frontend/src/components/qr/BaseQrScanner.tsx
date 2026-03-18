import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type BaseQrScannerProps = {
  onScan: (code: string) => void;
};

export const BaseQrScanner: React.FC<BaseQrScannerProps> = ({ onScan }) => {
  console.log('[QR] BaseQrScanner rendered');
  
  const [status, setStatus] = useState('Initializing...');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);
  const regionId = 'qr-reader-target';

  const handleScan = useCallback((decodedText: string) => {
    console.log('[QR] BaseQrScanner found:', decodedText);
    if (isMountedRef.current) {
      onScan(decodedText);
    }
  }, [onScan]);

  useEffect(() => {
    console.log('[QR] BaseQrScanner useEffect running');
    isMountedRef.current = true;
    isRunningRef.current = false;
    
    const initScanner = async () => {
      try {
        setStatus('Creating scanner...');
        
        scannerRef.current = new Html5Qrcode(regionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        setStatus('Requesting camera...');
        console.log('[QR] Starting scanner...');

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {
            // QR parse error - ignore
          }
        );

        isRunningRef.current = true;
        
        if (isMountedRef.current) {
          setStatus('Ready - point at QR code');
        }
      } catch (err) {
        console.error('[QR] Start failed:', err);
        isRunningRef.current = false;
        if (isMountedRef.current) {
          setStatus('Error: ' + String(err));
        }
      }
    };

    initScanner();

    return () => {
      console.log('[QR] BaseQrScanner cleanup');
      isMountedRef.current = false;
      
      // Only stop if scanner is actually running
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current
          .stop()
          .catch((err) => {
            // Ignore "not running" errors during cleanup
            if (!String(err).includes('not running')) {
              console.error('[QR] Stop failed:', err);
            }
          })
          .finally(() => {
            scannerRef.current = null;
          });
      } else {
        // Scanner never started or already stopped - just clean up
        scannerRef.current = null;
      }
    };
  }, [handleScan]);

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        <p className="text-white text-sm">{status}</p>
      </div>
      <div
        id={regionId}
        className="w-full max-w-sm mx-auto min-h-[300px] bg-gray-900 rounded-lg overflow-hidden"
      />
    </div>
  );
};
