import { useState, useEffect } from 'react';

// Interface for the BeforeInstallPrompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Hook לניהול Install Prompt
export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // בדיקה אם האפליקציה כבר מותקנת
    const checkIfInstalled = () => {
      // בדיקה אם האפליקציה פועלת בmade standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // או אם זה באמצעות הhome screen באייפון
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = isIOS && (window.navigator as any).standalone;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // מאזין לevent של beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(installEvent);
      setIsInstallable(true);
      console.log('📱 App can be installed');
    };

    // מאזין לevent של appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('📱 App installed successfully');
    };

    // הוספת event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // ניקוי
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // פונקציה להצגת install prompt
  const showInstallPrompt = async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      } else {
        console.log('❌ User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  };

  // פונקציה לבדיקה אם זה iOS (צריך הוראות מיוחדות)
  const isIOSDevice = (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  // פונקציה לבדיקה אם זה Safari על iOS
  const isIOSSafari = (): boolean => {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const safari = /Safari/.test(ua) && !/Chrome|CriOS|OPiOS|FxiOS/.test(ua);
    return iOS && safari;
  };

  return {
    isInstallable,
    isInstalled,
    showInstallPrompt,
    isIOSDevice: isIOSDevice(),
    isIOSSafari: isIOSSafari()
  };
}; 