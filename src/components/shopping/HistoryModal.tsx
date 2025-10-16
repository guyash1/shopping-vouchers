import React, { useState, useMemo } from 'react';
import Modal from 'react-modal';
import { X, Plus, Minus, Search, Clock, ShoppingCart, Trash2, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Disclosure, Transition } from '@headlessui/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { storageService } from '../../services/firebase';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItemsData: {
    id: string;
    name: string;
    imageUrl?: string;
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[];
  frequentItems: string[];
  onItemSelect: (itemName: string, quantity: number, imageUrl?: string) => void;
  onDeleteFromHistory: (itemName: string) => void;
  handleUploadImage: (file: File, itemId: string) => Promise<string>;
  onHistoryUpdate: (items: {
    id: string;
    name: string;
    imageUrl?: string;
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[]) => void;
  currentItems: string[]; // רשימת שמות המוצרים שכבר ברשימת הקניות
}

export function HistoryModal({ 
  isOpen, 
  onClose, 
  historyItemsData, 
  frequentItems,
  onItemSelect,
  onDeleteFromHistory,
  currentItems,
  handleUploadImage,
  onHistoryUpdate
}: HistoryModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ url: string; itemId: string } | null>(null);
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
                  placeholder="חיפוש"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-2 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
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
                  <span>פופולאריות</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  <div className="h-28 bg-gray-100 rounded-t-lg overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-zoom-in"
                        onClick={() => setSelectedImage(item.imageUrl || null)}
                        loading="lazy"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const buttonSpan = (e.target as HTMLInputElement)?.parentElement?.querySelector('span');
                              const originalText = buttonSpan?.textContent || 'הוספת תמונה';
                              
                              if (buttonSpan) {
                                buttonSpan.textContent = 'מעלה תמונה...';
                              }
                              
                              try {
                                const imageUrl = await handleUploadImage(file, item.id);
                                // עדכון מקומי של התמונה
                                const updatedItems = historyItemsData.map(i => 
                                  i.id === item.id ? { ...i, imageUrl } : i
                                );
                                
                                // הצגת אנימציית הצלחה
                                if (buttonSpan) {
                                  buttonSpan.textContent = '✓ התמונה הועלתה';
                                  setTimeout(() => {
                                    if (buttonSpan) {
                                      buttonSpan.textContent = originalText;
                                    }
                                  }, 2000);
                                }
                                
                                // עדכון הסטייט
                                onHistoryUpdate(updatedItems);
                              } catch (error) {
                                console.error('שגיאה בהעלאת תמונה:', error);
                                if (buttonSpan) {
                                  buttonSpan.textContent = '× שגיאה בהעלאה';
                                  setTimeout(() => {
                                    if (buttonSpan) {
                                      buttonSpan.textContent = originalText;
                                    }
                                  }, 2000);
                                }
                              }
                            }
                          };
                          input.click();
                        }}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <ShoppingCart className="w-8 h-8" />
                        <span className="text-xs">הוספת תמונה</span>
                      </button>
                    )}
                    {/* הסרת כפתור הזום כי אפשר ללחוץ על התמונה ישירות */}
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
                              aria-label="הוספת כמות"
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
                            <span>הוספה לרשימה</span>
                          </button>
                          <button
                            onClick={() => setItemToDelete(item.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="מחיקה מההיסטוריה"
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
          {/* כפתורי פעולה */}
          <div className="absolute top-4 right-4 flex gap-2 z-[70]">
            <button
              onClick={() => setSelectedImage(null)}
              className="bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors shadow-lg"
              aria-label="סגור תמונה"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="absolute top-4 left-4 flex gap-2 z-[70]">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    try {
                      // מציאת המוצר המתאים
                      const item = historyItemsData.find(i => i.imageUrl === selectedImage);
                      if (item) {
                        const imageUrl = await handleUploadImage(file, item.id);
                        const updatedItems = historyItemsData.map(i => 
                          i.id === item.id ? { ...i, imageUrl } : i
                        );
                        onHistoryUpdate(updatedItems);
                        setSelectedImage(imageUrl);
                      }
                    } catch (error) {
                      console.error('שגיאה בהעלאת תמונה:', error);
                    }
                  }
                };
                input.click();
              }}
              className="bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors shadow-lg"
              aria-label="החלף תמונה"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                const item = historyItemsData.find(i => i.imageUrl === selectedImage);
                if (item && item.imageUrl) {
                  setImageToDelete({ url: item.imageUrl, itemId: item.id });
                }
              }}
              className="bg-white rounded-full p-1.5 text-red-600 hover:bg-red-50 transition-colors shadow-lg"
              aria-label="מחיקת תמונה"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          {/* תמונה מוגדלת */}
          <div className="w-full">
            <img
              src={selectedImage || ''}
              alt="תמונה מוגדלת"
              className="w-full rounded-lg shadow-lg"
              style={{ maxHeight: '85vh', objectFit: 'contain' }}
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
            האם למחוק את "{itemToDelete}" מההיסטוריה? פעולה זו תמחק גם את התמונה המשויכת (אם קיימת).
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
              כן, מחיקה
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

      {/* מודל אישור מחיקת תמונה */}
      <Modal
        isOpen={!!imageToDelete}
        onRequestClose={() => setImageToDelete(null)}
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
                if (imageToDelete) {
                  try {
                    // מחיקת התמונה מהסטורג'
                    await storageService.deleteImage(imageToDelete.url);
                    
                    // עדכון המוצר בפיירסטור
                    const itemRef = doc(db, 'items', imageToDelete.itemId);
                    await updateDoc(itemRef, {
                      imageUrl: null
                    });
                    
                    // עדכון הסטייט
                    const updatedItems = historyItemsData.map(i => 
                      i.id === imageToDelete.itemId ? { ...i, imageUrl: undefined } : i
                    );
                    onHistoryUpdate(updatedItems);
                    setSelectedImage(null);
                    setImageToDelete(null);
                  } catch (error) {
                    console.error('שגיאה במחיקת תמונה:', error);
                  }
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              מחיקה
            </button>
            <button
              onClick={() => setImageToDelete(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              בטל
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
} 