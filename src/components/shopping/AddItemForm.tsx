import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, History, Camera } from "lucide-react";
import { aiService } from '../../services/ai.service';

interface HistoryItem {
  name: string;
  imageUrl?: string;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  lastPartialPurchaseDate?: Date;
}

interface AddItemFormProps {
  onAddItem: (itemName: string, quantity: number, image?: File, existingImageUrl?: string) => Promise<string | void>;
  onOpenHistoryModal: () => void;
  historyItems: HistoryItem[];
  activeItems: Array<{ name: string; status: string }>; // מוצרים פעילים ברשימת הקניות
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ 
  onAddItem, 
  onOpenHistoryModal,
  historyItems = [], // ברירת מחדל למקרה שלא מועבר
  activeItems = [] // ברירת מחדל למקרה שלא מועבר
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validatingImage, setValidatingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // סינון פריטים מההיסטוריה לפי הקלט
  const filteredItems = useMemo(() => {
    if (!inputValue.trim()) return [];
    
    // מסננים החוצה מוצרים שכבר נמצאים ברשימת הקניות
    const activeItemNames = new Set(activeItems.map(item => item.name.toLowerCase()));
    
    return historyItems
      .filter(item => 
        item.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !activeItemNames.has(item.name.toLowerCase())
      )
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, 5);
  }, [historyItems, inputValue, activeItems]);

  // טיפול בשינוי קלט
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(value.trim().length > 0);
  };

  // טיפול בפוקוס
  const handleFocus = () => {
    // לא מציגים את הדרופדאון בפוקוס, רק כשיש קלט
    setShowDropdown(inputValue.trim().length > 0);
  };

  // טיפול באיבוד פוקוס
  const handleBlur = (e: React.FocusEvent) => {
    // בדיקה מתוקנת למובייל - נשתמש ב- setTimeout כדי לתת לאירוע הקליק להתבצע לפני סגירת הדרופדאון
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 200);
  };

  // עדכון תצוגה מקדימה של תמונה כשמוצר נמצא בהיסטוריה
  useEffect(() => {
    const matchingItem = historyItems.find(
      item => item.name.toLowerCase() === inputValue.trim().toLowerCase() && item.imageUrl
    );
    
    if (matchingItem?.imageUrl) {
      setImagePreview(matchingItem.imageUrl);
      // מנקים את התמונה שנבחרה (אם יש) כדי שנשתמש בתמונה מההיסטוריה
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else if (!selectedImage) {
      // אם אין התאמה ואין תמונה שנבחרה, מנקים את התצוגה המקדימה
      setImagePreview(null);
    }
  }, [inputValue, historyItems, selectedImage]);

  // טיפול בבחירת פריט מההיסטוריה
  const handleSelectItem = (item: HistoryItem) => {
    // עדכון הקלט ללא סגירה מיידית של הדרופדאון - נסגור אותו באמצעות setTimeout
    setInputValue(item.name);
    
    // פוקוס על שדה הקלט להמשך הזנה
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // סגירה אחרי השהייה קצרה
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(null);
    }, 100);
  };

  // מניעת סגירת הדרופדאון בלחיצה
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // וידוא שהאינפוט נשאר בפוקוס
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValidatingImage(true);
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageDataUrl = event.target?.result as string;
        
        try {
          // Validate with AI before showing preview
          const validation = await aiService.validateImage(imageDataUrl, 'product');
          
          if (!validation.isValid) {
            alert(`❌ התמונה לא מתאימה\n\n${validation.reason}\n\nאנא העלה תמונה של מוצר שקונים בחנות.`);
            // Reset file input
            e.target.value = '';
            setValidatingImage(false);
            return;
          }

          // If valid, set image for upload and preview
          setSelectedImage(file);
          setImagePreview(imageDataUrl);
          
        } catch (error) {
          console.error('Error validating image:', error);
          // On error, allow upload (fail open)
          setSelectedImage(file);
          setImagePreview(imageDataUrl);
        } finally {
          setValidatingImage(false);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    try {
      setLoading(true);
      
      // בודקים אם קיים מוצר עם אותו שם בהיסטוריה
      const existingItem = historyItems.find(item => 
        item.name.toLowerCase() === inputValue.trim().toLowerCase()
      );

      await onAddItem(
        inputValue.trim(),
        quantity,
        // אם יש מוצר קיים בהיסטוריה ונבחרה תמונה חדשה - נעדכן את התמונה שלו
        existingItem ? selectedImage || undefined : selectedImage || undefined,
        // אם יש מוצר קיים בהיסטוריה ואין תמונה חדשה - נשתמש בתמונה הקיימת
        existingItem && !selectedImage ? existingItem.imageUrl : undefined
      );

      // איפוס הטופס
      setInputValue('');
      setQuantity(1);
      setSelectedImage(null);
      setImagePreview(null);
      setShowDropdown(false);
      setSelectedIndex(null);
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('שגיאה בהוספת פריט:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // טיפול בניווט מקלדת
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev === null || prev >= filteredItems.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev === null || prev <= 0 ? filteredItems.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter' && selectedIndex !== null) {
      e.preventDefault();
      const selectedItem = filteredItems[selectedIndex];
      handleSelectItem(selectedItem);
    } else if (e.key === 'Escape') {
      e.preventDefault(); // חשוב למנוע התנהגות ברירת מחדל על מובייל
      setShowDropdown(false);
      setSelectedIndex(null);
    } else if (e.key === 'Tab') {
      // מניעת סגירה אוטומטית בלחיצה על Tab במובייל
      if (showDropdown) {
        e.preventDefault();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-3 sm:p-4 mb-3 border border-gray-100 animate-fade-in">
      <div className="flex gap-2 mb-3 relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="הוספת פריט חדש..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
            dir="rtl"
            autoComplete="off"
          />
          
          {/* דרופדאון היסטוריה - עם תיקון למובייל */}
          {showDropdown && filteredItems.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-20 w-full bg-white mt-2 rounded-xl shadow-2xl max-h-60 overflow-auto border-2 border-blue-200 animate-slide-down"
              onClick={handleDropdownClick}
              onTouchStart={(e) => {
                // למובייל - למנוע בלור שסוגר את הדרופדאון
                e.preventDefault();
              }}
            >
              <div className="py-2 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-xs font-semibold text-blue-700 border-b border-blue-200">
                מוצרים שקנית בעבר
              </div>
              {filteredItems.map((item, index) => (
                <button
                  key={item.name}
                  type="button" // חשוב לציין שזה לא כפתור שליחה
                  className={`w-full text-right px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between transition-all ${
                    selectedIndex === index ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault(); // למניעת שליחת הטופס
                    e.stopPropagation(); // למניעת התרחשות בלור שיסגור את הדרופדאון
                    handleSelectItem(item);
                  }}
                  onTouchStart={(e) => {
                    // למובייל - וידוא שהאלמנט לא יאבד פוקוס
                    e.stopPropagation();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{item.name}</span>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-7 h-7 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          className="w-16 sm:w-20 px-2 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold shadow-sm hover:shadow-md transition-all"
          aria-label="כמות"
        />
        <button
          type="submit"
          disabled={loading || validatingImage || !inputValue.trim()}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2 sm:py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          aria-label="הוספת פריט חדש לרשימה"
          title="הוסף פריט חדש לרשימה"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">חדש</span>
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {validatingImage ? (
            <div className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>מעלה תמונה...</span>
            </div>
          ) : (
            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 text-sm font-semibold transition-all">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={validatingImage}
              />
              <Camera className="w-4 h-4" />
              <span>
                {imagePreview ? 'החלפת תמונה' : 'הוספת תמונה'}
              </span>
            </label>
          )}
          
          {imagePreview && !validatingImage && (
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 relative overflow-hidden rounded-lg border-2 border-blue-300 shadow-sm">
                <img 
                  src={imagePreview} 
                  alt="תצוגה מקדימה" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleClearImage}
                className="px-2 py-1 text-red-600 hover:text-white hover:bg-red-600 rounded-lg text-xs font-semibold transition-all"
              >
                הסר
              </button>
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={onOpenHistoryModal}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-sm font-semibold transition-all"
        >
          <History className="w-4 h-4" />
          <span>היסטוריית מוצרים</span>
        </button>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-slide-down {
            animation: none;
          }
        }
      `}</style>
    </form>
  );
}; 