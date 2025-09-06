import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePageVisibilityOptions {
  inactivityTimeout?: number; // זמן בדקות לעצירה אוטומטית
  enableInactivityTimeout?: boolean;
}

interface UsePageVisibilityReturn {
  isVisible: boolean;
  isActive: boolean; // משלב גם visibility וגם inactivity timeout
  forceActivate: () => void;
  forceDeactivate: () => void;
}

/**
 * Hook לניהול Page Visibility API עם timeout לחוסר פעילות
 * מספק שליטה על onSnapshot listeners כדי להפחית קריאות Firestore
 */
export function usePageVisibility(options: UsePageVisibilityOptions = {}): UsePageVisibilityReturn {
  const {
    inactivityTimeout = 10, // 10 דקות default
    enableInactivityTimeout = true
  } = options;

  const [isVisible, setIsVisible] = useState(() => {
    // בדיקה ראשונית אם הדף נראה
    if (typeof document !== 'undefined') {
      return document.visibilityState === 'visible';
    }
    return true;
  });

  const [isActive, setIsActive] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // איפוס טיימר חוסר פעילות
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (enableInactivityTimeout && isVisible) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsActive(false);
      }, inactivityTimeout * 60 * 1000);
    }
  }, [enableInactivityTimeout, isVisible, inactivityTimeout]);

  // מאזין לשינויי visibility של הדף
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        setIsActive(true);
        resetInactivityTimer();
      } else {
        setIsActive(false);
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      }
    };

    // הוספת מאזין לשינויי visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // התחלת טיימר חוסר פעילות
    if (isVisible) {
      resetInactivityTimer();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isVisible, inactivityTimeout, enableInactivityTimeout, resetInactivityTimer]);

  // מאזינים לפעילות משתמש כדי לאפס את הטיימר
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleUserActivity = () => {
      if (isVisible && !isActive) {
        setIsActive(true);
      }
      resetInactivityTimer();
    };

    // הוספת מאזינים לכל סוגי הפעילות
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isVisible, isActive, resetInactivityTimer]);

  // פונקציות לשליטה ידנית
  const forceActivate = useCallback(() => {
    setIsActive(true);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const forceDeactivate = useCallback(() => {
    setIsActive(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, []);

  return {
    isVisible,
    isActive,
    forceActivate,
    forceDeactivate
  };
} 