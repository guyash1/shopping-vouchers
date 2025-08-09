import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { householdService } from '../services/firebase';
import { Household } from '../types/household';
import { getStorageItem, setStorageItem, removeStorageItem, getStorageItemParsed } from '../utils/secureStorage';

interface HouseholdContextType {
  households: Household[];
  selectedHousehold: Household | null;
  personalMode: boolean; // true when no household selected
  setSelectedHousehold: (household: Household | null) => void;
  refreshHouseholds: () => Promise<void>;
}

// Cache types and constants
interface HouseholdCache {
  households: Household[];
  timestamp: number;
  userId: string;
}

const CACHE_KEY = 'households_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 דקות במילישניות

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHouseholdState] = useState<Household | null>(null);

  // קריאת cache מהlocalStorage מאובטח
  const getCachedHouseholds = (userId: string): Household[] | null => {
    try {
      const cache = getStorageItemParsed<HouseholdCache>(CACHE_KEY);
      if (!cache) return null;
      
      // בדיקת תוקף הcache
      const now = Date.now();
      const isValid = cache.userId === userId && 
                     cache.timestamp && 
                     (now - cache.timestamp) < CACHE_TTL;

      if (isValid) {
  
        return cache.households;
      } else {
        // מחיקת cache שתפג
        removeStorageItem(CACHE_KEY);
        return null;
      }
    } catch (error) {
      console.error('שגיאה בקריאת cache:', error);
      removeStorageItem(CACHE_KEY);
      return null;
    }
  };

  // שמירת households בcache מאובטח
  const setCachedHouseholds = (households: Household[], userId: string) => {
    try {
      const cache: HouseholdCache = {
        households,
        timestamp: Date.now(),
        userId
      };
      setStorageItem(CACHE_KEY, cache);

    } catch (error) {
      console.error('שגיאה בשמירת cache:', error);
    }
  };

  // טעינת משקי בית של המשתמש עם cache
  const loadHouseholds = async (forceRefresh = false) => {
    if (!user) {
      setHouseholds([]);
      return;
    }

    try {
      // קודם ננסה לטעון מהcache (אלא אם כן נדרש refresh)
      if (!forceRefresh) {
        const cachedHouseholds = getCachedHouseholds(user.uid);
        if (cachedHouseholds) {
          setHouseholds(cachedHouseholds);
                // קביעה ראשונית של משק הבית הנבחר
      const savedId = getStorageItem('selectedHouseholdId');
      const initial = savedId
        ? cachedHouseholds.find((h: Household) => h.id === savedId) || (cachedHouseholds.length > 0 ? cachedHouseholds[0] : null)
        : cachedHouseholds.length > 0 ? cachedHouseholds[0] : null;
          setSelectedHouseholdState(initial);
          return; // יציאה כאן - השתמשנו בcache
        }
      }

      // אם אין cache או נדרש refresh - טוען מהשרת
  
      const hh = await householdService.getUserHouseholds(user.uid);
      setHouseholds(hh);
      
      // שמירה בcache
      setCachedHouseholds(hh, user.uid);

      // קביעה ראשונית של משק הבית הנבחר
      const savedId = getStorageItem('selectedHouseholdId');
      const initial = savedId
        ? hh.find((h: Household) => h.id === savedId) || (hh.length > 0 ? hh[0] : null)
        : hh.length > 0 ? hh[0] : null;
      setSelectedHouseholdState(initial);
    } catch (error) {
      console.error('שגיאה בטעינת משקי בית:', error);
    }
  };

  useEffect(() => {
    loadHouseholds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // שמירת הבחירה בלוקאל-סטורג׳ מאובטח
  const setSelectedHousehold = (household: Household | null) => {
    setSelectedHouseholdState(household);
    if (household) {
      setStorageItem('selectedHouseholdId', household.id);
    } else {
      removeStorageItem('selectedHouseholdId');
    }
  };

  // פונקציה לreiresh עם ניקוי cache
  const refreshHouseholds = async () => {
    await loadHouseholds(true); // forceRefresh = true
  };

  const value: HouseholdContextType = {
    households,
    selectedHousehold,
    personalMode: selectedHousehold === null,
    setSelectedHousehold,
    refreshHouseholds,
  };

  return (
    <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
} 