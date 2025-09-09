import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActionArea,
  Divider
} from '@mui/material';
import { 
  QrCodeScanner as ScanIcon, 
  CameraAlt as CameraIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useState as formState } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import QRScanner from './QRScanner';

interface TeamLeader {
  id: string;
  name: string;
  phone: string;
  vanShop: string;
}

interface FormData {
  customerName: string;
  customerId: string;
  customerDob: string;
  phoneNumber: string;
  teamLeaderId: string;
  simSerial: string;
}

type SubmissionMethod = 'manual' | 'photo';

interface StartKeyRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const StartKeyRequestForm: React.FC<StartKeyRequestFormProps> = ({ 
  open, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSimSerial, setSelectedSimSerial] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerId: '',
    customerDob: '',
    phoneNumber: '',
    teamLeaderId: '',
    simSerial: ''
  });

  useEffect(() => {
    if (open) {
      loadTeamLeaders();
    }
  }, [open]);

  const loadTeamLeaders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load team leaders from users collection where role is TEAM_LEADER
      const teamLeadersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'TEAM_LEADER')
      );
      
      const snapshot = await getDocs(teamLeadersQuery);
      const leaders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamLeader[];
      
      setTeamLeaders(leaders);
      console.log('Loaded team leaders:', leaders.length);
      
    } catch (err) {
      console.error('Error loading team leaders:', err);
      setError('Failed to load team leaders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQRScan = (result: string) => {
    setSelectedSimSerial(result);
    setFormData(prev => ({ ...prev, simSerial: result }));
    setShowQRScanner(false);
  };

  const handlePhotoCapture = () => {
    // For now, we'll simulate photo capture
    // In a real implementation, this would open camera and capture photo
    setCapturedPhoto('photo-captured');
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerId: '',
      customerDob: '',
      phoneNumber: '',
      teamLeaderId: '',
      simSerial: ''
    });
    setSubmissionMethod(null);
    setCapturedPhoto(null);
    setCurrentStep(1);
    setSelectedSimSerial(null);
    setError(null);
  };

  const handleMethodSelect = (method: SubmissionMethod) => {
    setSubmissionMethod(method);
    if (method === 'manual') {
      setCurrentStep(2); // Start with name input
    } else {
      setCurrentStep(2); // Start with photo capture
    }
  };

  const handleNextStep = () => {
    if (submissionMethod === 'manual') {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleFieldComplete = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Auto-advance to next step for manual entry
    if (submissionMethod === 'manual' && value.trim()) {
      setTimeout(() => handleNextStep(), 500);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    
    // Validation based on submission method
    if (submissionMethod === 'manual') {
      if (!formData.customerName || !formData.customerId || !formData.customerDob || !formData.phoneNumber || !formData.teamLeaderId) {
        setError('Please fill in all required fields');
        return;
      }
    } else if (submissionMethod === 'photo') {
      if (!formData.phoneNumber || !formData.teamLeaderId || !capturedPhoto) {
        setError('Please enter phone number, select team leader, and capture photo');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const selectedTeamLeader = teamLeaders.find(tl => tl.id === formData.teamLeaderId);
      
      const requestData = {
        customerName: submissionMethod === 'manual' ? formData.customerName.trim() : 'From ID Photo',
        customerId: submissionMethod === 'manual' ? formData.customerId.trim() : 'From ID Photo',
        customerDob: submissionMethod === 'manual' ? formData.customerDob.trim() : 'From ID Photo',
        phoneNumber: formData.phoneNumber.trim(),
        teamLeaderId: formData.teamLeaderId,
        teamLeaderName: selectedTeamLeader?.name || '',
        status: 'Pending',
        submittedAt: Date.now(),
        submittedBy: user.idNumber,
        submittedByPhone: user.phoneNumber,
        dealerCode: user.dealerCode || '',
        dealerName: user.vanShop || '',
        simSerial: formData.simSerial?.trim() || null,
        photoUrl: submissionMethod === 'photo' ? capturedPhoto : null,
        submissionMethod: submissionMethod,
        failureReason: null
      };
      
      console.log('Submitting start key request:', requestData);
      
      // Save to Firestore
      await addDoc(collection(db, 'start_key_requests'), requestData);
      
      console.log('Start key request submitted successfully');
      onSuccess();
      resetForm();
      onClose();
      
    } catch (err) {
      console.error('Error submitting start key request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white' }}>
          <Typography variant="h6">
            Submit Start Key Request
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Step Indicator */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
              {currentStep === 1 ? 'Step 1 of 3' : 
               submissionMethod === 'manual' ? `Step ${currentStep} of 5` : 
               'Step 2 of 2'}
            </Typography>
          </Box>

          {/* SIM Serial Display (always visible) */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: selectedSimSerial ? '#2e7d32' : '#f44336',
                fontWeight: 'bold',
                fontSize: '15px'
              }}
            >
              SIM Serial: {selectedSimSerial || 'Not selected'}
            </Typography>
            {!selectedSimSerial && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowQRScanner(true)}
                startIcon={<ScanIcon />}
                sx={{ mt: 1 }}
              >
                Scan SIM
              </Button>
            )}
          </Box>
          
          {currentStep === 1 ? (
            // Step 1: Choose submission method
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: '#2e7d32', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <Typography sx={{ color: 'white', fontSize: '18px' }}>📞</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'black' }}>
                  Start Key Request
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ mb: 3, color: 'black', opacity: 0.7 }}>
                Choose how you want to submit the start key request:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: '2px solid #e0e0e0',
                      '&:hover': { borderColor: '#2e7d32' }
                    }}
                    onClick={() => handleMethodSelect('manual')}
                  >
                    <CardActionArea sx={{ p: 3 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <EditIcon sx={{ fontSize: 48, color: '#2e7d32', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Manual Entry
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Enter customer details step by step
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: '2px solid #e0e0e0',
                      '&:hover': { borderColor: '#2e7d32' }
                    }}
                    onClick={() => handleMethodSelect('photo')}
                  >
                    <CardActionArea sx={{ p: 3 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CameraIcon sx={{ fontSize: 48, color: '#2e7d32', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Photo Capture
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Capture customer ID photo
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Box>
              </Box>
            </Box>
          ) : submissionMethod === 'manual' ? (
            // Manual entry steps
            <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
              {currentStep === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                    Customer Full Name
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Enter full name (2-3 words)"
                    value={formData.customerName}
                    onChange={(e) => handleFieldComplete('customerName', e.target.value)}
                    disabled={submitting}
                    autoFocus
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
              
              {currentStep === 3 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                    Customer ID Number
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Enter ID number (6-12 digits)"
                    value={formData.customerId}
                    onChange={(e) => handleFieldComplete('customerId', e.target.value)}
                    disabled={submitting}
                    autoFocus
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
              
              {currentStep === 4 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                    Date of Birth
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="DD/MM/YYYY"
                    value={formData.customerDob}
                    onChange={(e) => handleFieldComplete('customerDob', e.target.value)}
                    disabled={submitting}
                    autoFocus
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
              
              {currentStep === 5 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                    Phone Number
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="+254XXXXXXXXX"
                    value={formData.phoneNumber}
                    onChange={(e) => handleFieldComplete('phoneNumber', e.target.value)}
                    disabled={submitting}
                    autoFocus
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ mt: 3 }}>
                    <FormControl fullWidth disabled={submitting}>
                      <InputLabel>Team Leader</InputLabel>
                      <Select 
                        value={formData.teamLeaderId}
                        onChange={(e) => handleInputChange('teamLeaderId', e.target.value)}
                        label="Team Leader"
                      >
                        {loading ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            Loading team leaders...
                          </MenuItem>
                        ) : teamLeaders.length > 0 ? (
                          teamLeaders.map((leader) => (
                            <MenuItem key={leader.id} value={leader.id}>
                              {leader.name} - {leader.vanShop}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>No team leaders found</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            // Photo capture step
            <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
              <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
                Capture Customer ID Photo
              </Typography>
              
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={handlePhotoCapture}
                  disabled={submitting}
                  startIcon={<CameraIcon />}
                  sx={{ backgroundColor: '#2e7d32', mb: 2 }}
                >
                  {capturedPhoto ? 'Retake Photo' : 'Capture Photo'}
                </Button>
                {capturedPhoto && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CheckIcon color="success" />
                    <Typography variant="body2" color="success.main">
                      Photo captured successfully
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="+254XXXXXXXXX"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled={submitting}
                  required
                />
                
                <FormControl fullWidth disabled={submitting}>
                  <InputLabel>Team Leader</InputLabel>
                  <Select 
                    value={formData.teamLeaderId}
                    onChange={(e) => handleInputChange('teamLeaderId', e.target.value)}
                    label="Team Leader"
                  >
                    {loading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading team leaders...
                      </MenuItem>
                    ) : teamLeaders.length > 0 ? (
                      teamLeaders.map((leader) => (
                        <MenuItem key={leader.id} value={leader.id}>
                          {leader.name} - {leader.vanShop}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No team leaders found</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={handleClose} 
            disabled={submitting}
            sx={{ color: 'black', backgroundColor: 'transparent' }}
          >
            Cancel
          </Button>
          
          {submissionMethod && (
            <Button 
              onClick={onSubmit}
              variant="contained"
              disabled={submitting || loading || (submissionMethod === 'manual' && currentStep < 5) || (submissionMethod === 'photo' && !capturedPhoto)}
              sx={{ backgroundColor: '#2e7d32' }}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* QR Scanner Dialog */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </>
  );
};

export default StartKeyRequestForm;
