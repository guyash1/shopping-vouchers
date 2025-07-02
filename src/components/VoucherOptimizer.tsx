import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { vouchersService } from '../services/firebase';
import { useVouchers } from '../contexts/VouchersContext';
import { Voucher } from '../types/vouchers';
import { X, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

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
  const { vouchers: allVouchers, loading } = useVouchers();
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<OptResult | null>(null);
  const [remainingMap, setRemainingMap] = useState<Record<number, number>>({});
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardVouchers, setWizardVouchers] = useState<Voucher[]>([]);
  const [wizIdx, setWizIdx] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [usedList, setUsedList] = useState<Voucher[]>([]);

  // סינון שוברים לסופרמרקט בלבד - עם memoization לביצועים
  const vouchers = useMemo(() => {
    return allVouchers.filter(v => 
      (v.category || 'general') === 'supermarket' && 
      (v.remainingAmount ?? v.amount) > 0
    );
  }, [allVouchers]);

  useEffect(() => {
    if (!loading && vouchers.length > 0) {
      const uniqueStores = Array.from(new Set(vouchers.map(v => v.storeName)));
      setStores(uniqueStores);
      setSelectedStore(prev => prev || uniqueStores[0] || '');
    }
  }, [vouchers, loading]);

  const handleCalc = useCallback(() => {
    const tgt = Number(target);
    if (!tgt || tgt <= 0) return;
    
    console.log('🧮 מחשב אופטימיזציה לשוברים...');
    
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
    
    console.log('✅ אופטימיזציה הושלמה');
  }, [target, vouchers, selectedStore]);

  // בניית רשימת השוברים עבור האשף לפי סדר ההמלצה (ערך גבוה -> נמוך) - עם memoization
  const buildWizardList = useMemo((): Voucher[] => {
    if (!result) return [];
    
    console.log('📋 בונה רשימת שוברים לאשף...');
    
    // נעתיק מפת ספירה זמנית
    const needed: Record<number, number> = { ...result.used };
    const orderedVals = Object.keys(needed).map(Number).sort((a, b) => b - a);
    const list: Voucher[] = [];
    orderedVals.forEach(val => {
      let cnt = needed[val];
      vouchers.filter(v => v.storeName === selectedStore && (v.remainingAmount ?? v.amount) === val && cnt > 0)
        .forEach(v => {
          if (cnt > 0) {
            list.push(v);
            cnt--;
          }
        });
    });
    return list;
  }, [result, vouchers, selectedStore]);

  const startWizard = useCallback(() => {
    if (buildWizardList.length === 0) return;
    setWizardVouchers(buildWizardList);
    setWizardActive(true);
    setWizIdx(0);
    setDoneCount(0);
    setUsedList([]);
  }, [buildWizardList]);

  const currentVoucher = wizardVouchers[wizIdx];

  const finishWizard = () => {
    setWizardActive(false);
    setWizardVouchers([]);
    setWizIdx(0);
  };

  const proceedNext = () => {
    if (wizIdx + 1 < wizardVouchers.length) {
      setWizIdx(wizIdx + 1);
    } else {
      setSummaryOpen(true);
      setWizardActive(false);
    }
  };

  const goPrev = () => {
    if (wizIdx > 0) setWizIdx(wizIdx - 1);
  };

  // נעילת גלילת הרקע בזמן מודל פתוח
  useEffect(() => {
    const modalOpen = wizardActive || summaryOpen;
    const html = document.documentElement;
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      html.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      html.style.overflow = '';
    };
  }, [wizardActive, summaryOpen]);

  const handleWizardToggleUsed = async () => {
    if (!currentVoucher) return;
    await vouchersService.toggleVoucherUsed(currentVoucher.id, !currentVoucher.isUsed);
    setUsedList([...usedList, currentVoucher]);
    setDoneCount(doneCount + 1);
    proceedNext();
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

          {/* כפתור להתחלת אשף מימוש */}
          {Object.keys(result.used).length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={startWizard}
                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
              >
                התחל מימוש עכשיו
              </button>
            </div>
          )}
        </div>
      )}

      {/* אשף המימוש */}
      {wizardActive && currentVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={finishWizard}>
          <div className="relative w-full max-w-lg bg-white rounded-lg p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600" onClick={finishWizard}>
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-bold text-center mb-3">{currentVoucher.storeName}</h2>
            {currentVoucher.isPartial ? (
              <p className="text-center mb-4 text-xl">נותרו: ₪{(currentVoucher.remainingAmount ?? 0).toFixed(2)} מתוך ₪{currentVoucher.amount.toFixed(2)}</p>
            ) : (
              <p className="text-center mb-4 text-xl">שובר על סך ₪{currentVoucher.amount.toFixed(2)}</p>
            )}

            {/* תמונה + חצים */}
            <div className="relative w-full mb-6">
              {currentVoucher.imageUrl && (
                <img src={currentVoucher.imageUrl} alt="ברקוד" className="w-full max-h-[60vh] object-contain" />
              )}
              {/* חץ שמאל */}
              {wizIdx > 0 && (
                <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white/70 rounded-full shadow">
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}
              {/* חץ ימין */}
              {wizIdx < wizardVouchers.length - 1 && (
                <button onClick={proceedNext} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white/70 rounded-full shadow">
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
            </div>

            <div className="flex justify-center mb-6">
              <button
                onClick={handleWizardToggleUsed}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
              >
                <CheckCircle className="w-6 h-6" />
                <span>{currentVoucher.isUsed ? 'הסר סימון' : 'מומש'}</span>
              </button>
            </div>

            <span className="text-lg font-medium">{wizIdx + 1} / {wizardVouchers.length}</span>
          </div>
        </div>
      )}

      {/* סיכום */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={()=>setSummaryOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-center">המימוש הושלם!</h3>
            <p className="mb-4 text-center">מומשו {usedList.length} שוברים:</p>
            <ul className="text-right mb-4 max-h-40 overflow-y-auto pr-4 list-disc">
              {usedList.map(v=> (
                <li key={v.id}> {v.storeName} – ₪{v.amount.toFixed(2)}</li>
              ))}
            </ul>
            <p className="text-center mb-4">האם למחוק את כל השוברים שמומשו?</p>
            <div className="flex justify-center gap-4">
              <button onClick={()=>{setSummaryOpen(false); window.location.reload();}} className="px-4 py-2 bg-gray-300 rounded">לא</button>
              <button onClick={async ()=>{
                for (const v of usedList) {
                  await vouchersService.deleteVoucher(v.id);
                }
                setSummaryOpen(false);
                window.location.reload();
              }} className="px-4 py-2 bg-red-600 text-white rounded">מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 