import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, History } from "lucide-react";

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
    // בודקים אם הקליק היה על הדרופדאון
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setShowDropdown(false);
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
    setInputValue(item.name);
    setShowDropdown(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // יצירת תצוגה מקדימה של התמונה
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
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
      setShowDropdown(false);
      setSelectedIndex(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex gap-2 mb-2 relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="הוסף פריט חדש..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
            autoComplete="off"
          />
          
          {/* דרופדאון היסטוריה */}
          {showDropdown && filteredItems.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {filteredItems.map((item, index) => (
                <button
                  key={item.name}
                  className={`w-full text-right px-4 py-2 hover:bg-gray-100 flex items-center justify-between ${
                    selectedIndex === index ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-6 h-6 object-cover rounded"
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
          className="w-20 px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="כמות"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="הוסף פריט חדש"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-blue-500 hover:text-blue-600">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <span className="text-sm">
              {imagePreview ? 'החלף תמונה' : 'הוסף תמונה'}
            </span>
          </label>
          
          {imagePreview && (
            <>
              <div className="w-8 h-8 relative">
                <img 
                  src={imagePreview} 
                  alt="תצוגה מקדימה" 
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <button
                type="button"
                onClick={handleClearImage}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                הסר
              </button>
            </>
          )}
        </div>
        
        <button
          type="button"
          onClick={onOpenHistoryModal}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
        >
          <History className="w-4 h-4" />
          <span>היסטוריית מוצרים</span>
        </button>
      </div>
    </form>
  );
}; 