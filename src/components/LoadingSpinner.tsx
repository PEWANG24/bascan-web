'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'green' | 'blue';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  text 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-orange-500';
      case 'white':
        return 'text-white';
      case 'green':
        return 'text-green-500';
      case 'blue':
        return 'text-blue-500';
      default:
        return 'text-orange-500';
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <div
        className={`
          ${getSizeClasses()}
          ${getColorClasses()}
          animate-spin rounded-full border-2 border-current border-t-transparent
        `}
      />
      {text && (
        <span className={`text-sm font-medium ${getColorClasses()}`}>
          {text}
        </span>
      )}
    </div>
  );
}

// Button Loading State Component
export function ButtonLoadingState({ 
  isLoading, 
  children, 
  loadingText = 'Loading...',
  className = ''
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}) {
  return (
    <button
      className={`
        ${className}
        ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
        transition-all duration-200
      `}
      disabled={isLoading}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color="white" text={loadingText} />
      ) : (
        children
      )}
    </button>
  );
}
