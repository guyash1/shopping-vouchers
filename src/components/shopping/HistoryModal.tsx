import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import { X, ZoomIn, Plus, Minus, Search, Clock, ShoppingCart, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Disclosure, Transition } from '@headlessui/react';

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
  currentItems: string[]; // רשימת שמות המוצרים שכבר ברשימת הקניות
}

export function HistoryModal({ 
  isOpen, 
  onClose, 
  historyItemsData, 
  frequentItems,
  onItemSelect,
  onDeleteFromHistory,
  currentItems
}: HistoryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<{[itemName: string]: number}>({});
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    return {
      totalItems: historyItemsData.length,
      lastPurchaseDate: historyItemsData[0]?.lastPurchaseDate
    };
  }, [historyItemsData]);

  // קיבוץ מוצרים לפי תאריך קנייה
  const purchasesByDate = useMemo(() => {
    const grouped = new Map<string, typeof historyItemsData>();
    
    // מיון המוצרים לפי תאריך קנייה
    historyItemsData
      .filter(item => item.lastPurchaseDate)
      .forEach(item => {
        const dateStr = item.lastPurchaseDate!.toLocaleDateString('he-IL');
        const existing = grouped.get(dateStr) || [];
        grouped.set(dateStr, [...existing, item]);
      });

    // המרה למערך ומיון לפי תאריך (מהחדש לישן)
    return Array.from(grouped.entries())
      .sort(([dateA], [dateB]) => {
        const a = new Date(dateA.split('.').reverse().join('-'));
        const b = new Date(dateB.split('.').reverse().join('-'));
        return b.getTime() - a.getTime();
      });
  }, [historyItemsData]);





  // סינון פריטים לפי חיפוש
  const filteredItems = useMemo(() => {
    return historyItemsData.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyItemsData, searchTerm]);

  // מיון וסינון פריטים
  const sortedAndFilteredItems = useMemo(() => {
    let items = [...filteredItems];
    
    // סינון לפי תאריך אם נבחר
    if (selectedDate) {
      items = items.filter(item => 
        item.lastPurchaseDate?.toLocaleDateString('he-IL') === selectedDate
      );
    }
    
    // מיון לפי פופולריות או תאריך
    if (sortBy === 'popularity') {
      items.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
    } else {
      items.sort((a, b) => {
        const dateA = a.lastPurchaseDate?.getTime() || 0;
        const dateB = b.lastPurchaseDate?.getTime() || 0;
        return dateB - dateA;
      });
    }

    return items;
  }, [filteredItems, sortBy, selectedDate]);

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

        {/* חיפוש וסינון */}
        <div className="p-3 border-b">
          <div className="flex gap-3 flex-wrap">
            {/* חיפוש */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="search"
                  placeholder="חיפוש מוצרים..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* סינון */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>לפי תאריך</span>
                </div>
              </button>
              <button
                onClick={() => setSortBy('popularity')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'popularity' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>לפי כמות קניות</span>
                </div>
              </button>
            </div>
          </div>

          {/* סטטיסטיקות וסינון */}
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              <span>{stats.totalItems} פריטים</span>
            </div>

            {/* דרופדאון לבחירת תאריך */}
            <div className="flex-1 flex justify-end gap-2">
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border flex items-center gap-2 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>הצג הכל</span>
                </button>
              )}
              <Disclosure>
                {({ open }) => (
                  <div className="relative">
                    <Disclosure.Button className={`px-3 py-1 text-sm ${selectedDate ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg border flex items-center gap-2 transition-colors`}>
                      <Calendar className="w-4 h-4" />
                      <span>{selectedDate || 'הצג לפי תאריך'}</span>
                      {open ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Disclosure.Button>

                    <Transition
                      enter="transition duration-100 ease-out"
                      enterFrom="transform scale-95 opacity-0"
                      enterTo="transform scale-100 opacity-100"
                      leave="transition duration-75 ease-out"
                      leaveFrom="transform scale-100 opacity-100"
                      leaveTo="transform scale-95 opacity-0"
                    >
                      <Disclosure.Panel className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-10">
                        <div className="p-2 max-h-64 overflow-auto">
                          {purchasesByDate.map(([date, items]) => (
                            <button
                              key={date}
                              onClick={() => {
                                setSelectedDate(selectedDate === date ? null : date);
                              }}
                              className={`w-full px-3 py-2 text-right hover:bg-gray-50 rounded flex items-center justify-between ${selectedDate === date ? 'bg-blue-50 text-blue-700' : ''}`}
                            >
                              <span>{date}</span>
                              <span className="text-sm text-gray-500">
                                ({items.length} {items.length === 1 ? 'פריט' : 'פריטים'})
                              </span>
                            </button>
                          ))}
                        </div>
                      </Disclosure.Panel>
                    </Transition>
                  </div>
                )}
              </Disclosure>
            </div>
          </div>
        </div>

        {/* רשימת פריטים */}
        <div className="flex-1 overflow-auto px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAndFilteredItems.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`relative group ${currentItems.includes(item.name) ? 'opacity-75' : ''}`}>
                  {/* סימון אם המוצר כבר ברשימה */}
                  {currentItems.includes(item.name) && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        כבר ברשימה
                      </div>
                    </div>
                  )}

                  {/* תמונת המוצר */}
                  <div className="h-32 bg-gray-100 rounded-t-lg overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onClick={() => setSelectedImage(item.imageUrl || null)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingCart className="w-8 h-8" />
                      </div>
                    )}
                    {item.imageUrl && (
                      <button
                        onClick={() => setSelectedImage(item.imageUrl || null)}
                        className="absolute top-2 left-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="הגדל תמונה"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* פרטי המוצר */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-medium line-clamp-1">{item.name}</h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{item.purchaseCount || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(item.lastPurchaseDate)}</span>
                    </div>

                    {!currentItems.includes(item.name) && (
                      <>
                        {/* בחירת כמות */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm">כמות:</span>
                          <div className="flex items-center bg-gray-50 rounded-lg border">
                            <button
                              onClick={() => updateQuantity(item.name, getQuantity(item.name) - 1)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-r-lg transition-colors"
                              aria-label="הפחת כמות"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={getQuantity(item.name)}
                              onChange={(e) => updateQuantity(item.name, parseInt(e.target.value) || 1)}
                              className="w-10 text-center bg-transparent border-x py-1 text-sm"
                            />
                            <button
                              onClick={() => updateQuantity(item.name, getQuantity(item.name) + 1)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-l-lg transition-colors"
                              aria-label="הוסף כמות"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* כפתורי פעולה */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddItem(item.name, item.imageUrl)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white py-1.5 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>הוסף לרשימה</span>
                          </button>
                          <button
                            onClick={() => setItemToDelete(item.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="מחק מההיסטוריה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
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

      {/* מודל אישור מחיקה */}
      <Modal
        isOpen={!!itemToDelete}
        onRequestClose={() => setItemToDelete(null)}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl outline-none p-6 max-w-sm w-full mx-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-[70]"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">האם למחוק מההיסטוריה?</h3>
          <p className="text-gray-600 mb-6">
            האם אתה בטוח שברצונך למחוק את "{itemToDelete}" מההיסטוריה? פעולה זו תמחק גם את התמונה המשויכת (אם קיימת).
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                if (itemToDelete) {
                  onDeleteFromHistory(itemToDelete);
                  setItemToDelete(null);
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              כן, מחק
            </button>
            <button
              onClick={() => setItemToDelete(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
} 