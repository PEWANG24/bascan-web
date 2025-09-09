'use client';

import { useState } from 'react';
import { loginUser } from '@/lib/auth';

export default function TestLoginPage() {
  const [idNumber, setIdNumber] = useState('');
  const [pin, setPin] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('');

    try {
      const user = await loginUser(idNumber, pin);
      setResult(`✅ Login successful! User: ${JSON.stringify(user, null, 2)}`);
    } catch (error: unknown) {
      setResult(`❌ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testPinHash = async () => {
    setLoading(true);
    try {
      // Test the PIN hashing function
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setResult(`PIN Hash: ${hash}`);
    } catch (error: unknown) {
      setResult(`Hash error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">BA SCAN - Test Login</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Login</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ID number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter PIN"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={testLogin}
                disabled={loading || !idNumber || !pin}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Testing...' : 'Test Login'}
              </button>
              
              <button
                onClick={testPinHash}
                disabled={loading || !pin}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test PIN Hash
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {result}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. Use an existing BA user's ID number and PIN from your Firestore</li>
            <li>2. Test PIN Hash to see what hash is generated for a PIN</li>
            <li>3. Check if the hash matches what's stored in your Firestore users collection</li>
            <li>4. If login fails, verify the user exists and has role "BA" and status "Active"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
