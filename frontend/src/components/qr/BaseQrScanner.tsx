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
  const isCleanupRef = useRef(false);
  const regionId = 'qr-reader-target';

  const handleScan = useCallback((decodedText: string) => {
    console.log('[QR] BaseQrScanner found:', decodedText);
    if (isMountedRef.current && !isCleanupRef.current) {
      onScan(decodedText);
    }
  }, [onScan]);

  useEffect(() => {
    console.log('[QR] BaseQrScanner useEffect running');
    isMountedRef.current = true;
    isCleanupRef.current = false;
    isRunningRef.current = false;
    
    let mounted = true;
    
    const initScanner = async () => {
      try {
        if (!mounted) return;
        
        setStatus('Creating scanner...');
        
        const element = document.getElementById(regionId);
        if (!element) {
          console.warn('[QR] Scanner element not found');
          return;
        }
        
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
            if (mounted && !isCleanupRef.current) {
              handleScan(decodedText);
            }
          },
          () => {
            // QR parse error - ignore
          }
        );

        isRunningRef.current = true;
        
        if (mounted) {
          setStatus('Ready - point at QR code');
        }
      } catch (err) {
        console.error('[QR] Start failed:', err);
        isRunningRef.current = false;
        if (mounted) {
          setStatus('Error: ' + String(err));
        }
      }
    };

    initScanner();

    return () => {
      console.log('[QR] BaseQrScanner cleanup starting');
      mounted = false;
      isCleanupRef.current = true;
      isMountedRef.current = false;
      
      // Safely stop the scanner without throwing
      const stopScanner = () => {
        if (scannerRef.current) {
          const scanner = scannerRef.current;
          scannerRef.current = null;
          
          // Only try to stop if we actually started
          if (isRunningRef.current) {
            isRunningRef.current = false;
            try {
              // Clear any video element references first to prevent removeChild errors
              const videoElement = document.getElementById(`${regionId}`);
              if (videoElement && videoElement.parentNode) {
                // Let Html5Qrcode handle cleanup - don't manually remove elements
              }
              scanner.stop().catch(() => {});
            } catch (err) {
              // Ignore all errors during cleanup
              console.warn('[QR] Cleanup error (ignored):', err);
            }
          }
        }
      };
      
      stopScanner();
      console.log('[QR] BaseQrScanner cleanup done');
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
