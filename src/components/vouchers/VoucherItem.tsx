import React, { useState, useRef } from 'react';
import { Voucher } from '../../types/vouchers';
import { Calendar, CheckCircle, X, Upload, Trash2, ShoppingCart, Utensils, Droplet, ShoppingBag, Gift, Edit, Plus } from 'lucide-react';

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
  onViewImage?: (imageUrl: string) => void;
  onUpdateExpiryDate?: (voucherId: string, expiryDate: string | null) => Promise<void>;
}

export const VoucherItem: React.FC<VoucherItemProps> = ({
  voucher,
  onDelete,
  onToggleUsed,
  onUploadImage,
  onViewImage,
  onUpdateExpiryDate
}) => {
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    
    const confirmDelete = window.confirm('האם אתה בטוח שברצונך למחוק את תאריך התפוגה של השובר?');
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
      setIsEditing(false);
      
      // קריאה לפונקציית המחיקה
      onDelete();
    } catch (error) {
      console.error('שגיאה במחיקת שובר:', error);
    }
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
                  <p className="text-xl font-bold text-gray-500">₪{voucher.amount.toFixed(2)}</p>
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
    <div className={`border rounded-xl p-4 ${getBorderColor()} ${getBackgroundColor()} ${voucher.isUsed ? 'opacity-70' : ''} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex gap-3">
        {/* תוכן השובר */}
        <div className="flex-1">
          <div className="flex justify-between mb-3">
            <div>
              <h3 className="font-bold text-xl text-gray-800">{voucher.storeName}</h3>
              <div className="flex items-center mt-1">
                <p className="text-xl font-bold text-green-600">₪{voucher.amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <button
                  onClick={onToggleUsed}
                  className={`p-2 rounded-full ${
                    voucher.isUsed 
                      ? 'bg-gray-200 text-gray-600' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  } transition-colors`}
                  title={voucher.isUsed ? 'שחזר' : 'סמן כמומש'}
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <span className="text-xs mt-1">{voucher.isUsed ? 'שחזר' : 'מומש'}</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={handleSafeDelete}
                  className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                  title="מחק שובר"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <span className="text-xs mt-1">מחק</span>
              </div>
            </div>
          </div>

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
                      title="ערוך תאריך תפוגה"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDeleteExpiryDate}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="מחק תאריך תפוגה"
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
                  title="הוסף תאריך תפוגה"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  <span>הוסף תאריך תפוגה</span>
                </button>
              )
            )}

            {/* תגית קטגוריה */}
            <div className="flex items-center text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              {getCategoryIcon()}
              <span className="ml-1">{getCategoryName()}</span>
            </div>
          </div>
        </div>

        {/* תמונת השובר - עם שיפור הגדלה */}
        {voucher.imageUrl ? (
          <div className="relative w-20 h-20 shrink-0">
            <div 
              onClick={() => onViewImage && onViewImage(voucher.imageUrl!)} 
              className="group relative w-full h-full overflow-hidden rounded-lg cursor-pointer"
            >
              <img
                src={voucher.imageUrl}
                alt={voucher.storeName}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <span className="text-white text-xs font-bold">הגדל</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowImageOptions(true)}
            className="w-20 h-20 shrink-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs">הוסף תמונה</span>
          </button>
        )}
      </div>

      {/* תפריט אפשרויות תמונה */}
      {showImageOptions && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">אפשרויות תמונה</h4>
            <button
              onClick={() => setShowImageOptions(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center gap-1 text-sm hover:bg-blue-200 transition-colors"
            >
              <Upload className="w-3 h-3" />
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
        <div className="mt-2 p-3 bg-gray-50 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">{isEditing ? 'ערוך תאריך תפוגה' : 'הוסף תאריך תפוגה'}</h4>
            <button
              onClick={() => setShowExpiryDatePicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowExpiryDatePicker(false)}
                className="py-1.5 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateExpiryDate}
                className="py-1.5 px-3 bg-blue-100 text-blue-600 rounded-lg text-sm"
              >
                {isEditing ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 