import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { vouchersService } from '../services/firebase';
import { useVouchers } from '../contexts/VouchersContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { Voucher } from '../types/vouchers';
import { X, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import Header from './shared/Header';

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
  const { vouchers: allVouchers, loading } = useVouchers();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const [stores, setStores] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal('optimize');
    }
  }, [user, loading, openAuthModal]);
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
    
  }, [target, vouchers, selectedStore]);

  // בניית רשימת השוברים עבור האשף לפי סדר ההמלצה (ערך גבוה -> נמוך) - עם memoization
  const buildWizardList = useMemo((): Voucher[] => {
    if (!result) return [];
    
    
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

  // אם המשתמש לא מחובר, חוזר לעמוד הראשי
  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <>
      <Header title="מימוש אופטימלי" showHouseholdSwitcher={false} />
      
      <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      
      {/* Empty state for no vouchers */}
      {vouchers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">אין שוברים זמינים</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            כדי להשתמש במחשבון המימוש האופטימלי,<br />
            צריך להוסיף שוברים קודם. אחרי שתוסיף שוברים<br />
            תוכל לקבל המלצות איך לנצל אותם במיטב!
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">💡 איך זה עובד:</p>
            <p className="text-sm text-blue-700">
              1. הוסף שוברים בעמוד "שוברים"<br />
              2. חזור לכאן וקבל המלצות אופטימליות
            </p>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

      {vouchers.length > 0 && result && (
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 pb-24 overflow-hidden" onClick={finishWizard}>
          <div 
            className="relative w-full max-w-2xl max-h-[85vh] my-auto overflow-y-auto flex flex-col items-center scrollbar-hide" 
            onClick={e => e.stopPropagation()}
          >
            <button className="absolute top-4 right-4 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-[70] shadow-lg" onClick={finishWizard}>
              <X className="w-6 h-6" />
            </button>

            {/* כותרת השובר - עם רקע כהה כמו במודל הגדלת תמונה */}
            <div className="w-full text-center mb-4 px-2">
              <h2 className="text-3xl font-bold text-white drop-shadow mb-2">{currentVoucher.storeName}</h2>
              {currentVoucher.isPartial ? (
                <p className="text-lg text-gray-200">נותרו: ₪{(currentVoucher.remainingAmount ?? 0).toFixed(2)} מתוך ₪{currentVoucher.amount.toFixed(2)}</p>
              ) : (
                <p className="text-lg text-gray-200">שובר על סך ₪{currentVoucher.amount.toFixed(2)}</p>
              )}
            </div>

            {/* תמונה + חצים - תמונה גדולה יותר */}
            <div className="relative w-full mb-6">
              {currentVoucher.imageUrl && (
                <img 
                  src={currentVoucher.imageUrl} 
                  alt="ברקוד שובר" 
                  className="w-full rounded-lg shadow-lg"
                  style={{ maxHeight: '75vh', objectFit: 'contain' }}
                />
              )}
              {/* חץ שמאל */}
              {wizIdx > 0 && (
                <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors">
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
              )}
              {/* חץ ימין */}
              {wizIdx < wizardVouchers.length - 1 && (
                <button onClick={proceedNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors">
                  <ChevronRight className="w-6 h-6 text-gray-800" />
                </button>
              )}
            </div>

            {/* כפתור מימוש */}
            <div className="flex justify-center mb-6 mt-6">
              <button
                onClick={handleWizardToggleUsed}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors font-medium text-lg"
              >
                <CheckCircle className="w-6 h-6" />
                <span>{currentVoucher.isUsed ? 'הסר סימון' : 'מומש'}</span>
              </button>
            </div>

            {/* מחוון התקדמות */}
            <div className="text-center mb-4">
              <span className="text-lg font-medium text-white bg-black/30 px-4 py-2 rounded-full">
                {wizIdx + 1} / {wizardVouchers.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* סיכום */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 pb-24 overflow-hidden" onClick={()=>setSummaryOpen(false)}>
          <div className="relative bg-white rounded-lg p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto scrollbar-hide shadow-2xl" onClick={e=>e.stopPropagation()}>
            <button className="absolute top-2 right-2 bg-gray-100 rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-[70]" onClick={()=>setSummaryOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-center pr-8">המימוש הושלם!</h3>
            <p className="mb-4 text-center">מומשו {usedList.length} שוברים:</p>
            <ul className="text-right mb-4 max-h-40 overflow-y-auto pr-4 list-disc">
              {usedList.map(v=> (
                <li key={v.id}> {v.storeName} – ₪{v.amount.toFixed(2)}</li>
              ))}
            </ul>
            <p className="text-center mb-4">האם למחוק את כל השוברים שמומשו?</p>
            <div className="flex justify-center gap-4 mt-6 mb-4">
              <button onClick={()=>{setSummaryOpen(false); window.location.reload();}} className="px-6 py-3 bg-gray-300 rounded-lg text-gray-700 hover:bg-gray-400 transition-colors font-medium shadow-lg">לא</button>
              <button onClick={async ()=>{
                for (const v of usedList) {
                  await vouchersService.deleteVoucher(v.id);
                }
                setSummaryOpen(false);
                window.location.reload();
              }} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg">מחיקה</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
} 