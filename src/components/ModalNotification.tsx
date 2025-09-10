'use client';

import { useEffect, useState } from 'react';

interface ModalNotificationProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  showOkButton?: boolean;
  okButtonText?: string;
}

export default function ModalNotification({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  title,
  showOkButton = true,
  okButtonText = 'OK'
}: ModalNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Don't auto-close loading modals
      if (type !== 'loading') {
        // Auto-close after 5 seconds for non-loading modals
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setTimeout(onClose, 300);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, type, onClose]);

  if (!isVisible) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          textColor: 'text-green-700',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          textColor: 'text-red-700',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'loading':
        return {
          icon: '⏳',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-800',
          textColor: 'text-orange-700',
          buttonColor: 'bg-orange-600 hover:bg-orange-700'
        };
      default:
        return {
          icon: '📢',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700',
          buttonColor: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={type !== 'loading' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div
        className={`
          relative w-full max-w-md mx-auto transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div className={`
          ${styles.bgColor} ${styles.borderColor}
          border-2 rounded-2xl shadow-2xl p-6
        `}>
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className={`text-3xl ${styles.iconColor}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className={`text-lg font-bold ${styles.titleColor}`}>
                {title || (type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : type === 'loading' ? 'Processing...' : 'Notification')}
              </h3>
            </div>
          </div>

          {/* Message */}
          <div className={`${styles.textColor} text-sm leading-relaxed mb-6`}>
            {message.split('\n').map((line, index) => (
              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                {line}
              </p>
            ))}
          </div>

          {/* Loading indicator for loading type */}
          {type === 'loading' && (
            <div className="mb-6">
              <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showOkButton && type !== 'loading' && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className={`
                  ${styles.buttonColor}
                  text-white px-6 py-2 rounded-lg font-medium
                  transition-all duration-200 transform hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                `}
              >
                {okButtonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Success Modal Component
export function SuccessModal({ message, isVisible, onClose, title }: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
}) {
  return (
    <ModalNotification
      message={message}
      type="success"
      isVisible={isVisible}
      onClose={onClose}
      title={title}
    />
  );
}

// Error Modal Component
export function ErrorModal({ message, isVisible, onClose, title }: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
}) {
  return (
    <ModalNotification
      message={message}
      type="error"
      isVisible={isVisible}
      onClose={onClose}
      title={title}
    />
  );
}

// Loading Modal Component
export function LoadingModal({ message, isVisible, onClose, title }: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
}) {
  return (
    <ModalNotification
      message={message}
      type="loading"
      isVisible={isVisible}
      onClose={onClose}
      title={title}
      showOkButton={false}
    />
  );
}
