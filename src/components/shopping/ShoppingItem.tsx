import React, { useState, useRef, useEffect } from 'react';
import { ShoppingCart, AlertCircle, MinusCircle, PlusCircle, X, Edit, Camera, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { Item, ShoppingCategory } from '../../types/shopping';
import Modal from 'react-modal';
import { EditNameModal } from './EditNameModal';
import { getUserColor, getUserName, getInitials } from '../../utils/userColors';
import { Household } from '../../types/household';

// מיפוי קטגוריות לאייקונים ולצבעים
const CATEGORY_CONFIG: Record<ShoppingCategory, { emoji: string; color: string; bgColor: string }> = {
  'פירות, ירקות ופיצוחים': { emoji: '🥬', color: 'text-green-700', bgColor: 'bg-green-100' },
  'מוצרי חלב וביצים': { emoji: '🥛', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'בשר, עוף ודגים': { emoji: '🥩', color: 'text-red-700', bgColor: 'bg-red-100' },
  'לחמים ומוצרי מאפה': { emoji: '🍞', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'משקאות, יין, אלכוהול וסנקים': { emoji: '🍷', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'מזון מקורר, קפוא ונקניקים': { emoji: '🧊', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  'בישול אפיה ושימורים': { emoji: '🥫', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'חטיפים מתוקים ודגני בוקר': { emoji: '🍫', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  'פארם וטיפוח': { emoji: '🧴', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  'עולם התינוקות': { emoji: '👶', color: 'text-sky-700', bgColor: 'bg-sky-100' },
  'ניקיון לבית וחד פעמי': { emoji: '🧹', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'ויטמינים ותוספי תזונה': { emoji: '💊', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  'כללי': { emoji: '📦', color: 'text-gray-600', bgColor: 'bg-gray-200' },
};

const ALL_CATEGORIES: ShoppingCategory[] = [
  'פירות, ירקות ופיצוחים',
  'מוצרי חלב וביצים',
  'בשר, עוף ודגים',
  'לחמים ומוצרי מאפה',
  'משקאות, יין, אלכוהול וסנקים',
  'מזון מקורר, קפוא ונקניקים',
  'בישול אפיה ושימורים',
  'חטיפים מתוקים ודגני בוקר',
  'פארם וטיפוח',
  'עולם התינוקות',
  'ניקיון לבית וחד פעמי',
  'ויטמינים ותוספי תזונה',
  'כללי',
];

interface ShoppingItemProps {
  item: Item;
  onDelete: (id: string) => void;
  onEditQuantity: (item: Item) => void;
  onToggleStatus: (id: string, status: Item['status']) => void;
  onUploadImage: (file: File | null, itemId: string) => Promise<string>;
  onChangeQuantity: (id: string, newQuantity: number) => Promise<void>;
  onEditName?: (id: string, newName: string) => Promise<void>;
  onChangeCategory?: (id: string, newCategory: ShoppingCategory) => Promise<void>;
  household: Household | null;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = React.memo(({ 
  item, 
  onDelete, 
  onEditQuantity, 
  onToggleStatus,
  onUploadImage,
  onChangeQuantity,
  onEditName,
  onChangeCategory,
  household
}) => {
  // קבלת פרטי המשתמש שהוסיף
  const userColor = getUserColor(item.addedBy, item.householdId);
  const userName = getUserName(item.addedBy, household);
  const userInitials = getInitials(userName);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingQty, setIsUpdatingQty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // סגירת dropdown בלחיצה מחוץ לאזור
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  // פונקציה לשינוי קטגוריה
  const handleCategoryChange = async (newCategory: ShoppingCategory) => {
    if (!onChangeCategory || newCategory === item.category) {
      setShowCategoryDropdown(false);
      return;
    }
    
    // אם המוצר לא ב"כללי", מבקשים אישור לפני שינוי
    if (!isGeneralCategory) {
      const confirmed = window.confirm(
        `האם לשנות את הקטגוריה של "${item.name}" מ-"${currentCategory}" ל-"${newCategory}"?`
      );
      if (!confirmed) {
        setShowCategoryDropdown(false);
        return;
      }
    }
    
    try {
      setIsUpdatingCategory(true);
      await onChangeCategory(item.id, newCategory);
      setShowCategoryDropdown(false);
    } catch (error) {
      console.error('שגיאה בשינוי קטגוריה:', error);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // קבלת הגדרות הקטגוריה הנוכחית
  const currentCategory = item.category || 'כללי';
  const categoryConfig = CATEGORY_CONFIG[currentCategory];
  const isGeneralCategory = currentCategory === 'כללי';
  
  const getItemBackgroundColor = (status: Item['status']) => {
    switch (status) {
      case 'inCart':
        return 'bg-green-50';
      case 'missing':
        return 'bg-red-50';
      case 'partial':
        return 'bg-yellow-50';
      case 'purchased':
        return 'bg-blue-50';
      default:
        return 'bg-white';
    }
  };

  const handleStatusToggle = (status: Item['status']) => {
    // בדיקה מיוחדת לסטטוס "חלקי" עם כמות 1
    if (status === 'partial' && item.quantity === 1) {
      alert('לא ניתן לסמן מוצר כחלקי כאשר הכמות היא 1!\n\n סמנו אותו "בעגלה" או "חסר".');
      return;
    }
    
    // אם כבר לחוץ על הסטטוס, מחזירים למצב רגיל, אחרת מעדכנים לסטטוס החדש
    const newStatus = item.status === status ? 'pending' : status;
    onToggleStatus(item.id, newStatus);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      await onUploadImage(file, item.id);
    } catch (error) {
      console.error('שגיאה בהעלאת תמונה:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 p-3 sm:p-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all ${getItemBackgroundColor(item.status)} relative border-b border-gray-100 border-r-4 ${userColor.border} animate-fade-in`}>
      {/* שורה עליונה: תמונה + תוכן + כמות + מחיקה */}
      <div className="flex gap-3 items-start">
        {/* תמונת המוצר */}
        <div className="w-12 h-12 flex-shrink-0">
          {item.imageUrl ? (
            <div className="relative group w-12 h-12">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover rounded-xl cursor-pointer transition-transform duration-200 group-hover:scale-110 border-2 border-blue-200 shadow-md" 
                onClick={() => setIsImageModalOpen(true)}
              />
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center border-2 border-dashed rounded-xl border-blue-300 bg-blue-50 hover:bg-blue-100 transition-all">
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              ) : (
                <label className="flex items-center justify-center cursor-pointer w-full h-full">
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <Camera className="text-gray-400" size={18} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* תוכן המוצר - שם + תגיות */}
        <div className="flex-1 min-w-0">
          {/* שם המוצר */}
          <div className="flex items-center gap-1 mb-1">
            <div className="font-medium text-gray-800 leading-tight break-words flex-1">
              {item.name}
            </div>
            {onEditName && (
              <button
                onClick={() => setIsEditNameModalOpen(true)}
                className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                aria-label="עריכת שם"
                title="עריכת שם"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* תג של מי הוסיף + קטגוריה */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${userColor.badge} text-xs ${userColor.text}`}>
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold">
                {userInitials}
              </div>
              <span className="font-medium">{userName}</span>
            </div>
            
            {/* תג קטגוריה - לחיץ לשינוי */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                onClick={() => onChangeCategory && setShowCategoryDropdown(!showCategoryDropdown)}
                disabled={!onChangeCategory || isUpdatingCategory}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  isGeneralCategory
                    ? 'bg-amber-100 text-amber-700 border border-amber-300 border-dashed animate-pulse-subtle'
                    : `${categoryConfig.bgColor} ${categoryConfig.color}`
                } ${onChangeCategory ? 'cursor-pointer hover:opacity-80 hover:shadow-sm' : 'cursor-default'}`}
                title={onChangeCategory ? 'לחץ לשינוי קטגוריה' : undefined}
              >
                <span>{categoryConfig.emoji}</span>
                <span className="max-w-[80px] truncate">{currentCategory.split(',')[0]}</span>
                {onChangeCategory && (
                  isUpdatingCategory ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )
                )}
              </button>

              {/* Dropdown לבחירת קטגוריה - fixed position to appear above everything */}
              {showCategoryDropdown && (
                <>
                  {/* Overlay to catch clicks outside */}
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setShowCategoryDropdown(false)}
                  />
                  {/* Dropdown menu */}
                  <div 
                    className="fixed z-[101] bg-white rounded-xl shadow-2xl border border-gray-200 py-1 min-w-[220px] max-h-[280px] overflow-y-auto animate-slide-down"
                    style={{
                      top: (categoryDropdownRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                      right: Math.max(8, window.innerWidth - (categoryDropdownRef.current?.getBoundingClientRect().right ?? 0)),
                    }}
                  >
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-100 sticky top-0 bg-white">
                      בחר קטגוריה
                    </div>
                    {ALL_CATEGORIES.map((category) => {
                      const config = CATEGORY_CONFIG[category];
                      const isSelected = category === currentCategory;
                      return (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`w-full text-right px-3 py-2.5 flex items-center gap-2 transition-all ${
                            isSelected 
                              ? 'bg-blue-100 text-blue-800 font-bold border-r-4 border-blue-500' 
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="text-lg">{config.emoji}</span>
                          <span className={`text-sm flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>{category}</span>
                          {isSelected && <span className="text-blue-600 font-bold text-lg">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* בקרת כמות */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="flex items-center bg-blue-50 rounded-lg border border-blue-200 overflow-hidden shadow-sm">
            <button
              disabled={isUpdatingQty || item.quantity <= 1}
              onClick={async () => {
                if (item.quantity <= 1) return;
                try {
                  setIsUpdatingQty(true);
                  await onChangeQuantity(item.id, item.quantity - 1);
                } finally {
                  setIsUpdatingQty(false);
                }
              }}
              className="p-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-100 active:bg-blue-200"
              aria-label="הפחת כמות"
            >
              <MinusCircle className="w-4 h-4 text-blue-600" />
            </button>
            <span className="px-2 py-1 font-bold text-blue-700 select-none min-w-[2rem] text-center">{item.quantity}</span>
            <button
              disabled={isUpdatingQty}
              onClick={async () => {
                try {
                  setIsUpdatingQty(true);
                  await onChangeQuantity(item.id, item.quantity + 1);
                } finally {
                  setIsUpdatingQty(false);
                }
              }}
              className="p-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-100 active:bg-blue-200"
              aria-label="הוספת כמות"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          {/* כפתור עריכה בולט יותר */}
          <button
            onClick={() => onEditQuantity(item)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            aria-label="עריכת כמות"
          >
            <Edit className="w-3 h-3" />
            <span>עריכה</span>
          </button>
        </div>

        {/* כפתור מחיקה */}
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-xl bg-red-100 hover:bg-red-500 text-red-600 hover:text-white transition-all flex-shrink-0"
          aria-label="מחק פריט"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* שורה תחתונה: כפתורי סטטוס - מתפרסים על כל הרוחב */}
      <div className="flex gap-1.5">
        <button
          onClick={() => handleStatusToggle('inCart')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all text-xs font-semibold ${
            item.status === 'inCart' 
              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
          }`}
          aria-label="סמן כנמצא בעגלה"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>בעגלה</span>
        </button>
        
        <button
          onClick={() => handleStatusToggle('partial')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all text-xs font-semibold ${
            item.status === 'partial' 
              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'
          }`}
          aria-label="סמן כנלקח חלקית"
        >
          <MinusCircle className="w-4 h-4" />
          <span>חלקי</span>
        </button>
        
        <button
          onClick={() => handleStatusToggle('missing')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all text-xs font-semibold ${
            item.status === 'missing' 
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
          }`}
          aria-label="סמן כחסר במלאי"
        >
          <AlertCircle className="w-4 h-4" />
          <span>חסר</span>
        </button>
      </div>
      
      {/* מודל תמונה מוגדלת - מודרני ו-responsive */}
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={() => setIsImageModalOpen(false)}
        className="fixed inset-0 flex items-center justify-center z-[60] p-4 pb-24 overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-90 z-[60]"
        contentLabel={`תמונה של ${item.name}`}
      >
        <div className="relative w-full max-w-2xl flex flex-col items-center gap-6 my-auto">
          {/* כפתורי פעולה עליונים */}
          <div className="flex items-center justify-between w-full px-2">
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="bg-white/20 backdrop-blur-md rounded-full p-2.5 text-white hover:bg-white/30 transition-colors"
              aria-label="סגור תמונה"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex gap-2">
              <label className={`bg-white/20 backdrop-blur-md rounded-full p-2.5 text-white transition-colors ${isUploading ? 'cursor-wait' : 'cursor-pointer hover:bg-white/30'}`}>
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <RefreshCw className={`w-6 h-6 ${isUploading ? 'animate-spin' : ''}`} />
              </label>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-white/20 backdrop-blur-md rounded-full p-2.5 text-red-300 hover:bg-white/30 hover:text-red-200 transition-colors"
                aria-label="מחק תמונה"
                disabled={isUploading}
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* כותרת המוצר - מעל התמונה */}
          <div className="w-full text-center">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{item.name}</h2>
            <p className="text-xl text-yellow-300 font-semibold drop-shadow">כמות: {item.quantity}</p>
          </div>

          {/* תמונה מוגדלת */}
          <div className="w-full rounded-xl overflow-hidden shadow-2xl">
            <img 
              src={item.imageUrl || ''} 
              alt={item.name} 
              className="w-full h-auto object-contain"
              style={{ maxHeight: '70vh' }}
            />
          </div>
        </div>
      </Modal>

      {/* מודל אישור מחיקת תמונה */}
      <Modal
        isOpen={showDeleteConfirm}
        onRequestClose={() => setShowDeleteConfirm(false)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl outline-none p-6 max-w-sm w-full mx-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-[70]"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">מחיקת תמונה</h3>
          <p className="text-gray-600 mb-6">
            למחוק את התמונה? לא ניתן יהיה לשחזר אותה.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={async () => {
                if (item.imageUrl) {
                  try {
                    setIsUploading(true);
                    await onUploadImage(null, item.id);
                    setShowDeleteConfirm(false);
                    setIsImageModalOpen(false);
                  } catch (error) {
                    console.error('שגיאה במחיקת תמונה:', error);
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              {isUploading ? 'מוחק...' : 'מחק'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              בטל
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Name Modal */}
      {onEditName && (
        <EditNameModal
          isOpen={isEditNameModalOpen}
          onClose={() => setIsEditNameModalOpen(false)}
          item={item}
          onSave={onEditName}
        />
      )}

      {/* סרגל סטטוס בתחתית הפריט */}
      <div className="absolute bottom-0 left-0 right-0 h-1">
        {item.status === 'inCart' && <div className="bg-green-500 h-full w-full"></div>}
        {item.status === 'partial' && <div className="bg-yellow-500 h-full w-full"></div>}
        {item.status === 'missing' && <div className="bg-red-500 h-full w-full"></div>}
      </div>
    </div>
  );
}); 

// הוספת סגנון אנימציה באמצעות CSS
if (typeof document !== 'undefined' && !document.getElementById('shopping-item-animations')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'shopping-item-animations';
  styleElement.textContent = `
    @keyframes scale-up {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
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
    
    .animate-scale-up {
      animation: scale-up 0.2s ease-out forwards;
    }
    
    .animate-fade-in {
      animation: fade-in 0.6s ease-out forwards;
    }

    @keyframes slide-down {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-slide-down {
      animation: slide-down 0.2s ease-out forwards;
    }

    @keyframes pulse-subtle {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .animate-pulse-subtle {
      animation: pulse-subtle 2s ease-in-out infinite;
    }
    
    @media (prefers-reduced-motion: reduce) {
      .animate-fade-in,
      .animate-slide-down,
      .animate-pulse-subtle {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }
  `;
  document.head.appendChild(styleElement);
} 