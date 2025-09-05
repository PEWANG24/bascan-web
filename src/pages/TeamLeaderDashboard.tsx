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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar
} from '@mui/material';
import {
  Assignment as RequestIcon,
  Inventory as StockIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { StartKeyRequest, BAPerformance, OrderPDF, DashboardStats, User } from '../types';
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

const TeamLeaderDashboard: React.FC = () => {
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
  const [pendingRequests, setPendingRequests] = useState<StartKeyRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [stockOrders, setStockOrders] = useState<OrderPDF[]>([]);
  const [, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load pending requests
      const requestsQuery = query(
        collection(db, 'start_key_requests'),
        where('teamLeaderId', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'asc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StartKeyRequest[];
      setPendingRequests(requests);

      // Load team members
      const teamQuery = query(
        collection(db, 'users'),
        where('vanShop', '==', user.vanShop),
        where('role', '==', 'BA'),
        where('accountStatus', '==', 'Active')
      );
      const teamSnapshot = await getDocs(teamQuery);
      const team = teamSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setTeamMembers(team);

      // Load stock orders
      const stockQuery = query(
        collection(db, 'OrderPDFs'),
        where('vanShop', '==', user.vanShop),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const stockSnapshot = await getDocs(stockQuery);
      const stock = stockSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrderPDF[];
      setStockOrders(stock);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Load team activations for stats
      const activationsQuery = query(
        collection(db, 'scan_activations'),
        where('vanShop', '==', user.vanShop),
        where('timestamp', '>=', today.getTime())
      );
      const activationsSnapshot = await getDocs(activationsQuery);
      const todayActivations = activationsSnapshot.docs.length;

      setStats({
        todayActivations,
        weekActivations: 0, // Will be calculated separately
        monthActivations: 0, // Will be calculated separately
        performanceScore: Math.round((todayActivations / (team.length * 10)) * 100),
        teamSize: team.length,
        pendingRequests: requests.length
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MANAAL V3 - Team Leader Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.fullName} ({user?.vanShop})
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
                Team Size
              </Typography>
              <Typography variant="h4">
                {stats.teamSize}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Requests
              </Typography>
              <Typography variant="h4">
                {stats.pendingRequests}
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
              <Tab label="Pending Requests" />
              <Tab label="Team Members" />
              <Tab label="Stock Orders" />
              <Tab label="Analytics" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Pending Start Key Requests ({pendingRequests.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Submitted By</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.customerName}</TableCell>
                      <TableCell>{request.phoneNumber}</TableCell>
                      <TableCell>{request.submittedBy}</TableCell>
                      <TableCell>
                        {new Date(request.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={request.status}
                          color={getStatusColor(request.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          No pending requests
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Team Members ({teamMembers.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {teamMembers.map((member) => (
                <Card key={member.id} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ mr: 2 }}>
                        {member.fullName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {member.fullName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.phoneNumber}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      ID: {member.idNumber}
                    </Typography>
                    <Chip
                      label={member.accountStatus}
                      color={member.accountStatus === 'Active' ? 'success' : 'error'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              ))}
              {teamMembers.length === 0 && (
                <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No team members found
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Recent Stock Orders
            </Typography>
            <List>
              {stockOrders.map((order) => (
                <ListItem key={order.id} divider>
                  <ListItemIcon>
                    <StockIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${order.orderNumber} - ${order.originalFileName}`}
                    secondary={`${new Date(order.createdAt).toLocaleString()} - ${(order.fileSize / 1024).toFixed(1)} KB`}
                  />
                  <Chip
                    label="Latest"
                    color="primary"
                    size="small"
                  />
                </ListItem>
              ))}
              {stockOrders.length === 0 && (
                <Typography color="text.secondary">
                  No stock orders found
                </Typography>
              )}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Team Analytics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Card sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Team Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Performance metrics and analytics will be displayed here
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activation Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activation trends and charts will be displayed here
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default TeamLeaderDashboard;
