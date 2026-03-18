import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const MinimalScanner: React.FC = () => {
  const [status, setStatus] = useState('Initializing...');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'qr-reader-target';
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[QR-TEST] Component mounted');
    
    const initScanner = async () => {
      try {
        setStatus('Creating Html5Qrcode instance...');
        scannerRef.current = new Html5Qrcode(regionId);

        setStatus('Requesting camera...');
        console.log('[QR-TEST] Starting scanner...');

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            console.log('[QR-TEST] Found:', decodedText);
            setStatus('Scanned: ' + decodedText);
          },
          () => {
            // QR parse error - ignore
          }
        );

        if (isMountedRef.current) {
          setStatus('Streaming active - point camera at QR code');
        }
      } catch (err) {
        console.error('[QR-TEST] Start failed', err);
        setStatus('Error: ' + String(err));
      }
    };

    initScanner();

    return () => {
      isMountedRef.current = false;
      console.log('[QR-TEST] Cleaning up...');
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error('[QR-TEST] Stop failed', err));
      }
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      color: '#fff',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: 16, textAlign: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>QR Test Page</h1>
        <p style={{ color: status.includes('Error') ? '#f55' : '#aaa' }}>{status}</p>
      </div>

      <div
        id={regionId}
        style={{
          width: '100%',
          maxWidth: 500,
          margin: '0 auto',
          flex: 1,
          minHeight: 300,
          background: '#222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <p style={{ color: '#666' }}>Camera preview should appear here</p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          fontSize: 16,
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        Reload
      </button>
    </div>
  );
};

export default MinimalScanner;
