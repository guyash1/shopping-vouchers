import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { vouchersService } from '../services/firebase';
import { useHousehold } from '../contexts/HouseholdContext';
import { Voucher } from '../types/vouchers';

interface OptResult {
  sum: number;
  used: Record<number, number>; // value -> count
}

// algorithm: bounded knap/coin change maximizing sum <= target and minimizing coins
function computeOptimal(target: number, values: number[], counts: Record<number, number>): OptResult {
  const max = target;
  const dp: (null | { sum: number; coins: number; used: Record<number, number> })[] = Array(max + 1).fill(null);
  dp[0] = { sum: 0, coins: 0, used: {} };

  for (const val of values) {
    const avail = counts[val];
    for (let t = max; t >= 0; t--) {
      if (dp[t] === null) continue;
      for (let k = 1; k <= avail; k++) {
        const newSum = t + val * k;
        if (newSum > max) break;
        const prev = dp[newSum];
        const newCoins = dp[t]!.coins + k;
        if (!prev || newSum > prev.sum || (newSum === prev.sum && newCoins < prev.coins)) {
          dp[newSum] = {
            sum: newSum,
            coins: newCoins,
            used: { ...dp[t]!.used, [val]: (dp[t]!.used[val] || 0) + k },
          };
        }
      }
    }
  }

  // find best result
  for (let s = max; s >= 0; s--) {
    if (dp[s]) {
      const res = dp[s]!;
      return { sum: res.sum, used: res.used };
    }
  }
  return { sum: 0, used: {} };
}

export default function RedeemVouchers() {
  const [user] = useAuthState(auth);
  const { selectedHousehold } = useHousehold();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<OptResult | null>(null);
  const [remainingMap, setRemainingMap] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      let list: Voucher[] = [];
      if (selectedHousehold) {
        list = await vouchersService.getHouseholdVouchers(selectedHousehold.id, 'desc');
      } else {
        list = await vouchersService.getVouchers(user.uid, 'desc');
      }
      const sup = list.filter(v => (v.category || 'general') === 'supermarket' && (v.remainingAmount ?? v.amount) > 0);
      setVouchers(sup);
      const uniqueStores = Array.from(new Set(sup.map(v => v.storeName)));
      setStores(uniqueStores);
      setSelectedStore(prev => prev || uniqueStores[0] || '');
    };
    load();
  }, [user, selectedHousehold]);

  const handleCalc = () => {
    const tgt = Number(target);
    if (!tgt || tgt <= 0) return;
    const counts: Record<number, number> = {};
    vouchers.filter(v => v.storeName === selectedStore).forEach(v => {
      const val = v.remainingAmount ?? v.amount;
      counts[val] = (counts[val] || 0) + 1;
    });
    const values = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const res = computeOptimal(tgt, values, counts);
    setResult(res);
    // calculate remaining
    const rem: Record<number, number> = { ...counts };
    Object.entries(res.used).forEach(([valStr, cnt]) => {
      const val = Number(valStr);
      rem[val] -= cnt;
      if (rem[val] === 0) delete rem[val];
    });
    setRemainingMap(rem);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center mb-4">מימוש אופטימלי של שוברים</h1>
      <select
        className="w-full border rounded p-2 mb-2 text-right"
        value={selectedStore}
        onChange={e => setSelectedStore(e.target.value)}
      >
        <option value="" disabled>בחר חנות</option>
        {stores.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="סכום קנייה (₪)"
          className="flex-1 border rounded p-2 text-right"
        />
        <button onClick={handleCalc} className="bg-blue-600 text-white px-4 rounded">חשב</button>
      </div>

      {result && (
        <div className="bg-white shadow rounded p-4 space-y-2">
          <p className="font-semibold">סכום מומש: ₪{result.sum.toLocaleString()}</p>
          <p className="font-semibold">שוברים שיש לנצל ({selectedStore}):</p>
          {Object.keys(result.used).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.used)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([val, cnt]) => (
                  <span key={val} className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">₪{val} × {cnt}</span>
                ))}
            </div>
          ) : (
            <p>לא ניתן לממש סכום</p>
          )}

          {Object.keys(remainingMap).length > 0 && (
            <>
              <p className="font-semibold mt-3">שוברים שנותרו:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(remainingMap)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([val, cnt]) => (
                    <span key={val} className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm">₪{val} × {cnt}</span>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 