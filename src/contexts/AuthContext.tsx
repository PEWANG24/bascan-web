import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🔐 AuthProvider initialized');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in (anonymously), but we get user data from our login function
        // The user data is already set in the login function
        console.log('Firebase user signed in:', firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Hash PIN function to match mobile app
  const hashPin = async (pin: string): Promise<string> => {
    // Simple SHA-256 hash implementation for browser
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Step 1: Verify ID number exists (like mobile app)
  const verifyIdNumber = async (idNumber: string): Promise<boolean> => {
    try {
      setLoading(true);

      console.log('🔍 Verifying ID number:', idNumber);

      // Normalize ID number (uppercase)
      const normalizedId = idNumber.toUpperCase();

      console.log('🔍 Normalized ID:', normalizedId);

      // Query Firestore for user by ID only (same as mobile app)
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('idNumber', '==', normalizedId)
      );

      console.log('🔍 Querying Firestore...');
      const querySnapshot = await getDocs(q);

      console.log('🔍 Query result - documents found:', querySnapshot.size);

      if (querySnapshot.empty) {
        console.log('❌ No user found with ID:', normalizedId);
        throw new Error('ID number not found. Please check your ID number.');
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      console.log('✅ User found:', userData.fullName, userData.idNumber);

      // Check account status
      if (userData.accountStatus === 'Suspended') {
        console.log('❌ Account suspended');
        throw new Error('Account is suspended. Please contact support.');
      }

      // Store user data for PIN verification
      const userObj = {
        id: userDoc.id,
        fullName: userData.fullName || '',
        idNumber: userData.idNumber || '',
        phoneNumber: userData.phoneNumber || '',
        email: userData.email || '',
        dealerCode: userData.dealerCode || '',
        vanShop: userData.vanShop || '',
        deviceImei: userData.deviceImei || '',
        role: userData.role || 'BA',
        accountStatus: userData.accountStatus || 'Active',
        locationLat: userData.locationLat || 0,
        locationLng: userData.locationLng || 0,
        locationPlace: userData.locationPlace || 'Unknown',
        createdAt: userData.createdAt?.toMillis() || Date.now(),
        updatedAt: userData.updatedAt?.toMillis() || Date.now()
      };

      console.log('✅ Setting user data:', userObj);
      setUser(userObj);
      
      return true;
      
    } catch (error) {
      console.error('ID verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify PIN (like mobile app)
  const verifyPin = async (pin: string): Promise<void> => {
    try {
      setLoading(true);

      console.log('🔐 Verifying PIN for user:', user?.idNumber);

      if (!user) {
        console.log('❌ No user data available for PIN verification');
        throw new Error('Please verify your ID number first.');
      }

      // Hash the PIN to match mobile app
      console.log('🔐 Hashing PIN...');
      const pinHash = await hashPin(pin);
      console.log('🔐 PIN hash generated:', pinHash.substring(0, 8) + '...');

      // Query Firestore for user by ID and PIN hash (same as mobile app)
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('idNumber', '==', user.idNumber),
        where('pinHash', '==', pinHash)
      );

      console.log('🔐 Querying Firestore for PIN verification...');
      const querySnapshot = await getDocs(q);

      console.log('🔐 PIN verification result - documents found:', querySnapshot.size);

      if (querySnapshot.empty) {
        console.log('❌ PIN verification failed for user:', user.idNumber);
        throw new Error('Incorrect PIN. Please try again.');
      }

      console.log('✅ PIN verification successful');
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Check account status
      if (userData.accountStatus !== 'Active') {
        throw new Error('Account is not active. Please contact support.');
      }
      
      // Update user data with latest from Firestore
      const updatedUser: User = {
        id: userDoc.id,
        fullName: userData.fullName || '',
        idNumber: userData.idNumber || '',
        phoneNumber: userData.phoneNumber || '',
        email: userData.email || '',
        dealerCode: userData.dealerCode || '',
        vanShop: userData.vanShop || '',
        deviceImei: userData.deviceImei || '',
        role: userData.role || 'BA',
        accountStatus: userData.accountStatus || 'Active',
        locationLat: userData.locationLat || 0,
        locationLng: userData.locationLng || 0,
        locationPlace: userData.locationPlace || 'Unknown',
        createdAt: userData.createdAt?.toMillis() || Date.now(),
        updatedAt: userData.updatedAt?.toMillis() || Date.now()
      };
      
      // Sign in anonymously to Firebase Auth (for session management)
      await signInAnonymously(auth);
      
      // Set user data
      setUser(updatedUser);
      
    } catch (error) {
      console.error('PIN verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Combined login function for backward compatibility
  const login = async (idNumber: string, pin: string): Promise<void> => {
    try {
      // First verify ID
      await verifyIdNumber(idNumber);
      // Then verify PIN
      await verifyPin(pin);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), {
        ...userData,
        updatedAt: Date.now()
      });
      
      setUser({ ...user, ...userData });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
    verifyIdNumber,
    verifyPin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
