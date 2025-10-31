import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { vouchersService } from '../services/firebase';
import { useVouchers } from '../contexts/VouchersContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { Voucher } from '../types/vouchers';
import { X, CheckCircle, ChevronRight, ChevronLeft, Calculator, Store, Sparkles, TrendingUp, Receipt, Wallet, ShoppingCart } from 'lucide-react';
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
      <Header title="מימוש שוברי סופר" showHouseholdSwitcher={false} />
      
      <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
      
      {/* Empty state for no vouchers */}
      {vouchers.length === 0 ? (
        <div className="text-center py-8 sm:py-12 animate-fade-in">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">אין שוברי סופרמרקט</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed px-4 max-w-md mx-auto">
            עמוד זה למימוש אופטימלי של <span className="font-semibold text-gray-800">שוברי סופרמרקט בלבד</span>.<br />
            הוסיפו שוברים והגדירו אותם בקטגוריה "סופרמרקט" כדי להשתמש בכלי.
          </p>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 sm:p-6 border-2 border-blue-200 max-w-sm mx-auto shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <p className="text-base font-bold text-gray-900">איך זה עובד?</p>
            </div>
            <div className="text-right space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <p className="flex-1 pt-0.5">הוסיפו שוברי סופרמרקט בעמוד "שוברים"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <p className="flex-1 pt-0.5">הזינו כמה יצאה לכם הקנייה</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <p className="flex-1 pt-0.5">קבלו המלצה אופטימלית אילו שוברים לממש</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <p className="flex-1 pt-0.5">השוברים שמומשו יימחקו לפי בקשתכם</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* בחירת חנות מעוצבת */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 animate-slide-down">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">בחירת חנות</h3>
            </div>
            <select
              className="w-full border-2 border-gray-200 rounded-xl p-3 sm:p-4 text-right font-medium text-gray-900 bg-gray-50 hover:bg-white hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
            >
              <option value="" disabled>בחירת חנות</option>
              {stores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* תיבת קלט וחישוב מעוצבת */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-4 sm:p-6 text-white animate-slide-up">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              <h3 className="text-base sm:text-lg font-bold">חישוב אופטימלי</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-700 pointer-events-none" />
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="סכום הקנייה"
                  className="w-full border-2 border-white/30 bg-white/95 backdrop-blur-sm rounded-xl p-3 sm:p-4 pr-10 sm:pr-11 text-right font-semibold text-gray-900 placeholder:text-gray-500 focus:border-white focus:ring-2 focus:ring-white/50 transition-all outline-none shadow-inner"
                />
              </div>
              <button 
                onClick={handleCalc} 
                className="bg-white text-blue-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5" />
                <span>חישוב</span>
              </button>
            </div>
          </div>
        </>
      )}

      {vouchers.length > 0 && result && (
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 sm:p-6 text-white space-y-4 animate-fade-in">
          {/* כותרת עם סטטיסטיקות */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
              <h3 className="text-xl sm:text-2xl font-bold">תוצאת חישוב</h3>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
              <p className="text-xs sm:text-sm text-blue-100 mb-1">סכום שיממש</p>
              <p className="text-3xl sm:text-4xl font-bold">₪{result.sum.toLocaleString()}</p>
              {Number(target) > result.sum && (
                <p className="text-xs sm:text-sm text-yellow-200 mt-2">
                  נותר לכיסוי: ₪{(Number(target) - result.sum).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* שוברים לנצל */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              <p className="font-bold text-sm sm:text-base">שוברים לנצל ({selectedStore})</p>
            </div>
            {Object.keys(result.used).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.used)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([val, cnt]) => (
                    <span key={val} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-green-500 text-white font-semibold text-xs sm:text-sm shadow-lg border-2 border-white/30">
                      ₪{val} × {cnt}
                    </span>
                  ))}
              </div>
            ) : (
              <p className="text-yellow-200 text-sm">לא ניתן לממש סכום זה</p>
            )}
          </div>

          {/* שוברים שנותרו */}
          {Object.keys(remainingMap).length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                <p className="font-bold text-sm sm:text-base">שוברים שנותרו</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(remainingMap)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([val, cnt]) => (
                    <span key={val} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/20 text-white font-medium text-xs sm:text-sm border border-white/30">
                      ₪{val} × {cnt}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* כפתור להתחלת אשף מימוש */}
          {Object.keys(result.used).length > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={startWizard}
                className="bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-2xl hover:bg-green-700 hover:shadow-3xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-base sm:text-lg">התחל מימוש</span>
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
            <button 
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-1.5 text-gray-800 hover:bg-white transition-colors z-[80] shadow-lg" 
              onClick={(e) => {
                e.stopPropagation();
                finishWizard();
              }}
              aria-label="סגור"
            >
              <X className="w-6 h-6" />
            </button>

            {/* כותרת השובר */}
            <div className="absolute top-4 left-0 right-0 text-center z-[70] px-16">
              <div className="inline-block bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                <h2 className="text-2xl font-bold text-white drop-shadow">{currentVoucher.storeName}</h2>
                {currentVoucher.isPartial ? (
                  <p className="text-sm text-gray-200">נותרו: ₪{(currentVoucher.remainingAmount ?? 0).toFixed(2)} מתוך ₪{currentVoucher.amount.toFixed(2)}</p>
                ) : (
                  <p className="text-sm text-gray-200">₪{currentVoucher.amount.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* תמונה + חצים */}
            <div className="relative w-full h-full flex items-center justify-center">
              {currentVoucher.imageUrl && (
                <img 
                  src={currentVoucher.imageUrl} 
                  alt="ברקוד שובר" 
                  className="w-full h-full object-contain"
                  style={{ maxHeight: '85vh' }}
                />
              )}
              {/* חץ שמאל */}
              {wizIdx > 0 && (
                <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white hover:scale-110 active:scale-95 transition-all z-[70]">
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
              )}
              {/* חץ ימין */}
              {wizIdx < wizardVouchers.length - 1 && (
                <button onClick={proceedNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white hover:scale-110 active:scale-95 transition-all z-[70]">
                  <ChevronRight className="w-6 h-6 text-gray-800" />
                </button>
              )}
            </div>

            {/* כפתור מימוש + מחוון התקדמות - צפים בתחתית */}
            <div className="absolute bottom-0 left-0 right-0 z-[75]">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" style={{ height: '180px' }}></div>
              
              {/* תוכן */}
              <div className="relative flex flex-col items-center gap-4 pb-6 pt-10">
                {/* כפתור מימוש */}
                <button
                  onClick={handleWizardToggleUsed}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg shadow-xl hover:bg-green-700 hover:scale-105 active:scale-95 transition-all font-medium text-lg"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span>{currentVoucher.isUsed ? 'הסר סימון' : 'מומש'}</span>
                </button>

                {/* מחוון התקדמות */}
                <span className="text-base font-medium text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                  {wizIdx + 1} / {wizardVouchers.length}
                </span>
              </div>
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

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(0.625rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-1.25rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(1.25rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-slide-down {
          animation: slide-down 0.7s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slide-up 0.7s ease-out forwards;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-slide-down,
          .animate-slide-up {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
} 