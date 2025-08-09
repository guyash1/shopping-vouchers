import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useHousehold } from './HouseholdContext';
import { Voucher } from '../types/vouchers';
import { usePageVisibility } from '../utils/usePageVisibility';

interface VouchersContextType {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  refreshVouchers: () => void;
}

const VouchersContext = createContext<VouchersContextType | undefined>(undefined);

export function VouchersProvider({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const { selectedHousehold } = useHousehold();
  const { isActive } = usePageVisibility({ inactivityTimeout: 10, enableInactivityTimeout: true });
  const location = useLocation();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // רק טאבים שצריכים שוברים
  const voucherRelevantRoutes = ['/vouchers', '/stats', '/redeem'];
  const isVoucherRoute = voucherRelevantRoutes.includes(location.pathname);

  // מאזין בזמן-אמת לשוברים עם Page Visibility + Route אופטימיזציה
  useEffect(() => {
    if (!user) {
      setVouchers([]);
      setLoading(false);
      return;
    }

    if (!isActive) {

      return;
    }

    if (!isVoucherRoute) {

      setLoading(false);
      return;
    }


    setLoading(true);
    setError(null);

    let q;
    if (selectedHousehold) {
      // שוברים של משק בית
      q = query(
        collection(db, 'vouchers'),
        where('householdId', '==', selectedHousehold.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      // שוברים אישיים
      q = query(
        collection(db, 'vouchers'),
        where('userId', '==', user.uid),
        where('householdId', '==', null),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        try {
          const liveVouchers: Voucher[] = snapshot.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              storeName: data.storeName,
              amount: data.amount,
              isUsed: data.isUsed || false,
              expiryDate: data.expiryDate || undefined,
              imageUrl: data.imageUrl || undefined,
              createdAt: data.createdAt?.toDate() || new Date(),
              userId: data.userId,
              householdId: data.householdId,
              category: data.category || 'general',
              isPartial: data.isPartial || false,
              remainingAmount: data.remainingAmount
            } as Voucher;
          });
          
          setVouchers(liveVouchers);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('שגיאה בעיבוד נתוני שוברים:', err);
          setError('שגיאה בטעינת שוברים');
          setLoading(false);
        }
      },
      (err) => {
        console.error('שגיאה במאזין שוברים:', err);
        setError('שגיאה בחיבור לשוברים');
        setLoading(false);
        
        // fallback - נסה ללא מיון אם יש בעיית אינדקס
        if (err.message && err.message.includes('index')) {
          console.warn('נסה ללא מיון בגלל בעיית אינדקס');
          
          let fallbackQuery;
          if (selectedHousehold) {
            fallbackQuery = query(
              collection(db, 'vouchers'),
              where('householdId', '==', selectedHousehold.id)
            );
          } else {
            fallbackQuery = query(
              collection(db, 'vouchers'),
              where('userId', '==', user.uid),
              where('householdId', '==', null)
            );
          }
          
          const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
            const fallbackVouchers: Voucher[] = snapshot.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                storeName: data.storeName,
                amount: data.amount,
                isUsed: data.isUsed || false,
                expiryDate: data.expiryDate || undefined,
                imageUrl: data.imageUrl || undefined,
                createdAt: data.createdAt?.toDate() || new Date(),
                userId: data.userId,
                householdId: data.householdId,
                category: data.category || 'general',
                isPartial: data.isPartial || false,
                remainingAmount: data.remainingAmount
              } as Voucher;
            });
            
            // מיון ידני
            fallbackVouchers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            
            setVouchers(fallbackVouchers);
            setLoading(false);
            setError(null);
          });
          
          return () => fallbackUnsubscribe();
        }
      }
    );

    return () => {

      unsubscribe();
    };
  }, [user, selectedHousehold, isActive, isVoucherRoute]);

  // פונקציית רענון ידני (למקרה שצריך)
  const refreshVouchers = () => {
    // הreset יגרום ל-useEffect לרוץ שוב
    setLoading(true);
  };

  const value: VouchersContextType = {
    vouchers,
    loading,
    error,
    refreshVouchers,
  };

  return (
    <VouchersContext.Provider value={value}>{children}</VouchersContext.Provider>
  );
}

export function useVouchers() {
  const context = useContext(VouchersContext);
  if (!context) {
    throw new Error('useVouchers must be used within a VouchersProvider');
  }
  return context;
} 