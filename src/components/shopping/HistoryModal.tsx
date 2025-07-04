import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { X, ZoomIn, Plus, Minus } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItemsData: {
    name: string;
    imageUrl?: string;
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[];
  frequentItems: string[];
  onItemSelect: (itemName: string, quantity: number, imageUrl?: string) => void;
  onDeleteFromHistory: (itemName: string) => void;
}

export function HistoryModal({ 
  isOpen, 
  onClose, 
  historyItemsData, 
  frequentItems,
  onItemSelect,
  onDeleteFromHistory 
}: HistoryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<{[itemName: string]: number}>({});

  // לוג נתוני היסטוריה כשהמודל נפתח
  useEffect(() => {
    if (isOpen) {
      console.log('===== מודל היסטוריה =====');
      console.log(`נפתח מודל היסטוריה עם ${historyItemsData.length} פריטים`);
      
      if (historyItemsData.length > 0) {
        console.log('פריטים בהיסטוריה:');
        historyItemsData.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} - נקנה ${item.purchaseCount || 0} פעמים, תאריך אחרון: ${item.lastPurchaseDate ? formatLogDate(item.lastPurchaseDate) : 'לא ידוע'}`);
        });
      } else {
        console.log('אין פריטים בהיסטוריה');
      }
      console.log('========================');
    }
  }, [isOpen, historyItemsData]);

  // פורמט תאריך ללוגים - יותר פשוט
  const formatLogDate = (date?: Date) => {
    if (!date) return 'לא ידוע';
    return date.toLocaleDateString('he-IL');
  };

  // פורמט תאריך לתצוגה - מפורט יותר
  const formatDate = (date?: Date) => {
    if (!date) return 'לא ידוע';
    
    try {
      return new Intl.DateTimeFormat('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('שגיאה בפורמט תאריך:', error, date);
      // החזרת פורמט פשוט יותר במקרה של שגיאה
      return date.toLocaleDateString('he-IL');
    }
  };

  const filteredItems = historyItemsData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // קבלת הכמות של פריט, עם ברירת מחדל 1
  const getQuantity = (itemName: string) => {
    return quantities[itemName] || 1;
  };

  // עדכון הכמות של פריט
  const updateQuantity = (itemName: string, value: number) => {
    // וידוא שהכמות היא תמיד חיובית
    const newValue = Math.max(1, value);
    setQuantities({ ...quantities, [itemName]: newValue });
  };

  // הוספת פריט עם הכמות הנבחרת
  const handleAddItem = (itemName: string, imageUrl?: string) => {
    console.log(`מוסיף פריט מההיסטוריה: ${itemName}, כמות: ${getQuantity(itemName)}`);
    onItemSelect(itemName, getQuantity(itemName), imageUrl);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="absolute inset-x-4 inset-y-16 bottom-16 sm:inset-x-8 md:inset-x-20 md:inset-y-24 md:bottom-24 bg-white rounded-lg shadow-xl outline-none overflow-hidden"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
    >
      <div className="h-full flex flex-col">
        {/* כותרת */}
        <div className="flex justify-between items-center p-3 border-b">
          <h2 className="text-xl font-bold">היסטוריית קניות</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* חיפוש */}
        <div className="p-3 border-b">
          <input
            type="search"
            placeholder="חיפוש מוצרים..."
            className="w-full p-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* רשימת פריטים */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                {item.imageUrl && (
                  <div className="relative h-24">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-t-lg cursor-pointer"
                      onClick={() => setSelectedImage(item.imageUrl || null)}
                    />
                    <button
                      onClick={() => setSelectedImage(item.imageUrl || null)}
                      className="absolute bottom-1 right-1 p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                      aria-label="הגדל תמונה"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="p-2">
                  <h3 className="text-sm font-semibold mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    נקנה: {formatDate(item.lastPurchaseDate)}
                  </p>
                  
                  {/* בחירת כמות */}
                  <div className="flex items-center mb-2 bg-gray-50 rounded p-1.5">
                    <span className="text-xs text-gray-700 ml-1">כמות:</span>
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.name, getQuantity(item.name) - 1)}
                        className="px-1 py-0.5 text-gray-500 hover:bg-gray-100"
                        aria-label="הפחת כמות"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={getQuantity(item.name)}
                        onChange={(e) => updateQuantity(item.name, parseInt(e.target.value) || 1)}
                        className="w-8 text-center border-x py-0.5 text-sm"
                      />
                      <button
                        onClick={() => updateQuantity(item.name, getQuantity(item.name) + 1)}
                        className="px-1 py-0.5 text-gray-500 hover:bg-gray-100"
                        aria-label="הוסף כמות"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAddItem(item.name, item.imageUrl)}
                      className="flex-1 bg-blue-500 text-white py-1 px-2 rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      הוסף
                    </button>
                    <button
                      onClick={() => onDeleteFromHistory(item.name)}
                      className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                      aria-label="מחק מההיסטוריה"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* מודל תמונה מוגדלת */}
      <Modal
        isOpen={!!selectedImage}
        onRequestClose={() => setSelectedImage(null)}
        className="fixed inset-0 flex items-center justify-center z-[60] p-4 pb-24 overflow-hidden"
        overlayClassName="fixed inset-0 bg-black bg-opacity-80 z-[60]"
      >
        <div className="relative w-full max-w-2xl max-h-[85vh] my-auto overflow-y-auto flex flex-col items-center scrollbar-hide">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-[70] shadow-lg"
            aria-label="סגור תמונה"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* כותרת */}
          <div className="w-full text-center mb-4 px-2">
            <h3 className="text-2xl font-bold text-white drop-shadow">תמונת מוצר</h3>
          </div>

          {/* תמונה מוגדלת */}
          <div className="w-full mb-6">
            <img
              src={selectedImage || ''}
              alt="תמונה מוגדלת"
              className="w-full rounded-lg shadow-lg"
              style={{ maxHeight: '75vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      </Modal>
    </Modal>
  );
} 