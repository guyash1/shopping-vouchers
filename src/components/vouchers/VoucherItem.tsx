import React, { useState, useRef } from 'react';
import { Voucher } from '../../types/vouchers';
import { Calendar, CheckCircle, X, Upload, Trash2, ShoppingCart, Utensils, Droplet, ShoppingBag, Gift, Edit, Plus } from 'lucide-react';
import { getUserColor, getUserName, getInitials } from '../../utils/userColors';
import { Household } from '../../types/household';

// קטגוריות שוברים ואייקונים
const CATEGORY_ICONS = {
  supermarket: <ShoppingCart className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
  fuel: <Droplet className="w-4 h-4" />,
  fashion: <ShoppingBag className="w-4 h-4" />,
  general: <Gift className="w-4 h-4" />
};

// שמות מתורגמים של קטגוריות
const CATEGORY_NAMES = {
  supermarket: "סופרמרקט",
  restaurant: "מסעדות",
  fuel: "דלק",
  fashion: "אופנה",
  general: "כללי"
};

interface VoucherItemProps {
  voucher: Voucher;
  onDelete: () => void;
  onToggleUsed: () => void;
  onUploadImage: (file: File) => Promise<string>;
  onViewImage?: (voucher: Voucher) => void;
  onUpdateExpiryDate?: (voucherId: string, expiryDate: string | null) => Promise<void>;
  onUpdateRemainingAmount?: (voucherId: string, remainingAmount: number) => Promise<void>;
  household: Household | null;
}

