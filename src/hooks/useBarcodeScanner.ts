import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onError?: (error: string) => void;
}

// Extract 20-digit serial number (matching Android app logic)
const extractSerialNumber = (rawValue: string | null): string | null => {
  if (!rawValue) return null;
  
  // Remove any non-digit characters
  const digitsOnly = rawValue.replace(/[^0-9]/g, '');
  
  // Check if we have exactly 20 digits
  if (digitsOnly.length === 20) {
    return digitsOnly;
  }
  
  // If not exactly 20 digits, try to find a 20-digit sequence
  const digitGroups = digitsOnly.match(/.{1,20}/g) || [];
  for (const group of digitGroups) {
    if (group.length === 20) {
      return group;
    }
  }
  
  // If still no 20-digit sequence found, try to extract from the middle
  if (digitsOnly.length > 20) {
    const startIndex = Math.floor((digitsOnly.length - 20) / 2);
    return digitsOnly.substring(startIndex, startIndex + 20);
  }
  
  return null;
};

export const useBarcodeScanner = ({ onDetected, onError }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quaggaLoaded, setQuaggaLoaded] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  // Load Quagga dynamically
  useEffect(() => {
    const loadQuagga = async () => {
      try {
        const Quagga = (await import('quagga')).default;
        (window as any).Quagga = Quagga;
        setQuaggaLoaded(true);
      } catch (error) {
        console.error('Failed to load Quagga:', error);
        setError('Failed to load barcode scanner library.');
      }
    };
    
    loadQuagga();
  }, []);

  const startScanning = async () => {
    if (!videoRef.current || !quaggaLoaded) return;

    setIsScanning(true);
    setError(null);

    try {
      // First check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      // Stop the stream as Quagga will create its own
      stream.getTracks().forEach(track => track.stop());

      const Quagga = (window as any).Quagga;
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment" // Use back camera
          }
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        }
      }, (err: any) => {
        if (err) {
          console.error('Quagga initialization error:', err);
          setError('Failed to initialize camera. Please check permissions and try again.');
          onError?.('Failed to initialize camera. Please check permissions and try again.');
          setIsScanning(false);
          return;
        }
        try {
          Quagga.start();
        } catch (startError) {
          console.error('Error starting Quagga:', startError);
          setError('Failed to start camera.');
          setIsScanning(false);
        }
      });

      Quagga.onDetected((data: any) => {
        const rawValue = data.codeResult.code;
        console.log('Barcode detected:', rawValue);
        
        // Extract 20-digit serial number (matching Android app logic)
        const serialNumber = extractSerialNumber(rawValue);
        if (serialNumber) {
          onDetected(serialNumber);
          stopScanning();
        } else {
          console.warn('Invalid barcode format - no 20-digit serial found');
          // Continue scanning for valid barcode
        }
      });
    } catch (initError) {
      console.error('Error initializing Quagga:', initError);
      setError('Failed to initialize barcode scanner.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    try {
      const Quagga = (window as any).Quagga;
      if (Quagga && typeof Quagga.stop === 'function') {
        Quagga.stop();
      }
    } catch (error) {
      console.warn('Error stopping Quagga:', error);
    }
  };

  useEffect(() => {
    return () => {
      try {
        const Quagga = (window as any).Quagga;
        if (Quagga && typeof Quagga.stop === 'function') {
          Quagga.stop();
        }
      } catch (error) {
        console.warn('Error stopping Quagga:', error);
      }
    };
  }, []);

  return {
    videoRef,
    isScanning,
    error,
    startScanning,
    stopScanning
  };
};
