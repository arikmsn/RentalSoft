import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type BaseQrScannerProps = {
  onScan: (code: string) => void;
};

export const BaseQrScanner: React.FC<BaseQrScannerProps> = ({ onScan }) => {
  console.log('[QR] BaseQrScanner rendered');
  
  const [status, setStatus] = useState('Initializing...');
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const regionId = 'qr-reader-target';

  const stopScanner = useCallback(async () => {
    console.log('[QR] stopScanner called, isRunning:', isRunningRef.current);
    
    if (!qrRef.current) {
      console.log('[QR] No scanner instance');
      return;
    }

    const scanner = qrRef.current;
    
    try {
      if (isRunningRef.current) {
        console.log('[QR] Calling stop()');
        isRunningRef.current = false;
        await scanner.stop();
        console.log('[QR] stop() completed');
      }
    } catch (err) {
      console.warn('[QR] Error stopping:', err);
    }

    try {
      console.log('[QR] Calling clear()');
      await scanner.clear();
      console.log('[QR] clear() completed');
    } catch (err) {
      console.warn('[QR] Error clearing:', err);
    }
    
    qrRef.current = null;
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    console.log('[QR] Scanned:', decodedText);
    onScan(decodedText);
  }, [onScan]);

  useEffect(() => {
    let mounted = true;
    let scannerInstance: Html5Qrcode | null = null;
    
    const initScanner = async () => {
      try {
        setStatus('Creating scanner...');
        
        const element = document.getElementById(regionId);
        if (!element) {
          console.warn('[QR] Scanner element not found');
          return;
        }
        
        scannerInstance = new Html5Qrcode(regionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        
        qrRef.current = scannerInstance;

        setStatus('Requesting camera...');
        console.log('[QR] Starting scanner...');

        await scannerInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (mounted) {
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
        
        console.log('[QR] Scanner started successfully');
      } catch (err) {
        console.error('[QR] Start failed:', err);
        isRunningRef.current = false;
        if (mounted) {
          setStatus('Error: ' + String(err));
        }
      }
    };

    initScanner();

    // Cleanup function
    return () => {
      console.log('[QR] Cleanup starting');
      mounted = false;
      
      const cleanup = async () => {
        if (scannerInstance && isRunningRef.current) {
          try {
            isRunningRef.current = false;
            await scannerInstance.stop();
          } catch (e) {
            console.warn('[QR] Stop error in cleanup:', e);
          }
        }
        
        if (scannerInstance) {
          try {
            await scannerInstance.clear();
          } catch (e) {
            console.warn('[QR] Clear error in cleanup:', e);
          }
          scannerInstance = null;
          qrRef.current = null;
        }
        console.log('[QR] Cleanup done');
      };
      
      cleanup();
    };
  }, [handleScan]);

  // Handle app going to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunningRef.current) {
        console.log('[QR] App hidden, stopping scanner');
        stopScanner();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopScanner]);

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
