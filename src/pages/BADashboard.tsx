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
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  Assignment as RequestIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ScanActivation, StartKeyRequest, DashboardStats } from '../types';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BADashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    todayActivations: 0,
    weekActivations: 0,
    monthActivations: 0,
    performanceScore: 0,
    teamSize: 0,
    pendingRequests: 0
  });
  const [recentActivations, setRecentActivations] = useState<ScanActivation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<StartKeyRequest[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load recent activations
      const activationsQuery = query(
        collection(db, 'scan_activations'),
        where('baId', '==', user.id),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const activationsSnapshot = await getDocs(activationsQuery);
      const activations = activationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanActivation[];
      setRecentActivations(activations);

      // Load pending requests
      const requestsQuery = query(
        collection(db, 'start_key_requests'),
        where('submittedBy', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StartKeyRequest[];
      setPendingRequests(requests);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayActivations = activations.filter(a => a.timestamp >= today.getTime()).length;
      const weekActivations = activations.filter(a => a.timestamp >= weekAgo.getTime()).length;
      const monthActivations = activations.filter(a => a.timestamp >= monthAgo.getTime()).length;

      setStats({
        todayActivations,
        weekActivations,
        monthActivations,
        performanceScore: Math.round((todayActivations / 10) * 100), // Assuming 10 is daily target
        teamSize: 0, // Will be loaded separately
        pendingRequests: requests.length
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'success';
      case 'Bad': return 'error';
      case 'Flagged': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MANAAL V3 - BA Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.fullName}
          </Typography>
          <IconButton color="inherit" onClick={loadDashboardData}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Stats Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today's Activations
              </Typography>
              <Typography variant="h4">
                {stats.todayActivations}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                This Week
              </Typography>
              <Typography variant="h4">
                {stats.weekActivations}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                This Month
              </Typography>
              <Typography variant="h4">
                {stats.monthActivations}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Performance
              </Typography>
              <Typography variant="h4">
                {stats.performanceScore}%
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Recent Activations" />
              <Tab label="Pending Requests" />
              <Tab label="Profile" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Recent Activations
            </Typography>
            <List>
              {recentActivations.map((activation) => (
                <ListItem key={activation.id} divider>
                  <ListItemIcon>
                    <ScanIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${activation.serialNumber} - ${activation.customerName || 'N/A'}`}
                    secondary={`${new Date(activation.timestamp).toLocaleString()} - ${activation.location}`}
                  />
                  <Chip
                    label={activation.qualityStatus}
                    color={getStatusColor(activation.qualityStatus) as any}
                    size="small"
                  />
                </ListItem>
              ))}
              {recentActivations.length === 0 && (
                <Typography color="text.secondary">
                  No recent activations found
                </Typography>
              )}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Pending Requests ({pendingRequests.length})
            </Typography>
            <List>
              {pendingRequests.map((request) => (
                <ListItem key={request.id} divider>
                  <ListItemIcon>
                    <RequestIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${request.customerName} - ${request.phoneNumber}`}
                    secondary={`Submitted: ${new Date(request.submittedAt).toLocaleString()}`}
                  />
                  <Chip label="Pending" color="warning" size="small" />
                </ListItem>
              ))}
              {pendingRequests.length === 0 && (
                <Typography color="text.secondary">
                  No pending requests
                </Typography>
              )}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">
                  {user?.fullName}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  ID Number
                </Typography>
                <Typography variant="body1">
                  {user?.idNumber}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Phone Number
                </Typography>
                <Typography variant="body1">
                  {user?.phoneNumber}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Van Shop
                </Typography>
                <Typography variant="body1">
                  {user?.vanShop}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Typography variant="body1">
                  {user?.role}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={user?.accountStatus} 
                  color={user?.accountStatus === 'Active' ? 'success' : 'error'}
                />
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default BADashboard;
