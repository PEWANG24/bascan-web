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
  scanId?: string;
  scanType?: string;
  isPending?: boolean;
  createdAt?: number;
  syncedAt?: number;
  // Additional fields to match Android app
  simSerial?: string;
  idNumber?: string;
  baName?: string;
  dealerName?: string;
  location?: string;
  activationDate?: string;
  mobigoNo?: string;
  scanStatus?: string;
  qualityProcessed?: boolean;
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

// Simple validation cache (like Android app)
const validationCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if serial exists in simStock collection (fixed to work with actual data structure)
export const validateSerialInSimStock = async (serial: string): Promise<boolean> => {
  try {
    // Check cache first (like Android app)
    const cached = validationCache.get(serial);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.result;
    }

    // First try the array-contains approach (in case serialNumbers field exists)
    try {
      const q = query(
        collection(db, 'simStock'),
        where('serialNumbers', 'array-contains', serial)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        validationCache.set(serial, { result: true, timestamp: Date.now() });
        return true;
      }
    } catch (arrayError) {
      console.log('Array-contains query failed, trying nested structure approach:', arrayError);
    }

    // If array-contains fails, try the nested structure approach (like Android app)
    const allSimStockQuery = query(collection(db, 'simStock'));
    const allSimStockSnapshot = await getDocs(allSimStockQuery);
    
    let result = false;
    
    // Search through all simStock documents for the serial in nested structure
    for (const doc of allSimStockSnapshot.docs) {
      const data = doc.data();
      const orders = data.orders as any[] || [];
      
      for (const order of orders) {
        const simCards = order.simCards as any[] || [];
        
        for (const simCard of simCards) {
          const serialNumber = simCard.serialNumber as string;
          if (serialNumber === serial) {
            result = true;
            break;
          }
        }
        if (result) break;
      }
      if (result) break;
    }
    
    // Cache the result (like Android app)
    validationCache.set(serial, { result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('Error validating serial in simStock:', error);
    return false;
  }
};

// Batch validation for multiple serials (more efficient)
export const validateSerialsInSimStock = async (serials: string[]): Promise<Map<string, boolean>> => {
  const results = new Map<string, boolean>();
  
  if (serials.length === 0) return results;
  
  try {
    // Check cache first for all serials
    const uncachedSerials: string[] = [];
    for (const serial of serials) {
      const cached = validationCache.get(serial);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        results.set(serial, cached.result);
      } else {
        uncachedSerials.push(serial);
      }
    }
    
    if (uncachedSerials.length === 0) return results;
    
    // Try array-contains approach first for uncached serials
    try {
      const q = query(
        collection(db, 'simStock'),
        where('serialNumbers', 'array-contains-any', uncachedSerials.slice(0, 10)) // Firestore limit
      );
      
      const querySnapshot = await getDocs(q);
      const foundSerials = new Set<string>();
      
      for (const doc of querySnapshot.docs) {
        const serialNumbers = doc.data().serialNumbers as string[] || [];
        for (const serial of serialNumbers) {
          foundSerials.add(serial);
        }
      }
      
      // Update results and cache
      for (const serial of uncachedSerials) {
        const found = foundSerials.has(serial);
        results.set(serial, found);
        validationCache.set(serial, { result: found, timestamp: Date.now() });
      }
      
      return results;
    } catch (arrayError) {
      console.log('Array-contains-any query failed, trying nested structure approach:', arrayError);
    }
    
    // Fallback to nested structure approach
    const allSimStockQuery = query(collection(db, 'simStock'));
    const allSimStockSnapshot = await getDocs(allSimStockQuery);
    
    const foundSerials = new Set<string>();
    
    // Search through all simStock documents for serials in nested structure
    for (const doc of allSimStockSnapshot.docs) {
      const data = doc.data();
      const orders = data.orders as any[] || [];
      
      for (const order of orders) {
        const simCards = order.simCards as any[] || [];
        
        for (const simCard of simCards) {
          const serialNumber = simCard.serialNumber as string;
          if (uncachedSerials.includes(serialNumber)) {
            foundSerials.add(serialNumber);
          }
        }
      }
    }
    
    // Update results and cache
    for (const serial of uncachedSerials) {
      const found = foundSerials.has(serial);
      results.set(serial, found);
      validationCache.set(serial, { result: found, timestamp: Date.now() });
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch validation:', error);
    // Return false for all uncached serials on error
    for (const serial of serials) {
      if (!results.has(serial)) {
        results.set(serial, false);
      }
    }
    return results;
  }
};

// Diagnostic function to check simStock structure
export const diagnoseSimStockStructure = async (): Promise<any> => {
  try {
    const allSimStockQuery = query(collection(db, 'simStock'));
    const allSimStockSnapshot = await getDocs(allSimStockQuery);
    
    const structure = {
      totalDocuments: allSimStockSnapshot.docs.length,
      hasSerialNumbersField: false,
      hasNestedStructure: false,
      sampleDocument: null as any,
      serialCount: 0,
      nestedSerialCount: 0
    };
    
    if (allSimStockSnapshot.docs.length > 0) {
      const sampleDoc = allSimStockSnapshot.docs[0];
      const data = sampleDoc.data();
      
      structure.sampleDocument = {
        id: sampleDoc.id,
        fields: Object.keys(data),
        hasSerialNumbers: 'serialNumbers' in data,
        hasOrders: 'orders' in data
      };
      
      // Check for serialNumbers field
      if (data.serialNumbers && Array.isArray(data.serialNumbers)) {
        structure.hasSerialNumbersField = true;
        structure.serialCount = data.serialNumbers.length;
      }
      
      // Check for nested structure
      if (data.orders && Array.isArray(data.orders)) {
        structure.hasNestedStructure = true;
        
        for (const order of data.orders) {
          if (order.simCards && Array.isArray(order.simCards)) {
            for (const simCard of order.simCards) {
              if (simCard.serialNumber) {
                structure.nestedSerialCount++;
              }
            }
          }
        }
      }
    }
    
    return structure;
  } catch (error) {
    console.error('Error diagnosing simStock structure:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Get user-friendly error message for invalid serial (like Android app)
export const getInvalidSerialMessage = (serial: string): string => {
  return "This serial isn't registered with MANAAL. Use the SIM from your dealer.";
};

// ICCID validation function (like Android app)
export const isValidICCID = (iccid: string): boolean => {
  // ICCID validation: exactly 20 digits
  return /^\d{20}$/.test(iccid);
};

// Local duplicate check (like Android app) - checks localStorage for recent activations
export const checkLocalDuplicate = (serial: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get today's activations from localStorage
    const todayActivations = JSON.parse(localStorage.getItem('today_activations') || '[]');
    
    // Check if serial exists in today's activations
    return todayActivations.some((activation: any) => 
      activation.serialNumber === serial && 
      new Date(activation.timestamp) >= startOfToday
    );
  } catch (error) {
    console.error('Error checking local duplicate:', error);
    return false;
  }
};

// Save activation to local storage (like Android app)
export const saveLocalActivation = (serial: string, marketArea: string, userId: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get existing today's activations
    const todayActivations = JSON.parse(localStorage.getItem('today_activations') || '[]');
    
    // Add new activation
    const newActivation = {
      serialNumber: serial,
      marketArea: marketArea,
      userId: userId,
      timestamp: Date.now()
    };
    
    todayActivations.push(newActivation);
    
    // Keep only today's activations (cleanup old ones)
    const filteredActivations = todayActivations.filter((activation: any) => 
      new Date(activation.timestamp) >= startOfToday
    );
    
    localStorage.setItem('today_activations', JSON.stringify(filteredActivations));
  } catch (error) {
    console.error('Error saving local activation:', error);
  }
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
    const scanId = `scan_${timestamp}_${randomString}`;
    
    // Create scan data matching Android app structure exactly
    const scanData = {
      // Core identification (like Android app)
      scanId: scanId,
      simSerial: activation.serialNumber,
      idNumber: activation.userId || 'ID not available',
      
      // Essential user data (like Android app)
      baName: activation.userName || 'Name not available',
      userEmail: activation.userEmail || 'Email not available',
      phoneNumber: activation.phoneNumber || 'Phone not available',
      
      // Dealer information (like Android app)
      dealerCode: activation.dealerCode || 'Dealer code not available',
      dealerName: activation.vanShop || 'Dealer name not available',
      vanShop: activation.vanShop || 'Van/Shop not available',
      
      // Location and activation data (like Android app)
      location: activation.marketArea || 'Location not available',
      activationDate: new Date(timestamp).toLocaleDateString('en-GB'),
      mobigoNo: 'Device ID not available', // Web app doesn't have device ID
      
      // Status and processing (like Android app)
      isPending: false,
      reviewStatus: 'Under Review',
      scanType: 'activation',
      scanStatus: 'completed',
      qualityProcessed: false,
      
      // Timestamps (like Android app)
      timestamp: timestamp,
      createdAt: timestamp,
      syncedAt: timestamp,
      
      // GPS coordinates (web app doesn't have GPS, use 0.0 like Android fallback)
      latitude: activation.latitude || 0.0,
      longitude: activation.longitude || 0.0
    };
    
    const docRef = await addDoc(collection(db, 'scan_activations'), scanData);
    
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
        serialNumber: data.serialNumber || data.simSerial || '',
        marketArea: data.marketArea || data.location || '',
        userId: data.userId || data.idNumber || '',
        userName: data.userName || data.baName || '',
        userEmail: data.userEmail || '',
        dealerCode: data.dealerCode || '',
        phoneNumber: data.phoneNumber || '',
        vanShop: data.vanShop || '',
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp || 0,
        isSynced: data.isSynced || false,
        reviewStatus: data.reviewStatus || 'Under Review', // Match Android app
        qualityStatus: data.qualityStatus,
        locationPlace: data.locationPlace,
        scanId: data.scanId,
        scanType: data.scanType,
        isPending: data.isPending || false,
        createdAt: data.createdAt,
        syncedAt: data.syncedAt,
        // Additional fields from Android app
        simSerial: data.simSerial,
        idNumber: data.idNumber,
        baName: data.baName,
        dealerName: data.dealerName,
        location: data.location,
        activationDate: data.activationDate,
        mobigoNo: data.mobigoNo,
        scanStatus: data.scanStatus,
        qualityProcessed: data.qualityProcessed
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
