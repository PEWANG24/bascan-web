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
        console.log('QuaggaJS loaded successfully');
      } catch (error) {
        console.error('Failed to load Quagga:', error);
        setError('Failed to load barcode scanner library.');
      }
    };
    
    loadQuagga();
  }, []);

  // Check if video element is ready when quagga is loaded
  useEffect(() => {
    if (quaggaLoaded && videoRef.current) {
      console.log('Video element is ready for scanning');
    }
  }, [quaggaLoaded, videoRef.current]);

  const startScanning = async () => {
    if (!quaggaLoaded) {
      setError('Scanner library not loaded yet. Please wait...');
      return;
    }

    // Double-check that Quagga is available on window
    if (!(window as any).Quagga) {
      setError('Scanner library not available. Please refresh the page.');
      return;
    }

    // Wait for video element to be ready with retry
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      if (videoRef.current && videoRef.current.offsetParent) {
        break;
      }
      
      if (retries === maxRetries - 1) {
        if (!videoRef.current) {
          setError('Video element not ready. Please try again.');
          return;
        }
        if (!videoRef.current.offsetParent) {
          setError('Video element not visible. Please ensure the scanner modal is open.');
          return;
        }
      }
      
      // Wait 100ms before retry
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    setIsScanning(true);
    setError(null);

    try {
      // First check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Check if we're on HTTPS (required for camera access)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS. Please use HTTPS or localhost.');
      }

      const Quagga = (window as any).Quagga;
      
      // Stop any existing scanner first (only if Quagga is properly initialized)
      if (Quagga && typeof Quagga.stop === 'function' && Quagga.stop) {
        try {
          Quagga.stop();
        } catch (stopError) {
          console.warn('Error stopping existing Quagga instance:', stopError);
        }
      }

      // Initialize Quagga with better error handling
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
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
          let errorMessage = 'Failed to initialize camera. ';
          
          if (err.name === 'NotAllowedError') {
            errorMessage += 'Camera permission denied. Please allow camera access and try again.';
          } else if (err.name === 'NotFoundError') {
            errorMessage += 'No camera found. Please connect a camera and try again.';
          } else if (err.name === 'NotReadableError') {
            errorMessage += 'Camera is already in use by another application.';
          } else {
            errorMessage += 'Please check camera permissions and try again.';
          }
          
          setError(errorMessage);
          onError?.(errorMessage);
          setIsScanning(false);
          return;
        }
        
        try {
          Quagga.start();
          console.log('Quagga scanner started successfully');
        } catch (startError) {
          console.error('Error starting Quagga:', startError);
          setError('Failed to start camera.');
          setIsScanning(false);
        }
      });

      // Set up barcode detection handler
      Quagga.onDetected((data: any) => {
        if (!isScanning) return; // Prevent processing if scanner is stopped
        
        const rawValue = data.codeResult.code;
        console.log('Barcode detected:', rawValue);
        
        // Extract 20-digit serial number (matching Android app logic)
        const serialNumber = extractSerialNumber(rawValue);
        if (serialNumber) {
          console.log('Valid serial number extracted:', serialNumber);
          onDetected(serialNumber);
          stopScanning();
        } else {
          console.warn('Invalid barcode format - no 20-digit serial found in:', rawValue);
          // Continue scanning for valid barcode
        }
      });

    } catch (initError: any) {
      console.error('Error initializing Quagga:', initError);
      let errorMessage = 'Failed to initialize barcode scanner. ';
      
      if (initError.message.includes('HTTPS')) {
        errorMessage += initError.message;
      } else if (initError.message.includes('Camera not supported')) {
        errorMessage += initError.message;
      } else {
        errorMessage += 'Please check your camera and try again.';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    try {
      const Quagga = (window as any).Quagga;
      if (Quagga && typeof Quagga.stop === 'function' && Quagga.stop) {
        Quagga.stop();
        console.log('Quagga scanner stopped');
      }
    } catch (error) {
      console.warn('Error stopping Quagga:', error);
    }
  };

  useEffect(() => {
    return () => {
      try {
        const Quagga = (window as any).Quagga;
        if (Quagga && typeof Quagga.stop === 'function' && Quagga.stop) {
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
