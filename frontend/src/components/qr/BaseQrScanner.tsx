import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export type BaseQrScannerProps = {
  onScan: (code: string) => void;
};

export const BaseQrScanner: React.FC<BaseQrScannerProps> = ({ onScan }) => {
  console.log('[QR] BaseQrScanner rendered');
  
  const [status, setStatus] = useState('Initializing...');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const hasTriedRef = useRef(false);
  const regionId = 'qr-reader-target';

  // Helper to force stop camera tracks in scanner region only
  const forceStopCameraTracksInRegion = useCallback(() => {
    try {
      const regionEl = document.getElementById(regionId);
      if (!regionEl) {
        console.log('[QR] forceStopCameraTracksInRegion: region not found');
        return;
      }

      const videos = regionEl.querySelectorAll('video');
      if (videos.length === 0) {
        console.log('[QR] forceStopCameraTracksInRegion: no videos found');
        return;
      }

      console.log('[QR] forceStopCameraTracksInRegion: found', videos.length, 'videos');
      videos.forEach((video) => {
        try {
          const stream = (video as any).srcObject;
          if (stream instanceof MediaStream) {
            const trackCount = stream.getTracks().length;
            console.log('[QR] forceStopCameraTracksInRegion: stopping', trackCount, 'tracks');
            stream.getTracks().forEach((track: MediaStreamTrack) => {
              track.stop();
            });
            (video as any).srcObject = null;
          }
        } catch (e) {
          console.warn('[QR] forceStopCameraTracksInRegion: error stopping video:', e);
        }
      });
    } catch (e) {
      console.warn('[QR] forceStopCameraTracksInRegion:', e);
    }
  }, []);

  // Clean up any existing scanner instance
  const cleanupExistingScanner = useCallback(async () => {
    console.log('[QR] cleanupExistingScanner called');
    
    // Force stop tracks in region first
    forceStopCameraTracksInRegion();
    
    if (qrRef.current) {
      try {
        if (isRunningRef.current) {
          console.log('[QR] cleanupExistingScanner: calling stop()');
          await qrRef.current.stop();
          console.log('[QR] cleanupExistingScanner: stop() done');
        }
      } catch (e: any) {
        console.warn('[QR] cleanupExistingScanner: stop error (ignored):', e?.message || e);
      }
      
      try {
        console.log('[QR] cleanupExistingScanner: calling clear()');
        await qrRef.current.clear();
        console.log('[QR] cleanupExistingScanner: clear() done');
      } catch (e: any) {
        console.warn('[QR] cleanupExistingScanner: clear error (ignored):', e?.message || e);
      }
      
      qrRef.current = null;
      isRunningRef.current = false;
    }
    
    // Final force stop as safety
    forceStopCameraTracksInRegion();
    console.log('[QR] cleanupExistingScanner done');
  }, [forceStopCameraTracksInRegion]);

  const stopScanner = useCallback(async () => {
    console.log('[QR] stopScanner called, isRunning:', isRunningRef.current);
    
    if (!qrRef.current) {
      console.log('[QR] stopScanner: no scanner instance');
      return;
    }

    const scanner = qrRef.current;
    
    // Try to stop html5-qrcode scanner
    try {
      if (isRunningRef.current) {
        console.log('[QR] stopScanner: calling scanner.stop()');
        isRunningRef.current = false;
        await scanner.stop();
        console.log('[QR] stopScanner: scanner.stop() completed');
      }
    } catch (err: any) {
      console.warn('[QR] stopScanner: error stopping scanner:', err?.message || err);
    }

    // Try to clear
    try {
      console.log('[QR] stopScanner: calling scanner.clear()');
      await scanner.clear();
      console.log('[QR] stopScanner: scanner.clear() completed');
    } catch (err: any) {
      console.warn('[QR] stopScanner: error clearing scanner:', err?.message || err);
    }
    
    qrRef.current = null;
    
    // Force stop tracks in region
    forceStopCameraTracksInRegion();
  }, [forceStopCameraTracksInRegion]);

  const handleScan = useCallback((decodedText: string) => {
    console.log('[QR] Scanned:', decodedText);
    onScan(decodedText);
  }, [onScan]);

  const initScanner = useCallback(async () => {
    // If already tried and failed, don't retry automatically
    if (hasTriedRef.current && scannerError) {
      console.log('[QR] initScanner: already tried and failed, not retrying');
      return;
    }
    
    hasTriedRef.current = true;
    setScannerError(null);
    
    try {
      setStatus('Creating scanner...');
      console.log('[QR] initScanner: creating scanner');
      
      // Clean up any existing instance first
      await cleanupExistingScanner();
      
      const element = document.getElementById(regionId);
      if (!element) {
        console.warn('[QR] initScanner: Scanner element not found');
        setStatus('Error: Element not found');
        return;
      }
      
      // Create fresh instance
      const scannerInstance = new Html5Qrcode(regionId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      
      qrRef.current = scannerInstance;

      setStatus('Requesting camera...');
      console.log('[QR] initScanner: Starting scanner...');

      await scannerInstance.start(
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
      setStatus('Ready - point at QR code');
      console.log('[QR] initScanner: Scanner started successfully');
      
    } catch (err: any) {
      console.error('[QR] initScanner: Start failed:', err);
      isRunningRef.current = false;
      
      // Handle specific errors
      const errorMsg = err?.message || String(err);
      const isNotReadableError = errorMsg.includes('NotReadableError') || 
                                  errorMsg.includes('Could not start video source') ||
                                  errorMsg.includes('not readable');
      const isPermissionDenied = errorMsg.includes('Permission denied') || 
                                  errorMsg.includes('NotAllowedError') ||
                                  errorMsg.includes('PermissionDeniedError');
      
      if (isNotReadableError) {
        console.log('[QR] initScanner: NotReadableError caught');
        setScannerError('camera_busy');
        setStatus('Camera in use');
      } else if (isPermissionDenied) {
        console.log('[QR] initScanner: Permission denied');
        setScannerError('permission_denied');
        setStatus('Permission denied');
      } else {
        setScannerError('unknown');
        setStatus('Error: ' + errorMsg.substring(0, 50));
      }
    }
  }, [cleanupExistingScanner, handleScan, scannerError]);

  const handleRetry = useCallback(() => {
    console.log('[QR] Retry requested');
    hasTriedRef.current = false;
    initScanner();
  }, [initScanner]);

  // First useEffect: Initialize scanner on mount
  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      initScanner();
    }

    // Cleanup on unmount
    return () => {
      console.log('[QR] useEffect cleanup: unmounting');
      mounted = false;
      stopScanner();
    };
  }, []);

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

  // Extra safety timeout - force stop after 30 seconds
  useEffect(() => {
    console.log('[QR] Setting up 30-second safety timeout');
    
    const timeoutId = setTimeout(() => {
      console.log('[QR] TIMEOUT FIRED! isRunningRef.current:', isRunningRef.current);
      if (isRunningRef.current) {
        console.log('[QR] Calling stopScanner due to timeout');
        stopScanner();
      } else {
        console.log('[QR] Timeout fired but scanner not running, skipping');
      }
    }, 30000);

    console.log('[QR] Timeout scheduled, will fire in 30 seconds');
    
    return () => {
      console.log('[QR] Clearing timeout');
      clearTimeout(timeoutId);
    };
  }, [stopScanner]);

  // Render error state
  if (scannerError) {
    return (
      <div className="w-full">
        <div className="text-center mb-2">
          <p className="text-white text-sm">{status}</p>
        </div>
        <div className="w-full max-w-sm mx-auto min-h-[300px] bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-4">📷</div>
            {scannerError === 'camera_busy' && (
              <>
                <h3 className="text-lg font-bold text-white mb-2">לא ניתן להפעיל את המצלמה</h3>
                <p className="text-gray-400 text-sm mb-4">
                  נראה שהמצלמה בשימוש באפליקציה אחרת, או שהדפדפן חסם את הגישה.
                  נסה לסגור אפליקציות נוספות שמשתמשות במצלמה, לסגור ולפתוח שוב את הדפדפן,
                  או לעדכן הרשאות מצלמה בהגדרות המכשיר.
                </p>
              </>
            )}
            {scannerError === 'permission_denied' && (
              <>
                <h3 className="text-lg font-bold text-white mb-2">אין הרשאת מצלמה</h3>
                <p className="text-gray-400 text-sm mb-4">
                  אנא אפשר גישה למצלמה בהגדרות הדפדפן
                </p>
              </>
            )}
            {scannerError === 'unknown' && (
              <>
                <h3 className="text-lg font-bold text-white mb-2">שגיאה בהפעלת המצלמה</h3>
                <p className="text-gray-400 text-sm mb-4">
                  אירעה שגיאה. אנא נסה שוב.
                </p>
              </>
            )}
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-all"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </div>
    );
  }

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
