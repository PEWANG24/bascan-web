import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const idSchema = yup.object({
  idNumber: yup.string().required('ID Number is required'),
});

const pinSchema = yup.object({
  pin: yup.string().required('PIN is required').min(4, 'PIN must be at least 4 characters'),
});

type IdFormData = yup.InferType<typeof idSchema>;
type PinFormData = yup.InferType<typeof pinSchema>;

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'id' | 'pin'>('id');
  const [idNumber, setIdNumber] = useState('');
  const { verifyIdNumber, verifyPin, user } = useAuth();
  const navigate = useNavigate();

  console.log('📱 LoginPage rendered, step:', step, 'user:', user?.idNumber);

  const idForm = useForm<IdFormData>({
    resolver: yupResolver(idSchema)
  });

  const pinForm = useForm<PinFormData>({
    resolver: yupResolver(pinSchema)
  });

  // Step 1: Verify ID Number (like mobile app)
  const onIdSubmit = async (data: IdFormData) => {
    console.log('📝 ID form submitted with data:', data);
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Starting ID verification...');
      await verifyIdNumber(data.idNumber);
      console.log('✅ ID verification successful, moving to PIN step');
      setIdNumber(data.idNumber);
      setStep('pin');
    } catch (err: any) {
      console.log('❌ ID verification failed:', err.message);
      setError(err.message || 'ID number not found. Please check your ID number.');
    } finally {
      setLoading(false);
    }
  };

  // Debug form submission
  const handleIdFormSubmit = (e: React.FormEvent) => {
    console.log('📋 ID Form submit event triggered');
    console.log('📋 ID Form errors:', idForm.formState.errors);
    console.log('📋 ID Form values:', idForm.getValues());
    idForm.handleSubmit(onIdSubmit)(e);
  };

  // Step 2: Verify PIN (like mobile app)
  const onPinSubmit = async (data: PinFormData) => {
    console.log('📝 PIN form submitted with data:', data);
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Starting PIN verification...');
      await verifyPin(data.pin);
      console.log('✅ PIN verification successful, navigating to dashboard');
      navigate('/');
    } catch (err: any) {
      console.log('❌ PIN verification failed:', err.message);
      setError(err.message || 'Incorrect PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to ID step
  const goBackToId = () => {
    setStep('id');
    setError('');
    setIdNumber('');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" color="primary">
              MANAAL V3
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Web Portal
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 'id' ? (
            <Box component="form" onSubmit={handleIdFormSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="idNumber"
                label="ID Number"
                autoComplete="idNumber"
                autoFocus
                {...idForm.register('idNumber')}
                error={!!idForm.formState.errors.idNumber}
                helperText={idForm.formState.errors.idNumber?.message}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                onClick={() => {
                  console.log('🔘 Verify ID button clicked');
                  console.log('🔘 Current form values:', idForm.getValues());
                  console.log('🔘 Form errors:', idForm.formState.errors);
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify ID'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={pinForm.handleSubmit(onPinSubmit)} sx={{ mt: 1 }}>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  ID Number: <strong>{idNumber}</strong>
                </Typography>
                {user && (
                  <Typography variant="body2" color="text.secondary">
                    Welcome: <strong>{user.fullName}</strong>
                  </Typography>
                )}
              </Box>
              <TextField
                margin="normal"
                required
                fullWidth
                label="PIN"
                type="password"
                id="pin"
                autoComplete="current-password"
                autoFocus
                {...pinForm.register('pin')}
                error={!!pinForm.formState.errors.pin}
                helperText={pinForm.formState.errors.pin?.message}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 1 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={goBackToId}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Back to ID
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Access your dashboard and manage your activations
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
