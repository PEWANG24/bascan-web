import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { QrReader } from 'react-qr-reader';
import { QrCodeScanner as ScanIcon, Close as CloseIcon } from '@mui/icons-material';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ open, onClose, onScan }) => {
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result) {
      console.log('QR Code scanned:', result);
      setScanning(false);
      onScan(result);
      onClose();
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    setError('Camera access failed. Please ensure camera permissions are granted.');
    setScanning(false);
  };

  const handleRetry = () => {
    setError(null);
    setScanning(true);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { backgroundColor: '#000' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        color: 'white',
        backgroundColor: '#2e7d32'
      }}>
        <Typography variant="h6">
          Scan SIM Card QR Code
        </Typography>
        <Button 
          onClick={onClose} 
          color="inherit"
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button 
              variant="contained" 
              onClick={handleRetry}
              startIcon={<ScanIcon />}
            >
              Retry Camera
            </Button>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', minHeight: '400px' }}>
            {scanning && (
              <QrReader
                onResult={handleScan}
                constraints={{
                  facingMode: 'environment' // Use back camera
                }}
              />
            )}
            
            {/* Scanning overlay */}
            {scanning && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  pointerEvents: 'none'
                }}
              >
                <Box
                  sx={{
                    width: '200px',
                    height: '200px',
                    border: '2px solid #2e7d32',
                    borderRadius: '8px',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      right: '-2px',
                      bottom: '-2px',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      animation: 'pulse 2s infinite'
                    }
                  }}
                />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'white', 
                    mt: 2, 
                    textAlign: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    px: 2,
                    py: 1,
                    borderRadius: 1
                  }}
                >
                  Position QR code within the frame
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ backgroundColor: '#2e7d32', color: 'white' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          Point your camera at the SIM card QR code
        </Typography>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRScanner;
