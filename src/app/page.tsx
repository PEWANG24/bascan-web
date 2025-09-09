'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-700 to-green-800">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">📱 BA SCAN</h1>
          <p className="text-green-100">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">📱 BA SCAN</h1>
        <p className="text-green-100">Redirecting...</p>
      </div>
    </div>
  );
}