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
import { TrendingUp, Award, AlertCircle, Calendar, Store, Wallet, Trophy, Medal, BarChart3 } from 'lucide-react';
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

  // חישוב סטטיסטיקות מתקדמות
  const stats = React.useMemo(() => {
    const activeVouchers = vouchers.filter(v => (v.remainingAmount ?? v.amount) > 0);
    const totalValue = activeVouchers.reduce((sum, v) => sum + (v.remainingAmount ?? v.amount), 0);
    const vouchersCount = activeVouchers.length;
    
    // שובר הגדול ביותר
    const largestVoucher = activeVouchers.length > 0 
      ? activeVouchers.reduce((max, v) => {
          const vAmount = v.remainingAmount ?? v.amount;
          const maxAmount = max.remainingAmount ?? max.amount;
          return vAmount > maxAmount ? v : max;
        })
      : null;
    
    // שוברים שעומדים לפוג בחודש הקרוב
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringVouchers = activeVouchers.filter(v => {
      if (!v.expiryDate) return false;
      const expiryDate = new Date(v.expiryDate);
      return expiryDate <= oneMonthFromNow && expiryDate > now;
    });
    
    // Top 3 חנויות לפי ערך שוברים
    const storeValues: Record<string, number> = {};
    activeVouchers.forEach(v => {
      const store = v.storeName;
      const value = v.remainingAmount ?? v.amount;
      storeValues[store] = (storeValues[store] || 0) + value;
    });
    const topStores = Object.entries(storeValues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({ name, value }));
    
    return {
      totalValue,
      vouchersCount,
      largestVoucher,
      expiringVouchers,
      expiringCount: expiringVouchers.length,
      topStores,
    };
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
      
      <div className="max-w-md mx-auto p-4 space-y-6 pb-24">

      {/* Empty state */}
      {perCategory.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center shadow-lg">
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
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-blue-800 font-medium mb-2">💡 טיפ:</p>
            <p className="text-sm text-blue-700">
              הוסף שוברים בעמוד "שוברים" כדי להתחיל לראות סטטיסטיקות
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* כרטיס סיכום עליון מרשים */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-4 sm:p-6 text-white animate-slide-down">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
                סיכום כללי
              </h2>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                <p className="text-blue-100 text-xs sm:text-sm mb-1">סה"כ ערך שוברים</p>
                <p className="text-2xl sm:text-3xl font-bold">₪{stats.totalValue.toFixed(0)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                <p className="text-blue-100 text-xs sm:text-sm mb-1">שוברים פעילים</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.vouchersCount}</p>
              </div>
            </div>

            {stats.expiringCount > 0 && (
              <div className="bg-yellow-400/20 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-yellow-300/30 flex items-center gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-200 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-yellow-100">
                    {stats.expiringCount} שובר{stats.expiringCount > 1 ? 'ים' : ''} עומד{stats.expiringCount > 1 ? 'ים' : ''} לפוג בחודש הקרוב!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Top 3 חנויות */}
          {stats.topStores.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 animate-slide-up">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                החנויות המובילות שלך
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {stats.topStores.map((store, idx) => {
                  const medals = [
                    { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                    { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200' },
                    { icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
                  ];
                  const medal = medals[idx];
                  const Icon = medal.icon;
                  
                  return (
                    <div 
                      key={store.name} 
                      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 ${medal.border} ${medal.bg} transition-all hover:scale-[1.02] hover:shadow-md`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full ${medal.bg} ${medal.color} font-bold border-2 ${medal.border}`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{store.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">מקום {idx + 1}</p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <p className="text-lg sm:text-xl font-bold text-gray-900">₪{store.value.toFixed(0)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Insights חכמים */}
          {(stats.largestVoucher || stats.expiringVouchers.length > 0) && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-100 animate-fade-in">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                תובנות מעניינות
              </h3>
              <div className="space-y-2.5 sm:space-y-3">
                {stats.largestVoucher && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-purple-200">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-purple-100 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                        <Store className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">השובר הגדול ביותר שלך</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{stats.largestVoucher.storeName}</p>
                        <p className="text-base sm:text-lg font-semibold text-purple-600">
                          ₪{((stats.largestVoucher.remainingAmount ?? stats.largestVoucher.amount)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {stats.expiringVouchers.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-orange-200">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-orange-100 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">שוברים שעומדים לפוג</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{stats.expiringCount} שוברים בחודש הקרוב</p>
                        <p className="text-xs sm:text-sm text-orange-600 font-medium">
                          סה"כ ערך: ₪{stats.expiringVouchers.reduce((sum, v) => sum + (v.remainingAmount ?? v.amount), 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* פירוט לפי קטגוריות - עוגות פאי מעוצבות */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              פירוט לפי קטגוריות
            </h3>
            
            {perCategory.map((cat, idx) => (
              <div 
                key={cat.catKey} 
                className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow animate-fade-in"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-100">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900">{cat.label}</h4>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">₪{cat.total.toLocaleString()}</p>
                </div>
                <div className="relative">
                  <Pie
                    data={{
                      labels: cat.labels,
                      datasets: [
                        {
                          data: cat.values,
                          backgroundColor: [
                            '#3b82f6', // blue-500
                            '#10b981', // emerald-500
                            '#f59e0b', // amber-500
                            '#ef4444', // red-500
                            '#8b5cf6', // violet-500
                            '#06b6d4', // cyan-500
                            '#ec4899', // pink-500
                            '#14b8a6', // teal-500
                          ],
                          borderWidth: 3,
                          borderColor: '#ffffff',
                          hoverOffset: 8,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          onClick: () => {},
                          labels: {
                            padding: window.innerWidth < 640 ? 10 : 15,
                            font: {
                              size: window.innerWidth < 640 ? 11 : 13,
                              weight: 'bold',
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                          },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: {
                            top: 12,
                            right: 16,
                            bottom: 12,
                            left: 16,
                          },
                          titleFont: {
                            size: window.innerWidth < 640 ? 12 : 14,
                            weight: 'bold',
                          },
                          bodyFont: {
                            size: window.innerWidth < 640 ? 11 : 13,
                          },
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed || 0;
                              const percentage = ((value / cat.total) * 100).toFixed(1);
                              return `${label}: ₪${value.toLocaleString()} (${percentage}%)`;
                            }
                          }
                        },
                      },
                      animation: {
                        animateRotate: true,
                        animateScale: true,
                      },
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
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