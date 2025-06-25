import React, { useEffect, useState } from 'react';
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
import { vouchersService } from '../services/firebase';
import { useHousehold } from '../contexts/HouseholdContext';
import { Voucher } from '../types/vouchers';
import { Skeleton } from './shared/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Stats() {
  const [user] = useAuthState(auth);
  const { selectedHousehold } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let fetchedVouchers: Voucher[] = [];
        if (selectedHousehold) {
          fetchedVouchers = await vouchersService.getHouseholdVouchers(selectedHousehold.id, 'desc');
        } else {
          fetchedVouchers = await vouchersService.getVouchers(user.uid, 'desc');
        }
        setVouchers(fetchedVouchers);
      } catch (e) {
        console.error('Error loading stats', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, selectedHousehold]);

  // --- Voucher stats ---
  const HEB_CAT: Record<string, string> = {
    supermarket: 'סופרמרקט',
    restaurant: 'מסעדות',
    fuel: 'דלק',
    fashion: 'אופנה',
    general: 'כללי',
    אחר: 'אחר',
  };

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
  }, [vouchers, HEB_CAT]);

  if (!user) return <div className="p-4 text-center">יש להתחבר כדי לצפות בסטטיסטיקות</div>;

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-center mb-4">סטטיסטיקות</h1>

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
  );
} 