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
  const isMountedRef = useRef(true);
  const isCleanupRef = useRef(false);
  const regionId = 'qr-reader-target';

  const stopScanner = useCallback(async () => {
    console.log('[QR] stopScanner called');
    const scanner = qrRef.current;
    if (!scanner) {
      console.log('[QR] No scanner instance to stop');
      return;
    }

    try {
      if (isRunningRef.current) {
        console.log('[QR] Stopping scanner...');
        isRunningRef.current = false;
        await scanner.stop();
        console.log('[QR] Scanner stopped');
      }
      
      // Clear the scanner to release video element
      if (!isCleanupRef.current) {
        isCleanupRef.current = true;
        try {
          await scanner.clear();
          console.log('[QR] Scanner cleared');
        } catch (e) {
          console.warn('[QR] Error clearing scanner:', e);
        }
      }
    } catch (err) {
      console.warn('[QR] Error stopping scanner:', err);
    } finally {
      qrRef.current = null;
    }
  }, []);

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
        
        qrRef.current = new Html5Qrcode(regionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        setStatus('Requesting camera...');
        console.log('[QR] Starting scanner...');

        await qrRef.current.start(
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

    // Cleanup function
    return () => {
      console.log('[QR] BaseQrScanner cleanup starting');
      mounted = false;
      isMountedRef.current = false;
      isCleanupRef.current = true;
      stopScanner();
      console.log('[QR] BaseQrScanner cleanup done');
    };
  }, [handleScan, stopScanner]);

  // Handle app going to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
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

// Export stopScanner for external use if needed
export const stopQrScanner = async () => {
  // This can be used by parent components to stop the scanner
  console.log('[QR] External stop requested');
};
