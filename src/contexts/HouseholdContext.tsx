import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { householdService } from '../services/firebase';
import { Household } from '../types/household';

interface HouseholdContextType {
  households: Household[];
  selectedHousehold: Household | null;
  personalMode: boolean; // true when no household selected
  setSelectedHousehold: (household: Household | null) => void;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHouseholdState] = useState<Household | null>(null);

  // טעינת משקי בית של המשתמש
  const loadHouseholds = async () => {
    if (!user) {
      setHouseholds([]);
      return;
    }
    try {
      const hh = await householdService.getUserHouseholds(user.uid);
      setHouseholds(hh);
      // קביעה ראשונית של משק הבית הנבחר (לפי localStorage או הראשון ברשימה)
      const savedId = localStorage.getItem('selectedHouseholdId');
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

  // שמירת הבחירה בלוקאל-סטורג׳
  const setSelectedHousehold = (household: Household | null) => {
    setSelectedHouseholdState(household);
    if (household) {
      localStorage.setItem('selectedHouseholdId', household.id);
    } else {
      localStorage.removeItem('selectedHouseholdId');
    }
  };

  const value: HouseholdContextType = {
    households,
    selectedHousehold,
    personalMode: selectedHousehold === null,
    setSelectedHousehold,
    refreshHouseholds: loadHouseholds,
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