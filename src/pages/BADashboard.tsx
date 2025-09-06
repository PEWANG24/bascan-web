import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  BottomNavigation,
  BottomNavigationAction
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Store as StoreIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
  QrCodeScanner as ScanIcon,
  Star as StartKeyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import QRScanner from '../components/QRScanner';
import StartKeyRequestForm from '../components/StartKeyRequestForm';

interface DashboardStats {
  todayActivations: number;
  pendingActivations: number;
  monthRanking: number;
  monthTotal: number;
}

interface ScanActivation {
  id: string;
  simSerial: string;
  location: string;
  idNumber: string;
  baName: string;
  userEmail: string;
  dealerCode: string;
  phoneNumber: string;
  vanShop: string;
  mobigoNo: string;
  timestamp: number;
  dealerName: string;
  latitude?: number;
  longitude?: number;
}

interface StartKeyRequest {
  id: string;
  customerName: string;
  customerId: string;
  customerDob: string;
  phoneNumber: string;
  photoUrl?: string;
  teamLeaderId: string;
  teamLeaderName: string;
  status: string;
  submittedAt: number;
  submittedBy: string;
  submittedByPhone: string;
  dealerCode: string;
  dealerName: string;
  simSerial?: string;
  statusUpdatedAt?: number;
  failureReason?: string;
}

const BADashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    todayActivations: 0,
    pendingActivations: 0,
    monthRanking: 0,
    monthTotal: 0
  });
  const [recentActivations, setRecentActivations] = useState<ScanActivation[]>([]);
  const [startKeyRequests, setStartKeyRequests] = useState<StartKeyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [startKeyFormOpen, setStartKeyFormOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading dashboard data for user:', user.idNumber);
      
      // Get time ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      
      // Load scan activations
      console.log('📊 Loading scan activations...');
      const activationsQuery = query(
        collection(db, 'scan_activations'),
        where('idNumber', '==', user.idNumber),
        where('timestamp', '>=', monthStart),
        orderBy('timestamp', 'desc')
      );
      
      const activationsSnapshot = await getDocs(activationsQuery);
      const activations = activationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanActivation[];
      
      console.log('📊 Found activations:', activations.length);
      setRecentActivations(activations.slice(0, 10)); // Recent 10
      
      // Calculate stats
      const todayActivations = activations.filter(a => a.timestamp >= today).length;
      const monthTotal = activations.length;
      
      // Load start key requests
      console.log('📋 Loading start key requests...');
      const requestsQuery = query(
        collection(db, 'start_key_requests'),
        where('submittedBy', '==', user.idNumber),
        orderBy('submittedAt', 'desc')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StartKeyRequest[];
      
      console.log('📋 Found requests:', requests.length);
      setStartKeyRequests(requests);
      
      const pendingRequests = requests.filter(r => r.status === 'Pending').length;
      
      // Calculate ranking (simplified - would need more complex query for real ranking)
      const monthRanking = Math.floor(Math.random() * 50) + 1; // Mock ranking for now

      setStats({
        todayActivations,
        pendingActivations: pendingRequests,
        monthRanking,
        monthTotal
      });
      
      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleQRScan = async (result: string) => {
    console.log('QR Code scanned:', result);
    
    if (!user) return;
    
    try {
      // Create a new scan activation record
      const activationData = {
        simSerial: result,
        location: user.locationPlace || 'Unknown Location',
        idNumber: user.idNumber,
        baName: user.fullName,
        userEmail: user.email,
        dealerCode: user.dealerCode || '',
        phoneNumber: user.phoneNumber,
        vanShop: user.vanShop,
        mobigoNo: user.deviceImei,
        timestamp: Date.now(),
        dealerName: user.vanShop,
        latitude: user.locationLat,
        longitude: user.locationLng
      };
      
      console.log('Creating activation record:', activationData);
      
      // Save to Firestore
      await addDoc(collection(db, 'scan_activations'), activationData);
      
      console.log('SIM activation recorded successfully');
      
      // Refresh dashboard data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Error recording activation:', error);
      setError('Failed to record activation. Please try again.');
    }
  };

  const handleStartKeySuccess = () => {
    console.log('Start key request submitted successfully');
    // Refresh dashboard data
    loadDashboardData();
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Home - Dashboard
        return (
          <>
            {/* User Profile Card - Green like mobile app */}
            <Card 
              sx={{ 
                mb: 3, 
                backgroundColor: '#2e7d32', 
                color: 'white',
                borderRadius: 2,
                boxShadow: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Welcome, {user?.fullName}!
                  </Typography>
                  <Chip 
                    label={user?.accountStatus} 
                    sx={{ 
                      backgroundColor: user?.accountStatus === 'Active' ? '#4caf50' : '#f44336',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StoreIcon sx={{ fontSize: 20 }} />
                    <Typography variant="body2">
                      <strong>Van/Shop:</strong> {user?.vanShop}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon sx={{ fontSize: 20 }} />
                    <Typography variant="body2">
                      <strong>IMEI 1:</strong> {user?.deviceImei}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* SIM Activations Section */}
            <Typography 
              variant="h6" 
              sx={{ 
                textAlign: 'center', 
                mb: 2, 
                fontWeight: 'bold',
                color: '#333'
              }}
            >
              SIM Activations
            </Typography>

            {/* Statistics Table - Matching mobile app layout */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#2e7d32' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        TODAY
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        PENDING
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        RANK
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                        MONTH TOTAL
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                        {stats.todayActivations}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
                        {stats.pendingActivations}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                        {stats.monthRanking}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                        {stats.monthTotal}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Quality Line Card - Matching mobile app */}
            <Card 
              sx={{ 
                backgroundColor: '#2e7d32', 
                color: 'white',
                borderRadius: 2,
                boxShadow: 2
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Quality Line
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  A SIM card that has been activated by the BA, registered for M-PESA, loaded with at least 50 KES airtime, 
                  enrolled in Bonga Points, used to purchase a product with the 50 KES airtime, and used to make the first call on the phone.
                </Typography>
              </CardContent>
            </Card>
          </>
        );
      
      case 1: // Scan
        return (
          <Box>
            <Card sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <ScanIcon sx={{ fontSize: 64, color: '#2e7d32', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Scan SIM Cards
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Use your device camera to scan SIM card QR codes for activation
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ backgroundColor: '#2e7d32' }}
                onClick={() => setScannerOpen(true)}
                startIcon={<ScanIcon />}
              >
                Start Scanning
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Allow camera access when prompted
              </Typography>
            </Card>

            {/* Recent Activations */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activations ({recentActivations.length})
                </Typography>
                {recentActivations.length > 0 ? (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {recentActivations.map((activation) => (
                      <Box key={activation.id} sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {activation.simSerial}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {activation.location} • {new Date(activation.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip 
                            label="Activated" 
                            color="success" 
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No recent activations found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      
      case 2: // Start Key
        return (
          <Box>
            <Card sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <StartKeyIcon sx={{ fontSize: 64, color: '#2e7d32', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Start Key Requests
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Submit start key requests for customer activations
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ backgroundColor: '#2e7d32' }}
                onClick={() => setStartKeyFormOpen(true)}
                startIcon={<StartKeyIcon />}
              >
                New Request
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Fill out the form to submit a request
              </Typography>
            </Card>

            {/* Start Key Requests List */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Requests ({startKeyRequests.length})
                </Typography>
                {startKeyRequests.length > 0 ? (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {startKeyRequests.map((request) => (
                      <Box key={request.id} sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {request.customerName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {request.phoneNumber} • {new Date(request.submittedAt).toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Team Leader: {request.teamLeaderName}
                            </Typography>
                          </Box>
                          <Chip 
                            label={request.status} 
                            color={
                              request.status === 'Approved' ? 'success' :
                              request.status === 'Pending' ? 'warning' :
                              request.status === 'Rejected' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                        {request.failureReason && (
                          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                            Reason: {request.failureReason}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No start key requests found
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      
      
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            MANAAL V3
          </Typography>
          <IconButton color="inherit" onClick={loadDashboardData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, pb: 7 }}>
        <Container maxWidth="md" sx={{ py: 3 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Loading dashboard data...
              </Typography>
            </Box>
          )}

          {/* Tab Content */}
          {renderTabContent()}

        </Container>
        </Box>

      {/* Bottom Navigation - Fixed at bottom */}
      <BottomNavigation
        value={activeTab}
        onChange={(event, newValue) => setActiveTab(newValue)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTop: '1px solid #e0e0e0',
          zIndex: 1000
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeIcon />}
          sx={{
            color: activeTab === 0 ? '#2e7d32' : '#666',
            '&.Mui-selected': {
              color: '#2e7d32'
            }
          }}
        />
        <BottomNavigationAction
          label="Scan"
          icon={<ScanIcon />}
          sx={{
            color: activeTab === 1 ? '#2e7d32' : '#666',
            '&.Mui-selected': {
              color: '#2e7d32'
            }
          }}
        />
        <BottomNavigationAction
          label="Start Key"
          icon={<StartKeyIcon />}
          sx={{
            color: activeTab === 2 ? '#2e7d32' : '#666',
            '&.Mui-selected': {
              color: '#2e7d32'
            }
          }}
        />
      </BottomNavigation>

      {/* QR Scanner Modal */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Start Key Request Form Modal */}
      <StartKeyRequestForm
        open={startKeyFormOpen}
        onClose={() => setStartKeyFormOpen(false)}
        onSuccess={handleStartKeySuccess}
      />
    </Box>
  );
};

export default BADashboard;