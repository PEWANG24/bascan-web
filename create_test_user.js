// Script to create a test user with PIN 29985394
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
const serviceAccount = require('./path-to-service-account.json'); // You'll need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'manaal-ba'
});

const db = admin.firestore();

// Hash function to match mobile app
function hashPin(pin) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function createTestUser() {
  try {
    const idNumber = '29985394';
    const pin = '29985394';
    const pinHash = hashPin(pin);
    
    const userData = {
      fullName: 'TEST USER 29985394',
      idNumber: idNumber.toUpperCase(),
      phoneNumber: '+254700000000',
      email: 'test29985394@bascan.com',
      deviceImei: 'TEST_IMEI_29985394',
      vanShop: 'TEST VAN SHOP',
      pinHash: pinHash,
      role: 'BA',
      accountStatus: 'Active',
      locationLat: -1.2921,
      locationLng: 36.8219,
      locationPlace: 'Nairobi, Kenya',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(idNumber.toUpperCase()).set(userData);
    
    console.log('Test user created successfully!');
    console.log('ID Number:', idNumber);
    console.log('PIN:', pin);
    console.log('PIN Hash:', pinHash);
    console.log('User Data:', userData);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
