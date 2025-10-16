import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
    Plus, Users, X, Search, 
    ShoppingCart, Utensils, Droplet, ShoppingBag, 
    Gift, Filter, ChevronDown,
    List, CheckCircle, Trash2, RotateCcw
} from 'lucide-react';
import { Voucher } from '../types/vouchers';
import { VoucherItem } from './vouchers/VoucherItem';
import { AddVoucherModal } from './vouchers/AddVoucherModal';
import { vouchersService, storageService } from '../services/firebase';
import { useVouchers } from '../contexts/VouchersContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import Header from './shared/Header';

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
    const { vouchers, loading } = useVouchers();
    const { openAuthModal } = useAuthModal();
    const navigate = useNavigate();
    const household = selectedHousehold;

    useEffect(() => {
        if (!loading && !user) {
            openAuthModal('add-voucher');
        }
    }, [user, loading, openAuthModal]);

    useEffect(() => {
        if (!loading && !user) {
            const timer = setTimeout(() => {
                navigate('/');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [user, loading, navigate]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
    const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'expiry' | 'amount'>('date');
    const [expiryFilter, setExpiryFilter] = useState<'all' | 'over-month' | 'under-month' | 'under-week' | 'expired'>('all');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    
    const toggleDropdown = (dropdownName: string) => {
        if (activeDropdown === dropdownName) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(dropdownName);
        }
    };
    
    const closeAllDropdowns = () => {
        setActiveDropdown(null);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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

    useEffect(() => {
        const isModalOpen = selectedVoucher && selectedVoucher.imageUrl;
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [selectedVoucher]);

    useEffect(() => {
        let result = vouchers;
        
        if (searchTerm) {
            result = result.filter(voucher => 
                voucher.storeName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (selectedCategory !== 'all') {
            result = result.filter(voucher => 
                voucher.category === selectedCategory
            );
        }
        
        if (expiryFilter !== 'all') {
            const today = new Date();
            const oneMonth = 30 * 24 * 60 * 60 * 1000;
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            
            result = result.filter(voucher => {
                if (!voucher.expiryDate) return expiryFilter === 'over-month';
                
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

    // הוסרה פונקציית loadUserData - VouchersContext מטפל בטעינת הנתונים

    const handleAddVoucher = async (voucherData: {
        storeName: string;
        amount: number;
        expiryDate?: string;
        imageFile?: File;
        category?: string;
        isPartial?: boolean;
        remainingAmount?: number;
    }) => {
        if (!user) {
            openAuthModal('add-voucher');
            return;
        }

        if (!selectedHousehold) {
            const confirmed = window.confirm('כדי להוסיף שוברים, צריך להיות חלק ממשק בית.\n\nלפתוח את ניהול משק הבית?');
            if (confirmed) {
                const event = new CustomEvent('openHouseholdSwitcher');
                window.dispatchEvent(event);
            }
            return;
        }

        try {
            // וידוא שדות בסיסיים
            if (!voucherData.storeName || !voucherData.amount) {
                throw new Error('יש למלא את שם החנות והסכום');
            }

            // אם קיימת תמונה – נעלה אותה תחילה. במקרה של כשל לא ניצור שובר.
            let imageUrl: string | undefined = undefined;
            if (voucherData.imageFile) {
                imageUrl = await storageService.uploadImage(user.uid, voucherData.imageFile, 'vouchers');
            }

            // יצירת השובר עם ה-imageUrl אם קיים
            await vouchersService.addVoucher(user.uid, {
                storeName: voucherData.storeName,
                amount: voucherData.amount,
                expiryDate: voucherData.expiryDate,
                imageUrl,
                category: voucherData.category,
                householdId: household?.id || null,
                isPartial: voucherData.isPartial || false,
                remainingAmount: voucherData.isPartial ? voucherData.amount : undefined
            });

            // סגירת המודל אחרי הוספה מוצלחת - VouchersContext יעדכן אוטומטית
            setIsAddModalOpen(false);
        } catch (error) {
            alert('שגיאה בהוספת שובר: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleToggleVoucherUsed = async (voucherId: string, currentStatus: boolean) => {
        if (!user) {
            openAuthModal('edit');
            return;
        }
        
        try {
            // מציאת השובר במצב המקומי
            const voucher = vouchers.find(v => v.id === voucherId);
            if (!voucher) return;
            
            // עדכון השובר בדאטאבייס - VouchersContext יעדכן אוטומטית
            await vouchersService.toggleVoucherUsed(voucherId, !currentStatus);
        } catch (error) {
            alert('שגיאה בעדכון סטטוס שובר');
        }
    };

    const handleDeleteVoucher = async (voucher: Voucher) => {
        if (!user) {
            openAuthModal('delete');
            return;
        }
        
        // אם השובר לא מומש, נציג הודעת אישור
        if (!voucher.isUsed) {
            const confirmDelete = window.confirm('השובר לא מומש. האם למחוק אותו?');
            if (!confirmDelete) return;
        }
        
        try {
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
            
            // למניעת שגיאת 404, נוודא שאנחנו לא עושים פעולות שיובילו לרינדור בעייתי
            setSelectedVoucher(null);
            setIsAddModalOpen(false);
            
            // VouchersContext יעדכן אוטומטי את הרשימה
        } catch (error) {
            console.error('שגיאה במחיקת שובר:', error);
            alert('שגיאה במחיקת שובר');
        }
    };

    const handleUploadImage = async (file: File, voucherId: string): Promise<string> => {
        if (!user || !file) return '';
        
        try {
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
            
            // מציאת השובר הקיים כדי לבדוק אם יש תמונה ישנה
            const existingVoucher = vouchers.find(v => v.id === voucherId);
            const oldImageUrl = existingVoucher?.imageUrl;
            
            // העלאת התמונה החדשה באמצעות storageService
            const imageUrl = await storageService.uploadImage(user.uid, file, 'vouchers');
            
            // עדכון השובר עם כתובת התמונה - VouchersContext יעדכן אוטומטית
            await vouchersService.updateVoucher(voucherId, {
                imageUrl
            });
            
            // מחיקת התמונה הישנה אם קיימת
            if (oldImageUrl) {
                try {
                    await storageService.deleteImage(oldImageUrl);
                } catch (deleteError) {
                    console.warn('שגיאה במחיקת התמונה הישנה:', deleteError);
                    // ממשיכים למרות שגיאה במחיקת התמונה הישנה
                }
            }
            
            return imageUrl;
        } catch (error) {
            alert("שגיאה בהעלאת תמונה: " + (error instanceof Error ? error.message : String(error)));
            return '';
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
            
            // עדכון בשירות - VouchersContext יעדכן אוטומטית
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
            
            // עדכון ברמת השרת - VouchersContext יעדכן אוטומטית
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

    // נעל את גלילת הרקע כאשר המודל פתוח
    useEffect(() => {
        const html = document.documentElement;
        const root = document.getElementById('root');
        if (selectedVoucher) {
            document.body.style.overflow = 'hidden';
            html.style.overflow = 'hidden';
            if (root) root.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            html.style.overflow = '';
            if (root) root.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            html.style.overflow = '';
            if (root) root.style.overflow = '';
        };
    }, [selectedVoucher]);

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
            <Header title="השוברים שלי" />
            
            <div className="p-4 max-w-3xl mx-auto pb-24">
                {/* כפתור הוספת שובר */}
                <div className="flex justify-between items-center mb-4">
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

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                        aria-label="הוספת שובר חדש"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

            {/* אזור החיפוש והסינון - מופיע רק אם יש שוברים */}
            {vouchers.length > 0 && (
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
            )}

            {/* רשימת השוברים */}
            {loading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="text-center py-12">
                    {searchTerm || selectedCategory !== 'all' ? (
                        // Filtered but no results
                        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Gift className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">אין שוברים להצגה</h3>
                            <p className="text-gray-500 mb-4">לא נמצאו שוברים התואמים את החיפוש</p>
                            <button
                                className="text-blue-600 hover:underline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('all');
                                }}
                            >
                                נקה מסננים
                            </button>
                        </div>
                    ) : (
                        // No vouchers at all - Beautiful empty state
                        <>
                            <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">אין עדיין שוברים</h3>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                התחילו לנהל את השוברים שלכם במקום אחד<br />
                                ותדאגו שאף שובר לא יפוג בטעות!
                            </p>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg shadow-blue-500/30"
                            >
                                <Plus className="w-5 h-5" />
                                <span>הוספת שובר ראשון</span>
                            </button>
                            <div className="bg-blue-50 rounded-lg p-4 mt-6 max-w-sm mx-auto">
                                <p className="text-sm text-blue-800 font-medium mb-2">💡 טיפ:</p>
                                <p className="text-sm text-blue-700">
                                    צלמו או העלו תמונה של השובר כדי לגשת אליו בקלות בקופה
                                </p>
                            </div>
                        </>
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
                                onViewImage={(voucher) => setSelectedVoucher(voucher)}
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
            {selectedVoucher && selectedVoucher.imageUrl && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 pb-24 overflow-hidden"
                    onClick={() => setSelectedVoucher(null)}
                >
                    <div 
                        className="relative w-full max-w-2xl max-h-[85vh] my-auto overflow-y-auto flex flex-col items-center scrollbar-hide"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedVoucher(null)}
                            className="absolute top-4 right-4 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-[70] shadow-lg"
                            aria-label="סגור תמונה"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {/* כותרת השובר */}
                        <div className="w-full text-center mb-4 px-2">
                            <h2 className="text-2xl font-bold text-white drop-shadow mb-2">{selectedVoucher.storeName}</h2>
                            {selectedVoucher.isPartial ? (
                                <p className="text-lg text-gray-200">
                                    נותרו: ₪{(selectedVoucher.remainingAmount ?? 0).toFixed(2)} מתוך ₪{selectedVoucher.amount.toFixed(2)}
                                </p>
                            ) : (
                                <p className="text-lg text-gray-200">שובר על סך ₪{selectedVoucher.amount.toFixed(2)}</p>
                            )}
                        </div>

                        <img
                            src={selectedVoucher.imageUrl}
                            alt="תמונת שובר מוגדלת"
                            className="w-full rounded-lg shadow-lg"
                            style={{ maxHeight: '80vh', objectFit: 'contain' }}
                        />

                        {/* כפתורי פעולה - עם מרווח נוסף מהתחתית */}
                        <div className="flex justify-center gap-4 mt-6 mb-4">
                            {selectedVoucher.isUsed ? (
                                <button
                                    onClick={() => {
                                        if (selectedVoucher) {
                                           handleToggleVoucherUsed(selectedVoucher.id, selectedVoucher.isUsed);
                                           setSelectedVoucher({ ...selectedVoucher, isUsed: !selectedVoucher.isUsed });
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg text-lg shadow-lg hover:bg-yellow-600 transition-colors font-medium"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    <span>שחזור</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (selectedVoucher) {
                                           handleToggleVoucherUsed(selectedVoucher.id, selectedVoucher.isUsed);
                                           setSelectedVoucher({ ...selectedVoucher, isUsed: !selectedVoucher.isUsed });
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-lg shadow-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span>מומש</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    handleDeleteVoucher(selectedVoucher);
                                    setSelectedVoucher(null);
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg text-lg shadow-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                <Trash2 className="w-5 h-5" />
                                <span>מחיקה</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* הטאב בר הישן מוסר - משתמשים בBottomNavbar מה-App.tsx */}
            </div>
        </>
    );
} 