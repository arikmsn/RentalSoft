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

  // Helper function to force stop all camera tracks
  const forceStopAllCameraTracks = useCallback(() => {
    console.log('[QR] forceStopAllCameraTracks called');
    
    // Method 1: Try to find video element by region ID
    const regionEl = document.getElementById(regionId);
    if (regionEl) {
      const videos = regionEl.querySelectorAll('video');
      videos.forEach((video) => {
        const stream = (video as any).srcObject;
        if (stream && stream instanceof MediaStream) {
          console.log('[QR] Found video in region, stopping tracks');
          stream.getTracks().forEach((track: MediaStreamTrack) => {
            console.log('[QR] Stopping track:', track.kind);
            track.stop();
          });
          (video as any).srcObject = null;
        }
      });
    }

    // Method 2: Query all video elements on page with active streams
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video) => {
      try {
        const stream = (video as any).srcObject;
        if (stream && stream instanceof MediaStream && stream.getTracks().length > 0) {
          console.log('[QR] Found active video element, stopping tracks');
          stream.getTracks().forEach((track: MediaStreamTrack) => {
            console.log('[QR] Stopping track:', track.kind);
            track.stop();
          });
          (video as any).srcObject = null;
        }
      } catch (e) {
        console.warn('[QR] Error checking video element:', e);
      }
    });

    // Method 3: Use getUserMedia to get any existing stream and stop it
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        console.log('[QR] Found active getUserMedia stream, stopping tracks');
        stream.getTracks().forEach((track) => {
          console.log('[QR] Stopping track:', track.kind);
          track.stop();
        });
      })
      .catch(() => {
        // No active stream found, that's fine
      });
    
    console.log('[QR] forceStopAllCameraTracks completed');
  }, []);

  const stopScanner = useCallback(async () => {
    console.log('[QR] stopScanner called, isRunning:', isRunningRef.current);
    
    // First: Force stop all camera tracks directly (before html5-qrcode cleanup)
    forceStopAllCameraTracks();
    
    if (!qrRef.current) {
      console.log('[QR] No scanner instance');
      return;
    }

    const scanner = qrRef.current;
    
    // Try to stop html5-qrcode scanner
    try {
      if (isRunningRef.current) {
        console.log('[QR] Calling scanner.stop()');
        isRunningRef.current = false;
        await scanner.stop();
        console.log('[QR] scanner.stop() completed');
      }
    } catch (err: any) {
      console.warn('[QR] Error stopping scanner:', err?.message || err);
      // Even if stop fails, continue with cleanup
    }

    // Try to clear html5-qrcode
    try {
      console.log('[QR] Calling scanner.clear()');
      await scanner.clear();
      console.log('[QR] scanner.clear() completed');
    } catch (err: any) {
      console.warn('[QR] Error clearing scanner:', err?.message || err);
      // If clear fails because scan is ongoing, that's ok - we already stopped tracks
    }
    
    qrRef.current = null;
    
    // Final: Force stop all camera tracks again as safety net
    forceStopAllCameraTracks();
  }, [forceStopAllCameraTracks]);

  const handleScan = useCallback((decodedText: string) => {
    console.log('[QR] Scanned:', decodedText);
    onScan(decodedText);
  }, [onScan]);

  // First useEffect: Start scanner on mount
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
        // First: Force stop all camera tracks
        forceStopAllCameraTracks();
        
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
        
        // Final: Force stop all camera tracks as safety net
        forceStopAllCameraTracks();
        console.log('[QR] Cleanup done');
      };
      
      cleanup();
    };
  }, [handleScan, forceStopAllCameraTracks]);

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
