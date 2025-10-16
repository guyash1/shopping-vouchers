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
  const { openAuthModal } = useAuthModal();
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

      {/* Empty state */}
      {perCategory.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">אין עדיין נתונים</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            הסטטיסטיקות יתחילו להופיע אחרי שתוסיף שוברים<br />
            ותתחיל לעשות קניות. הנתונים יסייעו לך<br />
            לעקוב אחר החיסכון שלך לפי קטגוריות!
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">💡 טיפ:</p>
            <p className="text-sm text-blue-700">
              הוסף שוברים בעמוד "שוברים" כדי להתחיל לראות סטטיסטיקות
            </p>
          </div>
        </div>
      ) : (
        /* Pie charts per category */
        perCategory.map(cat => (
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
        ))
      )}

      {/* Breakdown per supermarket */}
      </div>
    </>
  );
} 