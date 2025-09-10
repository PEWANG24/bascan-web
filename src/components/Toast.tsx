'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' | 'button-context';
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export default function Toast({ message, type, isVisible, onClose, duration = 5000, position = 'top-right', buttonRef }: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [toastPosition, setToastPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Calculate position if button context is specified
      if (position === 'button-context' && buttonRef?.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        setToastPosition({
          top: buttonRect.top - 10,
          left: buttonRect.left + (buttonRect.width / 2) - 150 // Center on button
        });
      }
      
      const timer = setTimeout(() => {
        if (type !== 'loading') {
          setIsAnimating(false);
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, type, duration, onClose, position, buttonRef]);

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

  const getPositionClasses = () => {
    if (position === 'button-context') {
      return 'fixed z-50 max-w-sm w-full';
    }
    
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50 max-w-sm w-full';
      case 'top-left':
        return 'fixed top-4 left-4 z-50 max-w-sm w-full';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50 max-w-sm w-full';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50 max-w-sm w-full';
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-sm w-full';
      default:
        return 'fixed top-4 right-4 z-50 max-w-sm w-full';
    }
  };

  const getAnimationClasses = () => {
    if (position === 'button-context') {
      return isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0';
    }
    
    switch (position) {
      case 'top-right':
      case 'top-left':
        return isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';
      case 'bottom-right':
      case 'bottom-left':
        return isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';
      case 'center':
        return isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0';
      default:
        return isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';
    }
  };

  return (
    <div 
      className={getPositionClasses()}
      style={position === 'button-context' ? {
        top: `${toastPosition.top}px`,
        left: `${toastPosition.left}px`
      } : {}}
    >
      <div
        className={`
          ${getToastStyles()}
          border-2 rounded-lg shadow-2xl p-4 transform transition-all duration-300 ease-in-out
          ${getAnimationClasses()}
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
