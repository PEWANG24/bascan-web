import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface StartKeyRequest {
  requestId: string;
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

export interface SimActivation {
  id?: string;
  serialNumber: string;
  marketArea: string;
  userId: string;
  userName: string;
  userEmail: string;
  dealerCode: string;
  phoneNumber: string;
  vanShop: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  isSynced: boolean;
  reviewStatus: string;
  qualityStatus?: string;
  locationPlace?: string;
}

export const submitStartKeyRequest = async (request: Omit<StartKeyRequest, 'requestId' | 'submittedAt'>): Promise<string> => {
  try {
    // Generate requestId in the same format as Android app: SK_timestamp_randomString
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const requestId = `SK_${timestamp}_${randomString}`;
    
    // Filter out undefined values to avoid Firestore errors
    const requestData = {
      ...request,
      requestId,
      submittedAt: timestamp,
      status: 'pending'
    };
    
    // Remove undefined fields
    const cleanedRequestData = Object.fromEntries(
      Object.entries(requestData).filter(([_, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(collection(db, 'start_key_requests'), cleanedRequestData);
    
    console.log('Start key request submitted with ID:', requestId);
    return requestId;
  } catch (error) {
    console.error('Error submitting start key request:', error);
    throw new Error('Failed to submit start key request');
  }
};

export const getUserStartKeyRequests = async (idNumber: string): Promise<StartKeyRequest[]> => {
  try {
    const q = query(
      collection(db, 'start_key_requests'),
      where('submittedBy', '==', idNumber),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests: StartKeyRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      requests.push(doc.data() as StartKeyRequest);
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching start key requests:', error);
    throw new Error('Failed to fetch start key requests');
  }
};

// Check if serial exists in simStock collection (like Android app)
export const validateSerialInSimStock = async (serial: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'simStock'),
      where('serialNumbers', 'array-contains', serial)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if serial exists in simStock
  } catch (error) {
    console.error('Error validating serial in simStock:', error);
    return false;
  }
};

// Get user-friendly error message for invalid serial (like Android app)
export const getInvalidSerialMessage = (serial: string): string => {
  return "This serial isn't registered with MANAAL. Use the SIM from your dealer.";
};

// Check for duplicate serial in scan_activations (like Android app)
export const checkFirestoreDuplicate = async (serial: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'scan_activations'),
      where('serialNumber', '==', serial)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if duplicate exists
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return false; // Assume no duplicate if error
  }
};

export const submitSimActivation = async (activation: Omit<SimActivation, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const scanId = `SCAN_${timestamp}_${randomString}`;
    
    const activationData = {
      ...activation,
      timestamp,
      isSynced: true,
      reviewStatus: 'pending'
    };
    
    const docRef = await addDoc(collection(db, 'scan_activations'), {
      ...activationData,
      scanId,
      scanType: 'activation'
    });
    
    console.log('SIM activation submitted with ID:', scanId);
    return scanId;
  } catch (error) {
    console.error('Error submitting SIM activation:', error);
    throw new Error('Failed to submit SIM activation');
  }
};

export const getUserSimActivations = async (userId: string): Promise<SimActivation[]> => {
  try {
    const q = query(
      collection(db, 'scan_activations'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const activations: SimActivation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activations.push({
        id: doc.id,
        serialNumber: data.serialNumber || '',
        marketArea: data.marketArea || '',
        userId: data.userId || '',
        userName: data.userName || '',
        userEmail: data.userEmail || '',
        dealerCode: data.dealerCode || '',
        phoneNumber: data.phoneNumber || '',
        vanShop: data.vanShop || '',
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp || 0,
        isSynced: data.isSynced || false,
        reviewStatus: data.reviewStatus || 'pending',
        qualityStatus: data.qualityStatus,
        locationPlace: data.locationPlace
      } as SimActivation);
    });
    
    return activations;
  } catch (error) {
    console.error('Error fetching SIM activations:', error);
    throw new Error('Failed to fetch SIM activations');
  }
};

// Check if start key request already exists for a SIM serial (like Android app)
export const checkStartKeyDuplicate = async (simSerial: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'start_key_requests'),
      where('simSerial', '==', simSerial)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if duplicate exists
  } catch (error) {
    console.error('Error checking start key duplicate:', error);
    return false; // Assume no duplicate if error
  }
};
