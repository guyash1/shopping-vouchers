import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

interface InstallPromptProps {
  // אם לא מוגדר, יופיע כפתור קטן
  variant?: 'button' | 'card' | 'banner';
  // מיקום הבאנר
  position?: 'top' | 'bottom';
  // עיצוב מותאם
  className?: string;
  // הודעה מותאמת
  message?: string;
  // האם להציג רק פעם אחת
  showOnce?: boolean;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({
  variant = 'button',
  position = 'bottom',
  className = '',
  message,
  showOnce = false
}) => {
  const { isInstalled, showInstallPrompt, isIOSDevice } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // אם האפליקציה כבר מותקנת או נדחתה
  if (isInstalled || (showOnce && isDismissed)) {
    return null;
  }

  // הודעה מותאמת לפי הסוג
  const getDefaultMessage = () => {
    if (isIOSDevice) {
      return 'להתקנה: לחץ על כפתור השיתוף 📤 ואז "הוסף למסך הבית"';
    }
    return message || 'התקן את האפליקציה למסך הבית לחוויה מושלמת!';
  };

  // התקנה
  const handleInstall = async () => {
    setIsLoading(true);
    
    try {
      if (isIOSDevice) {
        // עבור iOS - נציג הוראות
        alert('לחץ על כפתור השיתוף (📤) בתחתית המסך ואז בחר "הוסף למסך הבית"');
      } else {
        // עבור Android/Chrome
        await showInstallPrompt();
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // סגירה
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // עיצוב לפי variant
  if (variant === 'button') {
    return (
      <button
        onClick={handleInstall}
        disabled={isLoading}
        className={`
          inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
          text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
          transition-colors duration-200
          ${className}
        `}
      >
        {isLoading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            מתקין...
          </div>
        ) : (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            התקן אפליקציה
          </div>
        )}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mr-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">התקן את האפליקציה</h3>
            <p className="mt-1 text-sm text-gray-500">
              {getDefaultMessage()}
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleInstall}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'מתקין...' : 'התקן'}
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`
        fixed left-0 right-0 z-50 bg-indigo-600 text-white
        ${position === 'top' ? 'top-0' : 'bottom-0'}
        ${className}
      `}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">
                {getDefaultMessage()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleInstall}
                disabled={isLoading}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                {isLoading ? 'מתקין...' : 'התקן'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt; 