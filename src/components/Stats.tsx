import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useVouchers } from '../contexts/VouchersContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import Header from './shared/Header';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// מיפוי קטגוריות – קבוע מחוץ לקומפוננטה כדי שלא ייחשב תלות
const HEB_CAT: Record<string, string> = {
  supermarket: 'סופרמרקט',
  restaurant: 'מסעדות',
  fuel: 'דלק',
  fashion: 'אופנה',
  general: 'כללי',
  אחר: 'אחר',
};

export default function Stats() {
  const [user] = useAuthState(auth);
  const { vouchers, loading } = useVouchers();
  const { openAuthModal, closeAuthModal } = useAuthModal();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      openAuthModal('stats');
    }
  }, [user, loading, openAuthModal]);

  // --- Voucher stats ---
  // Data per category -> pie per stores
  const perCategory = React.useMemo(() => {
    const data: {
      catKey: string;
      label: string;
      total: number;
      labels: string[];
      values: number[];
    }[] = [];

    const grouped: Record<string, Record<string, number>> = {};
    vouchers.forEach(v => {
      const catKey = v.category || 'אחר';
      const remaining = v.remainingAmount ?? v.amount;
      if (remaining <= 0) return;
      if (!grouped[catKey]) grouped[catKey] = {};
      const store = v.storeName;
      grouped[catKey][store] = (grouped[catKey][store] || 0) + remaining;
    });

    Object.entries(grouped).forEach(([cat, stores]) => {
      const entries = Object.entries(stores).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((s, [, val]) => s + val, 0);
      data.push({
        catKey: cat,
        label: HEB_CAT[cat] || cat,
        total,
        labels: entries.map(e => e[0]),
        values: entries.map(e => e[1]),
      });
    });

    // sort categories by total desc
    data.sort((a, b) => b.total - a.total);
    return data;
  }, [vouchers]);

  // אם המשתמש לא מחובר, חוזר לעמוד הראשי
  React.useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-l-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="סטטיסטיקות" showHouseholdSwitcher={false} />
      
      <div className="max-w-md mx-auto p-4 space-y-8 pb-24">

      {/* Pie charts per category */}
      {perCategory.map(cat => (
        <div key={cat.catKey} className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-center">
            {cat.label} – ₪{cat.total.toLocaleString()}
          </h2>
          <Pie
            data={{
              labels: cat.labels,
              datasets: [
                {
                  data: cat.values,
                  backgroundColor: [
                    '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8',
                  ],
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  onClick: () => {},
                },
              },
            }}
          />
        </div>
      ))}

      {/* Breakdown per supermarket */}
      {/* Breakdown per supermarket */}
      </div>
    </>
  );
} 