'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, isVisible, onClose, duration = 5000 }: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        if (type !== 'loading') {
          setIsAnimating(false);
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, type, duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600 text-white';
      case 'error':
        return 'bg-red-500 border-red-600 text-white';
      case 'info':
        return 'bg-blue-500 border-blue-600 text-white';
      case 'loading':
        return 'bg-orange-500 border-orange-600 text-white';
      default:
        return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'loading':
        return '⏳';
      default:
        return '📢';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        className={`
          ${getToastStyles()}
          border-2 rounded-lg shadow-2xl p-4 transform transition-all duration-300 ease-in-out
          ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <span className="text-xl">{getIcon()}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-5">{message}</p>
          </div>
          {type !== 'loading' && (
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-2 text-white hover:text-gray-200 transition-colors"
            >
              <span className="text-lg">×</span>
            </button>
          )}
        </div>
        {type === 'loading' && (
          <div className="mt-2">
            <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Toast Component
export function LoadingToast({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  return (
    <Toast
      message={message}
      type="loading"
      isVisible={isVisible}
      onClose={onClose}
      duration={0} // Don't auto-close loading toasts
    />
  );
}

// Success Toast Component
export function SuccessToast({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  return (
    <Toast
      message={message}
      type="success"
      isVisible={isVisible}
      onClose={onClose}
      duration={4000}
    />
  );
}

// Error Toast Component
export function ErrorToast({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  return (
    <Toast
      message={message}
      type="error"
      isVisible={isVisible}
      onClose={onClose}
      duration={6000}
    />
  );
}
