// User types
export interface User {
  id: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  role: 'BA' | 'TEAM_LEADER' | 'MANAGER';
  vanShop: string;
  dealerCode: string;
  accountStatus: 'Active' | 'Inactive';
  createdAt: number;
  updatedAt: number;
}

// Activation types
export interface ScanActivation {
  id: string;
  serialNumber: string;
  baId: string;
  baName: string;
  baPhone: string;
  vanShop: string;
  location: string;
  timestamp: number;
  qualityStatus: 'Good' | 'Bad' | 'Flagged';
  commission: number;
  isQualityLine: boolean;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

// Start Key Request types
export interface StartKeyRequest {
  id: string;
  customerName: string;
  customerId: string;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: number;
  submittedBy: string;
  submittedByPhone: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  approvedAt?: number;
  completedAt?: number;
  notes?: string;
}

// Team Leader types
export interface TeamLeaderInfo {
  name: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  location: string;
  dateStarted: string;
}

// Van Shop types
export interface VanShopInfo {
  vanShop: string;
  driver?: DriverInfo;
  teamLeader?: TeamLeaderInfo;
  createdAt: number;
  updatedAt: number;
}

export interface DriverInfo {
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverIdNumber: string;
  licenceNumber: string;
  vanShop: string;
  dateStarted: string;
  accountStatus: string;
}

// Performance types
export interface BAPerformance {
  baId: string;
  baName: string;
  baPhone: string;
  totalActivations: number;
  qualityScore: number;
  totalCommission: number;
  rank: number;
}

// Order PDF types
export interface OrderPDF {
  id: string;
  orderNumber: string;
  originalFileName: string;
  fileSize: number;
  vanShop: string;
  createdAt: number;
  downloadUrl: string;
}

// Financial Settings types
export interface FinancialSettings {
  qualityLinePay: number;
  nonQualityPenalty: number;
  flaggedLinePenalty: number;
  baMonthlyTarget: number;
  baDailyTarget: number;
  updatedAt: number;
}

// Dashboard Stats types
export interface DashboardStats {
  todayActivations: number;
  weekActivations: number;
  monthActivations: number;
  performanceScore: number;
  teamSize: number;
  pendingRequests: number;
}

// Auth Context types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (idNumber: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}