export const VoucherItem: React.FC<VoucherItemProps> = ({
  voucher,
  onDelete,
  onToggleUsed,
  onUploadImage,
  onViewImage,
  onUpdateExpiryDate,
  onUpdateRemainingAmount,
  household
}) => {
  // קבלת פרטי המשתמש שהוסיף
  const userColor = getUserColor(voucher.userId);
  const userName = getUserName(voucher.userId, household);
  const userInitials = getInitials(userName);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showRemainingAmountEditor, setShowRemainingAmountEditor] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [usedAmountInput, setUsedAmountInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditRemainingEditor, setShowEditRemainingEditor] = useState(false);
  const [editRemainingInput, setEditRemainingInput] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // בדיקת תוקף שובר
  const isExpired = () => {
    return voucher.expiryDate ? new Date(voucher.expiryDate) < new Date() : false;
  };

  // בדיקת שובר שעומד לפוג
  const isAlmostExpired = () => {
    if (!voucher.expiryDate) return false;
    const expiryDate = new Date(voucher.expiryDate);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 0 && daysDiff <= 7;
  };

  // פונקציה חדשה - בדיקה אם בחודש הקרוב
  const isExpiringInMonth = () => {
    if (!voucher.expiryDate) return false;
    const expiryDate = new Date(voucher.expiryDate);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 7 && daysDiff <= 30;
  };

  // חישוב ימים עד פג תוקף
  const daysUntilExpiry = () => {
    if (!voucher.expiryDate) return 0;
    const expiryDate = new Date(voucher.expiryDate);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  // תאריך מפורמט
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL');
  };

  // טיפול בהעלאת תמונה
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await onUploadImage(file);
      setShowImageOptions(false);
    } catch (error) {
      console.error('שגיאה בהעלאת תמונה:', error);
      alert('שגיאה בהעלאת תמונה');
    }
  };

  // טיפול בעדכון תאריך תפוגה
  const handleUpdateExpiryDate = async () => {
    if (!onUpdateExpiryDate) return;
    
    try {
      await onUpdateExpiryDate(voucher.id, newExpiryDate);
      setShowExpiryDatePicker(false);
      setIsEditing(false);
    } catch (error) {
      console.error('שגיאה בעדכון תאריך תפוגה:', error);
      alert('שגיאה בעדכון תאריך תפוגה');
    }
  };

  // טיפול במחיקת תאריך תפוגה
  const handleDeleteExpiryDate = async () => {
    if (!onUpdateExpiryDate) return;
    
    const confirmDelete = window.confirm('האם למחוק את תאריך התפוגה של השובר?');
    if (!confirmDelete) return;
    
    try {
      await onUpdateExpiryDate(voucher.id, null);
    } catch (error) {
      console.error('שגיאה במחיקת תאריך תפוגה:', error);
      alert('שגיאה במחיקת תאריך תפוגה');
    }
  };
  
  // טיפול בטוח במחיקת שובר
  const handleSafeDelete = async () => {
    if (isDeleting) return; // מניעת לחיצה כפולה
    
    try {
      setIsDeleting(true);
      // סגירת כל התפריטים לפני המחיקה למניעת בעיות רינדור
      setShowExpiryDatePicker(false);
      setShowImageOptions(false);
      setShowRemainingAmountEditor(false);
      setIsEditing(false);
      
      // קריאה לפונקציית המחיקה
      onDelete();
    } catch (error) {
      console.error('שגיאה במחיקת שובר:', error);
    }
  };

  // פתיחת עריכת הסכום הנותר
  const openRemainingAmountEditor = () => {
    if (voucher.isPartial) {
      setUsedAmountInput('');
      // סגירת תפריט עריכת יתרה אם פתוח
      setShowEditRemainingEditor(false);
      setShowRemainingAmountEditor(true);
    }
  };

  const openEditRemainingEditor = () => {
    const currentRemaining = typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount : voucher.amount;
    setEditRemainingInput(currentRemaining.toString());
    // סגירת תפריט שימוש בסכום אם פתוח
    setShowRemainingAmountEditor(false);
    setShowEditRemainingEditor(true);
  };

  // עדכון הסכום הנותר
  const handleUpdateRemainingAmount = async () => {
    if (!onUpdateRemainingAmount) return;
    
    try {
      const used = parseFloat(usedAmountInput);
      if (isNaN(used) || used <= 0) {
        alert('יש להזין סכום שימוש תקין (> 0)');
        return;
      }
      // יתרה נוכחית
      const currentRemaining = typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount : voucher.amount;
      if (used > currentRemaining) {
        alert('הסכום לשימוש גדול מהיתרה הנוכחית');
        return;
      }
      const newRemaining = Math.max(0, Number((currentRemaining - used).toFixed(2)));
      await onUpdateRemainingAmount(voucher.id, newRemaining);
      setShowRemainingAmountEditor(false);
    } catch (error) {
      console.error('שגיאה בעדכון סכום נותר:', error);
      alert('שגיאה בעדכון סכום נותר');
    }
  };

  // חישוב אחוז הניצול של שובר נצבר
  const getUsagePercentage = () => {
    if (!voucher.isPartial || voucher.remainingAmount === undefined) return 0;
    
    // וידוא שהסכום הנותר הוא מספר
    const remainingAmount = typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount : 0;
    
    // חישוב כמה נוצל מהשובר
    const usedAmount = voucher.amount - remainingAmount;
    const percentage = (usedAmount / voucher.amount) * 100;
    
    return Math.min(100, Math.max(0, percentage));
  };

  const getBorderColor = () => {
    if (voucher.isUsed) return 'border-gray-200';
    if (isExpired()) return 'border-red-300';
    if (isAlmostExpired()) return 'border-yellow-300';
    if (isExpiringInMonth()) return 'border-orange-300';
    return 'border-green-300';
  };

  const getBackgroundColor = () => {
    if (voucher.isUsed) return 'bg-gray-50';
    if (isExpired()) return 'bg-red-50';
    if (isAlmostExpired()) return 'bg-yellow-50';
    if (isExpiringInMonth()) return 'bg-orange-50';
    return 'bg-white';
  };

  // אייקון הקטגוריה
  const getCategoryIcon = () => {
    const category = voucher.category || 'general';
    return CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.general;
  };

  // שם הקטגוריה
  const getCategoryName = () => {
    const category = voucher.category || 'general';
    return CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || CATEGORY_NAMES.general;
  };

  // פתיחת או עריכת תאריך תפוגה
  const openExpiryDateEdit = () => {
    if (voucher.expiryDate) {
      // תאריך קיים - מצב עריכה
      const date = new Date(voucher.expiryDate);
      // פורמט התאריך ל-YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];
      setNewExpiryDate(formattedDate);
      setIsEditing(true);
    } else {
      // תאריך חדש
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setNewExpiryDate(formattedDate);
      setIsEditing(false);
    }
    setShowExpiryDatePicker(true);
  };

  // אם השובר בתהליך מחיקה, הצגת מצב טעינה במקום הכפתורים
  if (isDeleting) {
    return (
      <div className={`border rounded-xl p-4 ${getBorderColor()} ${getBackgroundColor()} shadow-sm transition-shadow animate-pulse`}>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex justify-between mb-3">
              <div>
                <h3 className="font-bold text-xl text-gray-500">{voucher.storeName}</h3>
                <div className="flex items-center mt-1">
                  <p className="text-xl font-bold text-gray-500">₪{typeof voucher.amount === 'number' ? voucher.amount.toFixed(2) : '0.00'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="p-2 rounded-full bg-gray-200">
                  <div className="w-5 h-5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-2xl p-4 sm:p-5 ${getBorderColor()} ${getBackgroundColor()} ${voucher.isUsed ? 'opacity-70' : ''} shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] animate-fade-in`}>
      <div className="flex gap-3 sm:gap-4">
        {/* תוכן השובר */}
        <div className="flex-1">
          <div className="flex justify-between mb-3">
            <div>
              <h3 className="font-bold text-xl sm:text-2xl text-gray-900">{voucher.storeName}</h3>
              
              {/* תג של מי הוסיף */}
              <div className="flex items-center gap-1 mt-1 mb-1">
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${userColor.badge} text-xs ${userColor.text}`}>
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold">
                    {userInitials}
                  </div>
                  <span className="font-medium">{userName}</span>
                </div>
              </div>
              
              <div className="flex items-center mt-1">
                <p className="text-xl font-bold text-green-600">₪{typeof voucher.amount === 'number' ? voucher.amount.toFixed(2) : '0.00'}</p>
                
                {/* תווית שובר נצבר */}
                {voucher.isPartial && (
                  <span className="mr-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    נצבר
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <button
                  onClick={onToggleUsed}
                  className={`p-2 sm:p-2.5 rounded-xl shadow-md ${
                    voucher.isUsed 
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                      : 'bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-lg'
                  } transition-all hover:scale-110 active:scale-95`}
                  title={voucher.isUsed ? 'שחזר' : 'סמן כמומש'}
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <span className="text-xs mt-1 font-medium">{voucher.isUsed ? 'שחזר' : 'מומש'}</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={handleSafeDelete}
                  className="p-2 sm:p-2.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg hover:scale-110 active:scale-95"
                  title="מחיקת שובר"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <span className="text-xs mt-1 font-medium">מחיקה</span>
              </div>
            </div>
          </div>

          {/* הצגת מידע על שובר נצבר */}
          {voucher.isPartial && voucher.remainingAmount !== undefined && (
            <div className="mb-3">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="font-bold text-blue-900">סכום נותר: ₪{typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount.toFixed(2) : '0.00'}</span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                  {getUsagePercentage().toFixed(0)}% נוצל
                </span>
              </div>
              
              {/* שורת התקדמות */}
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${getUsagePercentage()}%` }}
                ></div>
              </div>
              
              {/* כפתורי עדכון - רק אם השובר לא מומש */}
              {!voucher.isUsed && onUpdateRemainingAmount && (
                <div className="flex gap-2">
                  <button
                    onClick={openRemainingAmountEditor}
                    className="flex-1 text-sm flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-md font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    שימוש בסכום
                  </button>
                  <button
                    onClick={openEditRemainingEditor}
                    className="flex-1 text-sm flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-all shadow-sm hover:shadow-md font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    עריכת יתרה
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {/* תאריך תפוגה */}
            {voucher.expiryDate ? (
              <div className={`flex items-center text-sm px-2 py-1 rounded-full ${
                isExpired() ? 'bg-red-100 text-red-700' : 
                isAlmostExpired() ? 'bg-yellow-100 text-yellow-700' :
                isExpiringInMonth() ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <Calendar className="w-3.5 h-3.5 ml-1" />
                <span>
                  {formatDate(voucher.expiryDate)}
                  {!voucher.isUsed && !isExpired() && (
                    <span className="mr-2 inline-block">
                      {isAlmostExpired() ? (
                        <span className="font-medium">
                          ({daysUntilExpiry()} ימים)
                        </span>
                      ) : (
                        <span>
                          ({daysUntilExpiry()} ימים)
                        </span>
                      )}
                    </span>
                  )}
                  {isExpired() && (
                    <span className="font-medium mr-1">
                      (פג תוקף)
                    </span>
                  )}
                </span>
                {/* איחוד כפתורי עריכה ומחיקה */}
                {onUpdateExpiryDate && (
                  <div className="inline-flex mr-1">
                    <button
                      onClick={openExpiryDateEdit}
                      className="ml-1 p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="עריכת תאריך תפוגה"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDeleteExpiryDate}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="מחיקת תאריך תפוגה"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              onUpdateExpiryDate && (
                <button
                  onClick={openExpiryDateEdit}
                  className="flex items-center justify-center bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs"
                  title="הוספת תאריך תפוגה"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  <span>הוספת תאריך תפוגה</span>
                </button>
              )
            )}

            {/* תגית קטגוריה */}
            <div className="flex items-center text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              {getCategoryIcon()}
              <span className="ml-1">{getCategoryName()}</span>
            </div>

            {/* תאריך הוספה - חדש! 📅 */}
            {voucher.createdAt && (
              <div className="flex items-center text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-full">
                <Calendar className="w-3 h-3 ml-1" />
                <span>נוסף: {formatDate(voucher.createdAt.toString())}</span>
              </div>
            )}
          </div>
        </div>

        {/* תמונת השובר - עם שיפור הגדלה */}
        {voucher.imageUrl ? (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
            <div 
              onClick={() => onViewImage && onViewImage(voucher)} 
              className="group relative w-full h-full overflow-hidden rounded-xl cursor-pointer shadow-md hover:shadow-xl transition-all border-2 border-blue-200 hover:border-blue-400"
            >
              <img
                src={voucher.imageUrl}
                alt={voucher.storeName}
                className="w-full h-full object-cover transition-transform group-hover:scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <span className="text-white text-sm font-bold drop-shadow-lg">הגדל</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowImageOptions(true)}
            className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">הוספת תמונה</span>
          </button>
        )}
      </div>

      {/* תפריט אפשרויות תמונה */}
      {showImageOptions && (
        <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 animate-slide-down">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-gray-900">אפשרויות תמונה</h4>
            <button
              onClick={() => setShowImageOptions(false)}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>העלה מהמכשיר</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      )}

      {/* תפריט בחירת תאריך תפוגה */}
      {showExpiryDatePicker && (
        <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 animate-slide-down">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-gray-900">{isEditing ? 'עריכת תאריך תפוגה' : 'הוספת תאריך תפוגה'}</h4>
            <button
              onClick={() => setShowExpiryDatePicker(false)}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              dir="rtl"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowExpiryDatePicker(false)}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateExpiryDate}
                className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
              >
                {isEditing ? 'עדכון' : 'הוספה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* שימוש בסכום משובר נצבר */}
      {showRemainingAmountEditor && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">שימוש בשובר נצבר</h4>
            <button
              onClick={() => setShowRemainingAmountEditor(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <span className="text-sm ml-2">₪</span>
              <input
                type="number"
                min="0.01"
                max={(typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount : voucher.amount)}
                step="0.01"
                value={usedAmountInput}
                onChange={(e) => setUsedAmountInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="סכום לשימוש כעת"
                dir="rtl"
              />
            </div>
            <div className="text-xs text-gray-500 mb-2">
              סכום מקורי: ₪{typeof voucher.amount === 'number' ? voucher.amount.toFixed(2) : '0.00'} · 
              נותר כעת: ₪{(typeof voucher.remainingAmount === 'number' ? voucher.remainingAmount : voucher.amount).toFixed(2)}
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowRemainingAmountEditor(false)}
                className="py-1.5 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateRemainingAmount}
                className="py-1.5 px-3 bg-blue-100 text-blue-600 rounded-lg text-sm"
              >
                ביצוע שימוש
              </button>
            </div>
          </div>
        </div>
      )}

      {/* עריכת יתרה ידנית */}
      {showEditRemainingEditor && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">עריכת יתרה</h4>
            <button
              onClick={() => setShowEditRemainingEditor(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <span className="text-sm ml-2">₪</span>
              <input
                type="number"
                min="0"
                max={voucher.amount}
                step="0.01"
                value={editRemainingInput}
                onChange={(e) => setEditRemainingInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="יתרה חדשה"
                dir="rtl"
              />
            </div>
            <div className="text-xs text-gray-500 mb-2">
              סכום מקורי: ₪{typeof voucher.amount === 'number' ? voucher.amount.toFixed(2) : '0.00'}
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowEditRemainingEditor(false)}
                className="py-1.5 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm"
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  if (!onUpdateRemainingAmount) return;
                  const newVal = parseFloat(editRemainingInput);
                  if (isNaN(newVal) || newVal < 0) {
                    alert('יש להזין יתרה תקינה (≥ 0)');
                    return;
                  }
                  if (newVal > voucher.amount) {
                    alert('יתרה לא יכולה להיות גדולה מהסכום המקורי');
                    return;
                  }
                  await onUpdateRemainingAmount(voucher.id, Number(newVal.toFixed(2)));
                  setShowEditRemainingEditor(false);
                }}
                className="py-1.5 px-3 bg-purple-100 text-purple-700 rounded-lg text-sm"
              >
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS לאנימציות
const styles = `
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
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
  }
  
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
`;

// הוספת ה-styles לראש הדף (רק פעם אחת)
if (typeof document !== 'undefined' && !document.getElementById('voucher-item-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'voucher-item-animations';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 