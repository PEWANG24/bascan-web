'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitStartKeyRequest, validateSerialInSimStock, getInvalidSerialMessage, checkFirestoreDuplicate, getUserStartKeyRequests, StartKeyRequest, submitSimActivation, getUserSimActivations, SimActivation, checkStartKeyDuplicate, isValidICCID, checkLocalDuplicate, saveLocalActivation } from '@/lib/database';
import Toast, { LoadingToast, SuccessToast, ErrorToast } from '@/components/Toast';
import LoadingSpinner, { ButtonLoadingState } from '@/components/LoadingSpinner';

interface User {
  fullName: string;
  idNumber: string;
  vanShop: string;
  dealerCode: string;
  role: string;
  email?: string;
  phoneNumber?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [marketArea, setMarketArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<StartKeyRequest[]>([]);
  const [activations, setActivations] = useState<SimActivation[]>([]);
  const [activeTab, setActiveTab] = useState<'activation' | 'startkey'>('activation');
  
  // Toast notification states
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'loading';
    isVisible: boolean;
    position?: 'top-right' | 'button-context';
    buttonRef?: React.RefObject<HTMLButtonElement>;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
    position: 'top-right'
  });
  
  // Loading states for different operations
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
  const [isSubmittingStartKey, setIsSubmittingStartKey] = useState(false);
  
  // Button refs for contextual toasts
  const activationButtonRef = useRef<HTMLButtonElement>(null);
  const startKeyButtonRef = useRef<HTMLButtonElement>(null);
  
  // Start Key Request form fields (like Android app)
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState('');
  const [showStartKeyDialog, setShowStartKeyDialog] = useState(false);
  
  // Stepwise dialog state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<'manual' | 'photo' | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<Array<{id: string, name: string, vanShop: string}>>([]);
  const [todaySerial, setTodaySerial] = useState<string | null>(null);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [hasScannedToday, setHasScannedToday] = useState(false);
  const [showIdCapture, setShowIdCapture] = useState(false);
  const [selectedIdPhoto, setSelectedIdPhoto] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [idLineNumber, setIdLineNumber] = useState('');
  
  // Default Safaricom SIM pattern (like Android app)
  const defaultSerialPattern = '89254021374248037492';
  const router = useRouter();

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'loading', position: 'top-right' | 'button-context' = 'top-right', buttonRef?: React.RefObject<HTMLButtonElement>) => {
    setToast({ message, type, isVisible: true, position, buttonRef });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const showLoadingToast = (message: string, position: 'top-right' | 'button-context' = 'top-right', buttonRef?: React.RefObject<HTMLButtonElement>) => {
    showToast(message, 'loading', position, buttonRef);
  };

  const showSuccessToast = (message: string, position: 'top-right' | 'button-context' = 'top-right', buttonRef?: React.RefObject<HTMLButtonElement>) => {
    showToast(message, 'success', position, buttonRef);
  };

  const showErrorToast = (message: string, position: 'top-right' | 'button-context' = 'top-right', buttonRef?: React.RefObject<HTMLButtonElement>) => {
    showToast(message, 'error', position, buttonRef);
  };

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadUserRequests(parsedUser.idNumber);
    loadUserActivations(parsedUser.idNumber);
    // Load team leaders with user data so we can auto-select based on van shop
    loadTeamLeaders(parsedUser);
  }, [router]);

  const loadUserRequests = async (idNumber: string) => {
    try {
      const userRequests = await getUserStartKeyRequests(idNumber);
      setRequests(userRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadUserActivations = async (idNumber: string) => {
    try {
      const userActivations = await getUserSimActivations(idNumber);
      setActivations(userActivations);
      
      // Get today's latest SIM serial (like Android app)
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayActivations = userActivations.filter(activation => 
        new Date(activation.timestamp) >= startOfToday
      );
      
      if (todayActivations.length > 0) {
        // Get the most recent activation from today
        const latestToday = todayActivations.sort((a, b) => b.timestamp - a.timestamp)[0];
        setTodaySerial(latestToday.serialNumber);
        setHasScannedToday(true);
      } else {
        setTodaySerial(null);
        setHasScannedToday(false);
      }
    } catch (error) {
      console.error('Error loading activations:', error);
      setHasScannedToday(false);
    }
  };

  const loadTeamLeaders = async (currentUser?: User) => {
    try {
      // Show loading state
      setMessage('🔍 Finding your team leader...');
      
      // Load team leaders from the same collection as Android app
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const teamLeadersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'TEAM_LEADER'),
        where('accountStatus', '==', 'Active')
      );
      
      const querySnapshot = await getDocs(teamLeadersQuery);
      const leaders: Array<{id: string, name: string, vanShop: string}> = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leaders.push({
          id: doc.id,
          name: data.fullName || data.name || 'Team Leader',
          vanShop: data.vanShop || ''
        });
      });
      
      setTeamLeaders(leaders);
      
      // Auto-select team leader based on user's van shop (like Android app)
      const userToCheck = currentUser || user;
      if (userToCheck && userToCheck.vanShop) {
        const matchingLeader = leaders.find(leader => 
          leader.vanShop?.trim().toUpperCase() === userToCheck.vanShop?.trim().toUpperCase()
        );
        if (matchingLeader) {
          setSelectedTeamLeader(matchingLeader.id);
          setMessage('✅ Team leader found! Ready to submit your request.');
          // Clear the success message after 2 seconds
          setTimeout(() => setMessage(''), 2000);
        } else {
          setMessage('⚠️ No team leader found for your van shop. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Error loading team leaders:', error);
      setMessage('❌ Error loading team leaders. Please try again.');
    }
  };


  const handleSubmitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !serialNumber.trim() || !marketArea.trim()) {
      showErrorToast('Please fill in all fields.');
      return;
    }

    // Validate ICCID format (exactly 20 digits) - like Android app
    if (!isValidICCID(serialNumber)) {
      showErrorToast('Invalid ICCID format - must be exactly 20 digits');
      return;
    }

    setIsSubmittingActivation(true);
    showLoadingToast('🔄 Processing SIM activation...', 'button-context', activationButtonRef);
    setMessage('');

    try {
      // STEP 1: Local duplicate check (fast - like Android app)
      const isLocalDuplicate = checkLocalDuplicate(serialNumber);
      if (isLocalDuplicate) {
        hideToast();
        showErrorToast('This SIM serial has already been activated locally today. Please check your records.', 'button-context', activationButtonRef);
        setIsSubmittingActivation(false);
        return;
      }

      // STEP 2: Fast serial validation against simStock collection (like Android app)
      showLoadingToast('🔍 Validating SIM serial...', 'button-context', activationButtonRef);
      const isValidSerial = await validateSerialInSimStock(serialNumber);
      if (!isValidSerial) {
        hideToast();
        showErrorToast(getInvalidSerialMessage(serialNumber), 'button-context', activationButtonRef);
        setIsSubmittingActivation(false);
        return;
      }

      // STEP 3: Firestore duplicate check (like Android app)
      showLoadingToast('🔍 Checking for duplicates...', 'button-context', activationButtonRef);
      const isFirestoreDuplicate = await checkFirestoreDuplicate(serialNumber);
      if (isFirestoreDuplicate) {
        hideToast();
        showErrorToast('This SIM serial has already been activated and exists in the server. Please use a different SIM.', 'button-context', activationButtonRef);
        setIsSubmittingActivation(false);
        return;
      }

      // STEP 4: Submit SIM activation
      showLoadingToast('📤 Submitting activation to server...', 'button-context', activationButtonRef);
      await submitSimActivation({
        serialNumber: serialNumber.trim(),
        marketArea: marketArea.trim(),
        userId: user.idNumber,
        userName: user.fullName,
        userEmail: user.email || '',
        dealerCode: user.dealerCode,
        phoneNumber: user.phoneNumber || '',
        vanShop: user.vanShop,
        isSynced: true,
        reviewStatus: 'Under Review' // Match Android app
      });

      // STEP 5: Save to local storage (like Android app)
      showLoadingToast('💾 Saving to local storage...', 'button-context', activationButtonRef);
      saveLocalActivation(serialNumber.trim(), marketArea.trim(), user.idNumber);

      // Success message (like Android app)
      hideToast();
      showSuccessToast('✅ SIM activation completed successfully! Your activation has been recorded and uploaded to the server.', 'button-context', activationButtonRef);
      
      // Keep the serial number for start key request
      // setSerialNumber(''); // Don't clear it, keep it for start key
      setMarketArea('');
      
      // Reload activations
      await loadUserActivations(user.idNumber);
      
      // Auto-switch to Start Key tab after a short delay for smooth transition
      setTimeout(() => {
        setActiveTab('startkey');
        showSuccessToast('Now you can request a start key for this SIM. Choose your preferred method below.', 'top-right');
      }, 1500);
    } catch (error: unknown) {
      console.error('Activation error:', error);
      hideToast();
      showErrorToast('An error occurred while processing the activation. Please try again.', 'button-context', activationButtonRef);
    } finally {
      setIsSubmittingActivation(false);
    }
  };

  const handleSubmitStartKeyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customerName.trim() || !customerId.trim() || !customerDob.trim() || !customerPhone.trim()) {
      showErrorToast('Please fill in all customer information fields.');
      return;
    }
    
    if (!selectedTeamLeader) {
      showErrorToast('Team leader not found for your van shop. Please contact support.');
      return;
    }

    setIsSubmittingStartKey(true);
    showLoadingToast('🔄 Processing start key request...', 'button-context', startKeyButtonRef);
    setMessage('');

    try {
      // Check for duplicate start key request (like Android app)
      if (serialNumber.trim()) {
        showLoadingToast('🔍 Checking for duplicate requests...', 'button-context', startKeyButtonRef);
        const isDuplicate = await checkStartKeyDuplicate(serialNumber.trim());
        if (isDuplicate) {
          hideToast();
          showErrorToast('A Start Key request for this SIM serial has already been submitted.', 'button-context', startKeyButtonRef);
          setIsSubmittingStartKey(false);
          return;
        }
      }

      // Get selected team leader name
      const selectedLeader = teamLeaders.find(leader => leader.id === selectedTeamLeader);
      const teamLeaderName = selectedLeader ? selectedLeader.name : 'Unknown Team Leader';

      // Submit start key request with customer information (like Android app)
      showLoadingToast('📤 Submitting request to server...', 'button-context', startKeyButtonRef);
      const requestData: Omit<StartKeyRequest, 'requestId' | 'submittedAt'> = {
        customerName: customerName.trim(),
        customerId: customerId.trim(),
        customerDob: customerDob.trim(),
        phoneNumber: customerPhone.trim(),
        teamLeaderId: selectedTeamLeader,
        teamLeaderName: teamLeaderName,
        status: 'pending',
        submittedBy: user.idNumber,
        submittedByPhone: user.phoneNumber || '',
        dealerCode: user.dealerCode,
        dealerName: user.vanShop
      };
      
      // Only add simSerial if it has a value
      if (serialNumber.trim()) {
        requestData.simSerial = serialNumber.trim();
      }
      
      await submitStartKeyRequest(requestData);

      hideToast();
      showSuccessToast('🎉 Start key request submitted successfully! You will receive an SMS notification once your team leader processes the request.', 'button-context', startKeyButtonRef);
      
      // Reset form
      setCustomerName('');
      setCustomerId('');
      setCustomerDob('');
      setCustomerPhone('');
      setSelectedTeamLeader('');
      setSerialNumber('');
      setShowStartKeyDialog(false);
      
      // Reload requests
      await loadUserRequests(user.idNumber);
    } catch (error: unknown) {
      console.error('Start key request error:', error);
      hideToast();
      showErrorToast('An error occurred while processing the request. Please try again.', 'button-context', startKeyButtonRef);
    } finally {
      setIsSubmittingStartKey(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };



  // Step navigation functions
  const resetStartKeyDialog = () => {
    setCurrentStep(1);
    setSelectedMethod(null);
    setCustomerName('');
    setCustomerId('');
    setCustomerDob('');
    setCustomerPhone('');
    setSelectedTeamLeader('');
    setSerialNumber('');
  };


  const populateDefaultSerial = () => {
    setSerialNumber(defaultSerialPattern);
  };

  const handleSerialChange = (value: string) => {
    // Limit to 20 digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 20) {
      setSerialNumber(digitsOnly);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-black text-green-800 flex items-center space-x-2">
                <span className="text-4xl">📱</span>
                <span>BA SCAN</span>
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {/* User Info - Simplified */}
          <div className="bg-white overflow-hidden shadow-lg rounded-lg mb-6 border-l-4 border-green-500">
            <div className="px-4 py-4">
              <h3 className="text-base font-bold text-green-800 mb-3 flex items-center space-x-2">
                <span>👤</span>
                <span>Welcome, {user.fullName}</span>
              </h3>
              <p className="text-sm text-gray-600">
                Van Shop: <span className="font-semibold text-gray-900">{user.vanShop}</span>
              </p>
            </div>
          </div>

          {/* Web Portal Notice */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">📱</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-blue-800">
                  Web Portal Notice
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>
                    This web portal is <strong>only for SIM scanning and start key requests</strong>. 
                    For all other functions like reports, analytics, and advanced features, 
                    please use the <strong>MANAAL mobile app</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile App Style Tab Navigation */}
          <div className="bg-white rounded-t-2xl shadow-lg mb-6">
            <div className="flex">
              {/* SIM Activation Tab */}
              <button
                onClick={() => setActiveTab('activation')}
                className={`flex-1 flex flex-col items-center py-4 px-2 transition-all duration-200 ${
                  activeTab === 'activation'
                    ? 'text-orange-600 border-b-4 border-orange-500 bg-gradient-to-b from-orange-50 to-orange-100'
                    : 'text-gray-500 hover:text-orange-600 hover:bg-orange-25'
                }`}
              >
                <span className="text-2xl mb-1">📱</span>
                <span className="text-sm font-semibold">SIM Activation</span>
              </button>
              
              {/* Start Key Request Tab */}
              <button
                onClick={() => setActiveTab('startkey')}
                className={`flex-1 flex flex-col items-center py-4 px-2 transition-all duration-200 ${
                  activeTab === 'startkey'
                    ? 'text-teal-600 border-b-4 border-teal-500 bg-gradient-to-b from-teal-50 to-teal-100'
                    : 'text-gray-500 hover:text-teal-600 hover:bg-teal-25'
                }`}
              >
                <span className="text-2xl mb-1">🔑</span>
                <span className="text-sm font-semibold">Start Key</span>
              </button>
            </div>
          </div>

          {/* SIM Activation Form */}
          {activeTab === 'activation' && (
            <div className="bg-white overflow-hidden shadow-xl rounded-xl mb-6 border-l-4 border-orange-500">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-black text-orange-800 mb-4 flex items-center space-x-2">
                  <span>📱</span>
                  <span>Activate SIM Card</span>
                </h3>
                
                <form onSubmit={handleSubmitActivation} className="space-y-4 sm:space-y-6">
                  <div>
                    <label htmlFor="serialNumber" className="block text-sm font-bold text-gray-800">
                      SIM Serial Number (20 digits)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="serialNumber"
                        id="serialNumber"
                        value={serialNumber}
                        onChange={(e) => handleSerialChange(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500"
                        placeholder="Enter 20-digit SIM serial number"
                        maxLength={20}
                        required
                      />
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={populateDefaultSerial}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Use Default Pattern
                      </button>
                      <span className="text-xs text-gray-500">
                        {serialNumber.length}/20 digits
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="marketArea" className="block text-sm font-bold text-gray-800">
                      Market Area
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="marketArea"
                        id="marketArea"
                        value={marketArea}
                        onChange={(e) => setMarketArea(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500"
                        placeholder="Enter market area (e.g., Nairobi CBD)"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-center sm:justify-end">
                    <ButtonLoadingState
                      ref={activationButtonRef}
                      isLoading={isSubmittingActivation}
                      loadingText="Activating SIM..."
                      className="inline-flex justify-center py-3 px-6 border border-transparent shadow-lg text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                      <div className="flex items-center space-x-2">
                        <span>📱</span>
                        <span>Activate SIM</span>
                      </div>
                    </ButtonLoadingState>
                  </div>
                </form>

                {message && (
                  <div className={`mt-4 p-4 rounded-md ${
                    message.includes('Error') || message.includes('already been activated') 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start Key Request Section - Direct Method Selection */}
          {activeTab === 'startkey' && (
            <div className="bg-white overflow-hidden shadow-xl rounded-xl mb-6 border-l-4 border-teal-500">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-black text-teal-800 mb-4 flex items-center space-x-2">
                  <span>🔑</span>
                  <span>Start Key Requests</span>
                </h3>
                <p className="text-sm text-teal-700 mb-4 font-bold">
                  Choose how you want to submit the start key request:
                </p>
                
                <div className="space-y-4">
                  {/* Manual Entry Option */}
                  <button
                    onClick={() => {
                      setSelectedMethod('manual');
                      // Auto-populate serial number with last scanned serial (like Android app)
                      if (hasScannedToday && todaySerial) {
                        setSerialNumber(todaySerial);
                      }
                      setShowStartKeyDialog(true);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl text-teal-600">✏️</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">Manual Entry</div>
                          <div className="text-sm text-gray-500">Enter customer details manually</div>
                        </div>
                      </div>
                      <span className="text-gray-400">▼</span>
                    </div>
                  </button>
                  
                  {/* ID Photo Capture Option */}
                  <button
                    onClick={() => {
                      setSelectedMethod('photo');
                      // Auto-populate serial number with last scanned serial (like Android app)
                      if (hasScannedToday && todaySerial) {
                        setSerialNumber(todaySerial);
                      }
                      setShowIdCapture(true);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl text-teal-600">📷</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">ID Photo Capture</div>
                          <div className="text-sm text-gray-500">Take photo of ID and enter line number</div>
                        </div>
                      </div>
                      <span className="text-gray-400">▼</span>
                    </div>
                  </button>
                </div>
                
                {/* Track My Requests Button */}
                <button
                  onClick={() => {/* TODO: Navigate to requests tracking */}}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mb-3"
                >
                  <div className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Track My Requests</span>
                  </div>
                </button>
                
              </div>
            </div>
          )}


          {/* Global Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('Error') || message.includes('Please fill') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              <div className="whitespace-pre-line">{message}</div>
            </div>
          )}



          {/* Start Key Request Dialog */}
          {showStartKeyDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Start Key Request</h3>
                  {selectedMethod && (
                    <span className="text-green-600 font-medium">Step 2 of 2</span>
                  )}
                </div>
                
                <form onSubmit={handleSubmitStartKeyRequest} className="space-y-4">
                  {/* ID Photo Info (if from photo capture) */}
                  {selectedMethod === 'photo' && selectedIdPhoto && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📷</span>
                        <div>
                          <p className="text-sm font-medium text-green-800">ID Photo Captured</p>
                          <p className="text-xs text-green-600">Line Number: {idLineNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* SIM Serial (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SIM Serial (Optional)
                      {hasScannedToday && todaySerial && serialNumber === todaySerial && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          (Auto-filled from last scan)
                        </span>
                      )}
                    </label>
                    <div className="flex rounded-md shadow-sm">
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => handleSerialChange(e.target.value)}
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500 ${
                        hasScannedToday && todaySerial && serialNumber === todaySerial 
                          ? 'bg-green-50 border-green-300' 
                          : ''
                      }`}
                      placeholder="Enter or scan serial number"
                      maxLength={20}
                    />
                    </div>
                    <div className="mt-1 flex space-x-2">
                      <button
                        type="button"
                        onClick={populateDefaultSerial}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Use Default Pattern
                      </button>
                      <span className="text-xs text-gray-500">
                        {serialNumber.length}/20 digits
                      </span>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500"
                      placeholder="Enter customer full name"
                      required
                    />
                  </div>

                  {/* Customer ID */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Customer ID *
                    </label>
                    <input
                      type="text"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500"
                      placeholder="Enter customer ID number"
                      required
                    />
                  </div>

                  {/* Customer DOB */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Customer Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={customerDob}
                      onChange={(e) => setCustomerDob(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900"
                      required
                    />
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Customer Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm font-semibold text-gray-900 placeholder-gray-500"
                      placeholder="Enter customer phone number"
                      required
                    />
                  </div>

                  {/* Team Leader (Auto-selected) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Team Leader
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 sm:text-sm font-semibold">
                      {selectedTeamLeader ? 
                        teamLeaders.find(leader => leader.id === selectedTeamLeader)?.name || '🔍 Finding your team leader...' 
                        : '🔍 Finding your team leader...'
                      }
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-selected based on your van shop
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowStartKeyDialog(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <ButtonLoadingState
                      ref={startKeyButtonRef}
                      isLoading={isSubmittingStartKey}
                      loadingText="🚀 Submitting your request..."
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Submit Request
                    </ButtonLoadingState>
                  </div>
                </form>

                {message && (
                  <div className={`mt-4 p-4 rounded-md ${
                    message.includes('Error') || message.includes('Please fill') 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    <div className="whitespace-pre-line">{message}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Method Selection Dialog - Step 1 of 2 (Android App Style) */}
          {showMethodSelection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-bold">Step 1 of 2</span>
                    <span className={`text-sm font-semibold ${hasScannedToday ? 'text-green-600' : 'text-red-600'}`}>
                      {hasScannedToday ? `SIM Serial: ${todaySerial}` : 'No SIM serial scanned today'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🔑</span>
                    <h3 className="text-lg font-black text-gray-900">Start Key Request</h3>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-6 font-semibold">
                  Choose how you want to submit the start key request:
                </p>
                
                <div className="space-y-4">
                  {/* Manual Entry Option */}
                  <button
                    onClick={() => {
                      setSelectedMethod('manual');
                      // Auto-populate serial number with last scanned serial (like Android app)
                      if (hasScannedToday && todaySerial) {
                        setSerialNumber(todaySerial);
                      }
                      setShowMethodSelection(false);
                      setShowStartKeyDialog(true);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl text-teal-600">✏️</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">Manual Entry</div>
                          <div className="text-sm text-gray-500">Enter customer details manually</div>
                        </div>
                      </div>
                      <span className="text-gray-400">▼</span>
                    </div>
                  </button>
                  
                  {/* ID Photo Capture Option */}
                  <button
                    onClick={() => {
                      setSelectedMethod('photo');
                      // Auto-populate serial number with last scanned serial (like Android app)
                      if (hasScannedToday && todaySerial) {
                        setSerialNumber(todaySerial);
                      }
                      setShowMethodSelection(false);
                      setShowIdCapture(true);
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl text-teal-600">📷</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">ID Photo Capture</div>
                          <div className="text-sm text-gray-500">Take photo of ID and enter line number</div>
                        </div>
                      </div>
                      <span className="text-gray-400">▼</span>
                    </div>
                  </button>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowMethodSelection(false)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ID Photo Capture Dialog - Step 2 of 2 */}
          {showIdCapture && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-medium">Step 2 of 2</span>
                    <span className={`text-sm ${hasScannedToday ? 'text-green-600' : 'text-red-600'}`}>
                      {hasScannedToday ? `SIM Serial: ${todaySerial}` : 'No SIM serial scanned today'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📷</span>
                    <h3 className="text-lg font-semibold text-gray-900">ID Photo Capture</h3>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Take a photo of the customer&apos;s ID and enter the line number:
                </p>
                
                <div className="space-y-4">
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Photo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {idPhotoPreview ? (
                        <div className="space-y-2">
                          <img 
                            src={idPhotoPreview} 
                            alt="ID Preview" 
                            className="mx-auto h-32 w-auto rounded-lg object-cover"
                          />
                          <button
                            onClick={() => {
                              setSelectedIdPhoto(null);
                              setIdPhotoPreview(null);
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove Photo
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedIdPhoto(file);
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setIdPhotoPreview(e.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id="id-photo-upload"
                          />
                          <label
                            htmlFor="id-photo-upload"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <span className="text-4xl mb-2">📷</span>
                            <span className="text-sm text-gray-600">Tap to take photo</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Line Number Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Number
                    </label>
                    <input
                      type="text"
                      value={idLineNumber}
                      onChange={(e) => setIdLineNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 font-semibold text-gray-900 placeholder-gray-500"
                      placeholder="Enter line number from ID"
                    />
                  </div>
                  
                </div>
                
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => {
                      setShowIdCapture(false);
                      setShowMethodSelection(true);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedIdPhoto || !idLineNumber.trim()) {
                        alert('Please take a photo and enter the line number');
                        return;
                      }
                      
                      // Directly submit start key request with ID photo data (like Android app)
                      setShowIdCapture(false);
                      setLoading(true);
                      setMessage('');

                      try {
                        // Check for duplicate start key request
                        if (serialNumber.trim()) {
                          const isDuplicate = await checkStartKeyDuplicate(serialNumber.trim());
                          if (isDuplicate) {
                            setMessage('A Start Key request for this SIM serial has already been submitted.');
                            setLoading(false);
                            return;
                          }
                        }

                        // Get selected team leader name
                        const selectedLeader = teamLeaders.find(leader => leader.id === selectedTeamLeader);
                        const teamLeaderName = selectedLeader ? selectedLeader.name : 'Unknown Team Leader';

                        // Convert photo to base64 for storage
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                          const photoDataUrl = e.target?.result as string;
                          
                          // Submit start key request with ID photo data
                          const requestData: Omit<StartKeyRequest, 'requestId' | 'submittedAt'> = {
                            customerName: idLineNumber.trim(), // Use line number as customer name for ID photo method
                            customerId: idLineNumber.trim(), // Use line number as customer ID
                            customerDob: '', // Not available from ID photo
                            phoneNumber: idLineNumber.trim(), // Use line number as phone
                            teamLeaderId: selectedTeamLeader,
                            teamLeaderName: teamLeaderName,
                            status: 'pending',
                            submittedBy: user!.idNumber,
                            submittedByPhone: user!.phoneNumber || '',
                            dealerCode: user!.dealerCode,
                            dealerName: user!.vanShop,
                            photoUrl: photoDataUrl
                          };
                          
                          // Only add simSerial if it has a value
                          if (serialNumber.trim()) {
                            requestData.simSerial = serialNumber.trim();
                          }
                          
                          await submitStartKeyRequest(requestData);

                          setMessage('🎉 Start key request submitted successfully with ID photo!\n\n📱 You will receive an SMS notification once your team leader processes the request. Please wait for confirmation.');
                          
                          // Reset form
                          setSelectedIdPhoto(null);
                          setIdPhotoPreview(null);
                          setIdLineNumber('');
                          setSerialNumber('');
                          setShowMethodSelection(false);
                          
                          // Clear message after 5 seconds
                          setTimeout(() => {
                            setMessage('');
                          }, 5000);
                        };
                        reader.readAsDataURL(selectedIdPhoto);
                        
                      } catch (error: unknown) {
                        console.error('Start key request error:', error);
                        setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to submit start key request'}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!selectedIdPhoto || !idLineNumber.trim() || loading}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>📸 Processing your ID photo...</span>
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
                
                {message && (
                  <div className={`mt-4 p-4 rounded-md ${
                    message.includes('Error') || message.includes('Please fill') 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    <div className="whitespace-pre-line">{message}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent SIM Activations - Moved to bottom */}
          {activations.length > 0 && (
            <div className="bg-white overflow-hidden shadow-xl rounded-xl mb-6 border-l-4 border-blue-500">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-black text-blue-800 mb-4 flex items-center space-x-2">
                  <span>📊</span>
                  <span>Recent SIM Activations ({activations.length})</span>
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activations.slice(0, 30).map((activation, index) => (
                    <div key={activation.id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                            <span className="text-sm font-mono text-gray-800 bg-gray-200 px-2 py-1 rounded">
                              {activation.serialNumber}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-semibold">Location:</span>
                            <span className="ml-1">{activation.marketArea || 'N/A'}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-semibold">Time:</span>
                            <span className="ml-1">
                              {new Date(activation.timestamp).toLocaleDateString('en-GB')} {new Date(activation.timestamp).toLocaleTimeString('en-GB')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {activations.length > 30 && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-gray-500">
                      Showing last 30 activations out of {activations.length} total
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position={toast.position}
        buttonRef={toast.buttonRef}
      />
    </div>
  );
}
