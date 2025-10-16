import { useState, useEffect } from 'react';

/**
 * Hook to manage first-time user experience
 * Shows onboarding tutorial for new users
 */
export function useFirstTimeUser() {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('carto-has-seen-onboarding');
    
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay for new users
      const timer = setTimeout(() => {
        setShouldShowOnboarding(true);
      }, 1500); // 1.5 second delay to let the page load

      return () => clearTimeout(timer);
    }
  }, []);

  const markOnboardingAsSeen = () => {
    localStorage.setItem('carto-has-seen-onboarding', 'true');
    setHasShownOnboarding(true);
    setShouldShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('carto-has-seen-onboarding');
    setHasShownOnboarding(false);
  };

  return {
    shouldShowOnboarding,
    hasShownOnboarding,
    markOnboardingAsSeen,
    resetOnboarding
  };
}
