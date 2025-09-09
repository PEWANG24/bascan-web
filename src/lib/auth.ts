import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserInfo {
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  dealerCode: string;
  vanShop: string;
  deviceImei: string;
  role: string;
  accountStatus: string;
}

// Hash function to match Android app's PIN hashing (SHA-256)
const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const loginUser = async (idNumber: string, pin: string): Promise<UserInfo | null> => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    // Query users collection by ID number and PIN hash (matching Android app logic)
    const pinHash = await hashPin(pin);
    const usersQuery = query(
      collection(db, 'users'),
      where('idNumber', '==', idNumber.toUpperCase()),
      where('pinHash', '==', pinHash)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      throw new Error('Invalid credentials. Please check your ID number and PIN.');
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.accountStatus !== 'Active') {
      throw new Error('Account is not active. Please contact support.');
    }
    
    if (userData.role !== 'BA') {
      throw new Error('Access denied. This web version is for Brand Ambassadors only.');
    }
    
    return userData as UserInfo;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
