import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
    Plus, Users, X, Search, 
    ShoppingCart, Utensils, Droplet, ShoppingBag, 
    Gift, Filter, ChevronDown, Bell, Settings,
    List
} from 'lucide-react';
import { Voucher } from '../types/vouchers';
import { VoucherItem } from './vouchers/VoucherItem';
import { AddVoucherModal } from './vouchers/AddVoucherModal';
import { vouchersService, storageService } from '../services/firebase';
import { useHousehold } from '../contexts/HouseholdContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

// קטגוריות שוברים
const VOUCHER_CATEGORIES = [
  { id: "all", name: "הכל", icon: <List className="w-4 h-4" /> },
  { id: "supermarket", name: "סופרמרקט", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: "restaurant", name: "מסעדות", icon: <Utensils className="w-4 h-4" /> },
  { id: "fuel", name: "דלק", icon: <Droplet className="w-4 h-4" /> },
  { id: "fashion", name: "אופנה", icon: <ShoppingBag className="w-4 h-4" /> },
  { id: "general", name: "כללי", icon: <Gift className="w-4 h-4" /> }
];

export default function Vouchers() {
    const [user] = useAuthState(auth);
    const { selectedHousehold } = useHousehold();
    const household = selectedHousehold; // alias for readability

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'expiry' | 'amount'>('date');
    const [expiryFilter, setExpiryFilter] = useState<'all' | 'over-month' | 'under-month' | 'under-week' | 'expired'>('all');
    
    // מצב כללי לניהול הדרופדאונים
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    
    // פונקציה לניהול פתיחה/סגירה של דרופדאונים
    const toggleDropdown = (dropdownName: string) => {
        if (activeDropdown === dropdownName) {
            // אם הדרופדאון כבר פתוח, נסגור אותו
            setActiveDropdown(null);
        } else {
            // אחרת, נפתח את הדרופדאון הנוכחי ונסגור את כל השאר
            setActiveDropdown(dropdownName);
        }
    };
    
    // פונקציה לסגירת כל הדרופדאונים
    const closeAllDropdowns = () => {
        setActiveDropdown(null);
    };
    
    // אפקט לסגירת דרופדאונים בלחיצה מחוץ אליהם
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // בודק אם הלחיצה הייתה מחוץ לאלמנט דרופדאון פתוח
            const target = event.target as HTMLElement;
            if (activeDropdown && !target.closest('.dropdown-container')) {
                closeAllDropdowns();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeDropdown]);

    // מאזין בזמן-אמת לשוברים
    useEffect(() => {
        if (!user) return;

        let q;
        if (household) {
            q = query(
                collection(db, 'vouchers'),
                where('householdId', '==', household.id),
                orderBy('createdAt', sortOrder)
            );
        } else {
            q = query(
                collection(db, 'vouchers'),
                where('userId', '==', user.uid),
                where('householdId', '==', null),
                orderBy('createdAt', sortOrder)
            );
        }

        const unsubscribe = onSnapshot(q, snapshot => {
            const live: Voucher[] = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    storeName: data.storeName,
                    amount: data.amount,
                    expiryDate: data.expiryDate || undefined,
                    imageUrl: data.imageUrl || undefined,
                    userId: data.userId,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    isUsed: data.isUsed || false,
                    category: data.category,
                    isPartial: data.isPartial,
                    remainingAmount: data.remainingAmount
                } as Voucher;
            });
            setVouchers(live);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, household, sortOrder]);

    // סינון השוברים בהתאם לחיפוש ולקטגוריה
    useEffect(() => {
        let result = vouchers;
        
        // סינון לפי מונח חיפוש
        if (searchTerm) {
            result = result.filter(voucher => 
                voucher.storeName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // סינון לפי קטגוריה
        if (selectedCategory !== 'all') {
            result = result.filter(voucher => 
                voucher.category === selectedCategory
            );
        }
        
        // סינון לפי תוקף
        if (expiryFilter !== 'all') {
            const today = new Date();
            const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 ימים במילישניות
            const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 ימים במילישניות
            
            result = result.filter(voucher => {
                if (!voucher.expiryDate) return expiryFilter === 'over-month'; // שוברים ללא תאריך תפוגה יסוננו רק באפשרות "מעל חודש"
                
                const expiryTime = new Date(voucher.expiryDate).getTime();
                const currentTime = today.getTime();
                const timeDiff = expiryTime - currentTime;
                
                switch (expiryFilter) {
                    case 'over-month':
                        return timeDiff > oneMonth;
                    case 'under-month':
                        return timeDiff <= oneMonth && timeDiff > oneWeek;
                    case 'under-week':
                        return timeDiff <= oneWeek && timeDiff > 0;
                    case 'expired':
                        return timeDiff <= 0;
                    default:
                        return true;
                }
            });
        }
        
        // מיון לפי בחירת המשתמש
        result = sortVouchers(result, sortBy, sortOrder);
        
        setFilteredVouchers(result);
    }, [vouchers, searchTerm, selectedCategory, sortBy, sortOrder, expiryFilter]);

    // פונקציית מיון
    const sortVouchers = (voucherList: Voucher[], sortField: string, order: 'asc' | 'desc') => {
        return [...voucherList].sort((a, b) => {
            // טיפול בשוברים ללא תאריך תפוגה - תמיד בסוף
            if (sortField === 'expiry') {
                // אם אין תאריך תפוגה לשניהם, אין משמעות לסדר
                if (!a.expiryDate && !b.expiryDate) return 0;
                // אם רק לאחד אין תאריך תפוגה, הוא יופיע בסוף
                if (!a.expiryDate) return 1; // a בסוף
                if (!b.expiryDate) return -1; // b בסוף
                
                // אחרת, מיון לפי תאריכי תפוגה
                const dateA = new Date(a.expiryDate).getTime();
                const dateB = new Date(b.expiryDate).getTime();
                return order === 'desc' ? dateB - dateA : dateA - dateB;
            }
            
            if (sortField === 'date') {
                return order === 'desc' 
                    ? b.createdAt.getTime() - a.createdAt.getTime()
                    : a.createdAt.getTime() - b.createdAt.getTime();
            }
            
            if (sortField === 'amount') {
                // השוואת סכומים
                const amountComparison = order === 'desc' 
                    ? b.amount - a.amount
                    : a.amount - b.amount;
                
                // אם הסכומים שווים, מיון לפי תאריך תפוגה
                if (amountComparison === 0) {
                    // טיפול במקרה שאין תאריך תפוגה - שוברים ללא תאריך תפוגה בסוף
                    if (!a.expiryDate && !b.expiryDate) return 0;
                    if (!a.expiryDate) return 1; // a בסוף 
                    if (!b.expiryDate) return -1; // b בסוף
                    
                    // מיון לפי תאריך תפוגה - מהקרוב לרחוק
                    const dateA = new Date(a.expiryDate).getTime();
                    const dateB = new Date(b.expiryDate).getTime();
                    return dateA - dateB; // תמיד מהקרוב לרחוק ללא קשר לסדר המיון הכללי
                }
                
                return amountComparison;
            }
            return 0;
        });
    };

    const loadUserData = async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            let fetched: Voucher[] = [];

            if (household) {
                // שוברים של משק הבית הנבחר
                fetched = await vouchersService.getHouseholdVouchers(household.id, sortOrder);
            } else {
                // שוברים אישיים בלבד
                fetched = await vouchersService.getVouchers(user.uid, sortOrder);
            }

            console.log('טענו', fetched.length, 'שוברים');
            setVouchers(fetched);
            setFilteredVouchers(fetched);
        } catch (error: any) {
            // בדיקה לשגיאת אינדקס של פיירבייס
            if (error.message && (
                error.message.includes('index') || 
                error.message.includes('9-Prop-Order') || 
                error.message.includes('no matching index')
            )) {
                alert(`שגיאת אינדקס בפיירבייס. יש ללחוץ על הקישור בקונסול כדי להוסיף אינדקס חדש.
אם האינדקס כבר הוסף, אנא המתן כ-5 דקות עד שהאינדקס יתעדכן.`);
                console.error('פרטי שגיאת האינדקס:', error);
            } else {
                alert('שגיאה בטעינת שוברים: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddVoucher = async (voucherData: {
        storeName: string;
        amount: number;
        expiryDate?: string;
        imageFile?: File;
        category?: string;
        isPartial?: boolean;
        remainingAmount?: number;
    }) => {
        if (!user) return;
        
        try {
            setLoading(true);
            
            // וידוא וסניטיזציה של נתוני קלט
            if (!voucherData.storeName || !voucherData.amount) {
                throw new Error('יש למלא את שם החנות והסכום');
            }
            
            // הוספת השובר תחילה ללא תמונה
            const voucherId = await vouchersService.addVoucher(user.uid, {
                storeName: voucherData.storeName,
                amount: voucherData.amount,
                expiryDate: voucherData.expiryDate,
                imageUrl: undefined, // נעלה את התמונה בהמשך
                category: voucherData.category,
                householdId: household?.id || null,
                isPartial: voucherData.isPartial || false,
                remainingAmount: voucherData.isPartial ? voucherData.amount : undefined
            });
            
            // יצירת אובייקט שובר חדש למצב המקומי
            const newVoucher: Voucher = {
                id: voucherId,
                storeName: voucherData.storeName,
                amount: voucherData.amount,
                expiryDate: voucherData.expiryDate,
                imageUrl: undefined,
                userId: user.uid,
                createdAt: new Date(),
                isUsed: false,
                category: voucherData.category,
                isPartial: voucherData.isPartial || false,
                remainingAmount: voucherData.isPartial ? voucherData.amount : undefined
            };
            
            // עכשיו, אם יש תמונה, נעלה אותה עם המזהה שנוצר
            if (voucherData.imageFile && voucherId) {
                const imageUrl = await handleUploadImage(voucherData.imageFile, voucherId);
                if (imageUrl) {
                    newVoucher.imageUrl = imageUrl;
                }
            }
            
            // הוספת השובר החדש למצב הנוכחי
            setVouchers(prev => [newVoucher, ...prev]);
            setFilteredVouchers(prev => [newVoucher, ...prev]);
            
            // סגירת המודל אחרי הוספה מוצלחת
            setIsAddModalOpen(false);
        } catch (error) {
            alert('שגיאה בהוספת שובר: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVoucherUsed = async (voucherId: string, currentStatus: boolean) => {
        if (!user) return;
        
        try {
            // מציאת השובר במצב המקומי
            const voucher = vouchers.find(v => v.id === voucherId);
            if (!voucher) return;
            
            // עדכון השובר בדאטאבייס
            await vouchersService.toggleVoucherUsed(voucherId, !currentStatus);
            
            // עדכון הסטייט המקומי
            setVouchers(prev => 
                prev.map(v => {
                    if (v.id === voucherId) {
                        return {
                            ...v, 
                            isUsed: !currentStatus,
                            // אם מסמנים את השובר כלא מומש והוא נצבר, יש לשמור את הסכום הנותר
                            // אם מסמנים את השובר כמומש והוא נצבר, אפשר לאפס את הסכום הנותר
                            remainingAmount: v.isPartial ? 
                                (!currentStatus ? 0 : v.amount) : 
                                v.remainingAmount
                        };
                    }
                    return v;
                })
            );
        } catch (error) {
            alert('שגיאה בעדכון סטטוס שובר');
        }
    };

    const handleDeleteVoucher = async (voucher: Voucher) => {
        if (!user) return;
        
        // אם השובר לא מומש, נציג הודעת אישור
        if (!voucher.isUsed) {
            const confirmDelete = window.confirm('השובר לא מומש. האם אתה בטוח שברצונך למחוק אותו?');
            if (!confirmDelete) return;
        }
        
        try {
            setLoading(true);
            
            // סגירת כל התפריטים לפני המחיקה
            setActiveDropdown(null);
            
            // מחיקת השובר
            await vouchersService.deleteVoucher(voucher.id);
            
            // מחיקת התמונה אם יש - נטפל בשגיאות אפשריות בנפרד
            if (voucher.imageUrl) {
                try {
                    await storageService.deleteImage(voucher.imageUrl);
                } catch (imageError) {
                    console.error('שגיאה במחיקת תמונה של שובר:', imageError);
                    // לא נזרוק שגיאה כללית כאן, רק נרשום ביומן
                }
            }
            
            // עדכון הסטייט המקומי
            setVouchers(prev => prev.filter(v => v.id !== voucher.id));
            
            // למניעת שגיאת 404, נוודא שאנחנו לא עושים פעולות שיובילו לרינדור בעייתי
            setSelectedImage(null);
            setIsAddModalOpen(false);
            
            // הוספת קצת עיכוב לאפשר לממשק להתעדכן
            setTimeout(() => {
                setLoading(false);
            }, 100);
        } catch (error) {
            console.error('שגיאה במחיקת שובר:', error);
            alert('שגיאה במחיקת שובר');
            // למרות השגיאה, ננסה לעדכן את הרשימה במקרה שהשובר כן נמחק מהדאטהבייס
            try {
                await loadUserData();
            } catch (loadError) {
                console.error('שגיאה נוספת בטעינת נתונים:', loadError);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUploadImage = async (file: File, voucherId: string): Promise<string> => {
        if (!user || !file) return '';
        
        try {
            setLoading(true);
            
            // בדיקת מזהה שובר
            if (!voucherId) {
                console.error('ניסיון להעלות תמונה ללא מזהה שובר');
                throw new Error('יש צורך במזהה שובר תקין כדי להעלות תמונה');
            }
            
            // בדיקת סוג הקובץ והגודל
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('סוג קובץ לא נתמך. רק JPEG, PNG, GIF ו-WEBP מותרים');
            }
            
            // העלאת התמונה באמצעות storageService
            const imageUrl = await storageService.uploadImage(user.uid, file, 'vouchers');
            
            // עדכון השובר עם כתובת התמונה
            await vouchersService.updateVoucher(voucherId, {
                imageUrl
            });
            
            // עדכון הממשק
            setVouchers(prev => prev.map(v => 
                v.id === voucherId 
                    ? { ...v, imageUrl } 
                    : v
            ));
            
            return imageUrl;
        } catch (error) {
            alert("שגיאה בהעלאת תמונה: " + (error instanceof Error ? error.message : String(error)));
            return '';
        } finally {
            setLoading(false);
        }
    };

    // פונקציה לעדכון תאריך תפוגה
    const handleUpdateExpiryDate = async (voucherId: string, expiryDate: string | null) => {
        try {
            // וידוא תקינות התאריך אם קיים
            if (expiryDate) {
                const date = new Date(expiryDate);
                if (isNaN(date.getTime())) {
                    throw new Error('תאריך לא תקין');
                }
            }
            
            // עדכון מצב מקומי
            const updatedVouchers = vouchers.map(voucher => {
                if (voucher.id === voucherId) {
                    return {
                        ...voucher,
                        expiryDate: expiryDate || undefined
                    } as Voucher;
                }
                return voucher;
            });
            setVouchers(updatedVouchers);
            
            // עדכון בשירות
            if (vouchersService) {
                await vouchersService.updateVoucher(voucherId, { 
                    expiryDate: expiryDate || undefined 
                });
            }
        } catch (error) {
            alert('שגיאה בעדכון תאריך תפוגה: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    };

    // פונקציה לעדכון הסכום הנותר בשובר נצבר
    const handleUpdateRemainingAmount = async (voucherId: string, remainingAmount: number) => {
        try {
            // בדיקת תקינות הערך
            if (remainingAmount < 0) {
                throw new Error('ערך הסכום הנותר חייב להיות חיובי');
            }
            
            // מציאת השובר הנוכחי
            const currentVoucher = vouchers.find(v => v.id === voucherId);
            if (!currentVoucher) {
                throw new Error('השובר לא נמצא');
            }
            
            // עדכון ברמה המקומית
            const updatedVouchers = vouchers.map(voucher => {
                if (voucher.id === voucherId) {
                    return {
                        ...voucher,
                        isPartial: true, // וידוא שהשובר מסומן כנצבר
                        remainingAmount: remainingAmount,
                        // אם הסכום הנותר הוא 0, השובר נחשב כמומש
                        isUsed: remainingAmount === 0
                    } as Voucher;
                }
                return voucher;
            });
            setVouchers(updatedVouchers);
            
            // עדכון ברמת השרת - דאג שהשובר יסומן גם כנצבר
            await vouchersService.updateVoucher(voucherId, {
                isPartial: true,
                remainingAmount
            });
            
            // עדכון הסכום הנותר
            await vouchersService.updateRemainingAmount(voucherId, remainingAmount);
        } catch (error) {
            alert('שגיאה בעדכון הסכום הנותר: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    };

    if (!user) {
        return <div className="p-4 text-center">יש להתחבר כדי לצפות בשוברים</div>;
    }

    return (
        <div className="p-4 max-w-3xl mx-auto pb-24">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">השוברים שלי</h1>
                    {household ? (
                        <div className="relative dropdown-container">
                            <button
                                onClick={() => toggleDropdown('household')}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <Users className="w-4 h-4" />
                                <span>{household.name}</span>
                            </button>

                            {activeDropdown === 'household' && (
                                <div className="absolute top-full right-0 mt-1 bg-white shadow-md rounded-lg p-3 z-10 w-64">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold">{household.name}</h3>
                                        <button
                                            onClick={() => closeAllDropdowns()}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">חברי משק הבית:</p>
                                    <ul className="text-sm">
                                        {household.members && Object.entries(household.members).map(([id, member]: [string, any]) => (
                                            <li key={id} className="flex items-center gap-1 mb-1">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                <span>{member.name || 'משתמש'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>אישי</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    aria-label="הוסף שובר חדש"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* אזור החיפוש והסינון */}
            <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="חפש לפי שם חנות..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-2 px-4 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        {searchTerm ? (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        )}
                    </div>
                    <button
                        className={`p-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* פילטרים מורחבים */}
                {showFilters && (
                    <div className="pt-2 border-t border-gray-100">
                        {/* קטגוריות */}
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">קטגוריה</h3>
                            <div className="flex flex-wrap gap-2">
                                {VOUCHER_CATEGORIES.map((category) => (
                                    <button
                                        key={category.id}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                                            selectedCategory === category.id
                                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                                        }`}
                                        onClick={() => setSelectedCategory(category.id)}
                                    >
                                        {category.icon}
                                        <span>{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* אפשרויות סינון לפי תוקף */}
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">סינון לפי תוקף</h3>
                            <div className="relative dropdown-container">
                                <button
                                    className={`flex items-center justify-between w-full px-3 py-1.5 border rounded-lg text-sm ${
                                        expiryFilter !== 'all'
                                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                                            : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                                    onClick={() => toggleDropdown('expiry')}
                                >
                                    <span>
                                        {expiryFilter === 'all' && 'הכל'}
                                        {expiryFilter === 'over-month' && 'בתוקף מעל חודש 🟢'}
                                        {expiryFilter === 'under-month' && 'פג תוקף פחות מחודש 🟠'}
                                        {expiryFilter === 'under-week' && 'פג תוקף פחות משבוע 🔴'}
                                        {expiryFilter === 'expired' && 'פג תוקף ❌'}
                                    </span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                
                                {activeDropdown === 'expiry' && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                        <button 
                                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                            onClick={() => {
                                                setExpiryFilter('all');
                                                closeAllDropdowns();
                                            }}
                                        >
                                            הכל
                                        </button>
                                        <button 
                                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                            onClick={() => {
                                                setExpiryFilter('over-month');
                                                closeAllDropdowns();
                                            }}
                                        >
                                            בתוקף מעל חודש 🟢
                                        </button>
                                        <button 
                                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                            onClick={() => {
                                                setExpiryFilter('under-month');
                                                closeAllDropdowns();
                                            }}
                                        >
                                            פג תוקף פחות מחודש 🟠
                                        </button>
                                        <button 
                                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                            onClick={() => {
                                                setExpiryFilter('under-week');
                                                closeAllDropdowns();
                                            }}
                                        >
                                            פג תוקף פחות משבוע 🔴
                                        </button>
                                        <button 
                                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                            onClick={() => {
                                                setExpiryFilter('expired');
                                                closeAllDropdowns();
                                            }}
                                        >
                                            פג תוקף ❌
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* אפשרויות מיון */}
                        <div className="flex flex-wrap gap-3">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">מיין לפי</h3>
                                <div className="relative dropdown-container">
                                    <button
                                        className="flex items-center justify-between w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                        onClick={() => toggleDropdown('sort')}
                                    >
                                        <span>
                                            {sortBy === 'date' && 'תאריך הוספה'}
                                            {sortBy === 'expiry' && 'תאריך תפוגה'}
                                            {sortBy === 'amount' && 'סכום'}
                                        </span>
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {activeDropdown === 'sort' && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                            <button 
                                                className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    setSortBy('date');
                                                    closeAllDropdowns();
                                                }}
                                            >
                                                תאריך הוספה
                                            </button>
                                            <button 
                                                className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    setSortBy('expiry');
                                                    closeAllDropdowns();
                                                }}
                                            >
                                                תאריך תפוגה
                                            </button>
                                            <button 
                                                className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    setSortBy('amount');
                                                    closeAllDropdowns();
                                                }}
                                            >
                                                סכום
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">סדר</h3>
                                <button
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                >
                                    {sortBy === 'amount' ? 
                                        (sortOrder === 'desc' ? 'מהיקר לזול' : 'מהזול ליקר') : 
                                        sortBy === 'expiry' ?
                                        (sortOrder === 'desc' ? 'מהרחוק לקרוב' : 'מהקרוב לרחוק') :
                                        (sortOrder === 'desc' ? 'מהחדש לישן' : 'מהישן לחדש')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* רשימת השוברים */}
            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Gift className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">אין שוברים להצגה</h3>
                    <p className="text-gray-500 mb-4">
                        {searchTerm || selectedCategory !== 'all' ? 
                            'לא נמצאו שוברים התואמים את החיפוש' : 
                            'לחץ על הכפתור "+" כדי להוסיף שובר חדש'}
                    </p>
                    {(searchTerm || selectedCategory !== 'all') && (
                        <button
                            className="text-blue-600 hover:underline"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                            }}
                        >
                            נקה מסננים
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* כותרת דינמית של המיון הנוכחי */}
                    <div className="flex justify-center mb-3">
                        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            מיון לפי {sortBy === 'date' ? 'תאריך הוספה' : sortBy === 'expiry' ? 'תאריך תפוגה' : 'סכום'} | 
                            {sortBy === 'amount' ? (sortOrder === 'desc' ? ' מהיקר לזול' : ' מהזול ליקר') : 
                            sortBy === 'expiry' ? (sortOrder === 'desc' ? ' מהרחוק לקרוב' : ' מהקרוב לרחוק') :
                            (sortOrder === 'desc' ? ' מהחדש לישן' : ' מהישן לחדש')}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 max-w-xl mx-auto">
                        {filteredVouchers.map((voucher) => (
                            <VoucherItem
                                key={voucher.id}
                                voucher={voucher}
                                onDelete={() => handleDeleteVoucher(voucher)}
                                onToggleUsed={() => handleToggleVoucherUsed(voucher.id, voucher.isUsed)}
                                onUploadImage={(file) => handleUploadImage(file, voucher.id)}
                                onViewImage={(imageUrl) => setSelectedImage(imageUrl)}
                                onUpdateExpiryDate={(voucherId, expiryDate) => handleUpdateExpiryDate(voucherId, expiryDate)}
                                onUpdateRemainingAmount={(voucherId, remainingAmount) => handleUpdateRemainingAmount(voucherId, remainingAmount)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* מודל הוספת שובר */}
            <AddVoucherModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddVoucher={handleAddVoucher}
            />

            {/* תצוגת תמונה מוגדלת */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 pb-16 overflow-y-auto"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="relative w-full max-w-2xl max-h-[90vh] my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors"
                            aria-label="סגור תמונה"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={selectedImage}
                            alt="תמונת שובר מוגדלת"
                            className="w-full rounded-lg shadow-lg"
                            style={{ maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}

            {/* טאב בר תחתון */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex items-center justify-around p-2 z-40">
                <button className="flex flex-col items-center p-2 text-blue-600">
                    <Gift className="w-6 h-6" />
                    <span className="text-xs mt-1">שוברים</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                    <ShoppingCart className="w-6 h-6" />
                    <span className="text-xs mt-1">קניות</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                    <Bell className="w-6 h-6" />
                    <span className="text-xs mt-1">התראות</span>
                </button>
                <button className="flex flex-col items-center p-2 text-gray-500">
                    <Settings className="w-6 h-6" />
                    <span className="text-xs mt-1">הגדרות</span>
                </button>
            </div>
        </div>
    );
} 