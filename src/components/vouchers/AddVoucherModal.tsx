import React, { useState, useRef } from 'react';
import { X, Upload, Camera, ShoppingCart, Utensils, Droplet, ShoppingBag, Gift } from 'lucide-react';

// קטגוריות שוברים
const VOUCHER_CATEGORIES = [
  { id: "supermarket", name: "סופרמרקט", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: "restaurant", name: "מסעדות", icon: <Utensils className="w-4 h-4" /> },
  { id: "fuel", name: "דלק", icon: <Droplet className="w-4 h-4" /> },
  { id: "fashion", name: "אופנה", icon: <ShoppingBag className="w-4 h-4" /> },
  { id: "general", name: "כללי", icon: <Gift className="w-4 h-4" /> }
];

// רשימת ספקי שוברים לסופרמרקט
const SUPERMARKET_PROVIDERS = ["שופרסל", "ויקטורי", "רמי לוי", "יינות ביתן", "אושר עד", "מגה", "אחר"];

interface AddVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVoucher: (voucherData: {
    storeName: string;
    amount: number;
    expiryDate?: string;
    imageFile?: File;
    category?: string;
  }) => Promise<void>;
}

export function AddVoucherModal({ isOpen, onClose, onAddVoucher }: AddVoucherModalProps) {
  const [storeName, setStoreName] = useState<string>(SUPERMARKET_PROVIDERS[0]);
  const [amount, setAmount] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [customStoreName, setCustomStoreName] = useState<string>('');
  const [category, setCategory] = useState<string>(VOUCHER_CATEGORIES[0].id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // טיפול בשינוי תמונה
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // יצירת URL לתצוגה מקדימה של התמונה
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // טיפול בשליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      alert('יש למלא את סכום השובר');
      return;
    }
    
    let finalStoreName = '';
    
    // קביעת שם השובר על פי הקטגוריה
    if (category === 'supermarket') {
      finalStoreName = storeName === "אחר" ? customStoreName : storeName;
      if (storeName === "אחר" && !customStoreName.trim()) {
        alert('יש להזין שם רשת');
        return;
      }
    } else {
      // בשאר הקטגוריות שם השובר הוא הערך שהוזן בשדה הטקסט
      finalStoreName = customStoreName;
      if (!customStoreName.trim()) {
        alert('יש להזין שם שובר');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      await onAddVoucher({
        storeName: finalStoreName,
        amount: parseFloat(amount),
        expiryDate,
        imageFile: selectedImage || undefined,
        category
      });
      
      // איפוס הטופס
      setStoreName(SUPERMARKET_PROVIDERS[0]);
      setAmount('');
      setExpiryDate('');
      setSelectedImage(null);
      setImagePreview(null);
      setCustomStoreName('');
      setCategory(VOUCHER_CATEGORIES[0].id);
      
      // סגירת המודל
      onClose();
    } catch (error) {
      console.error('שגיאה בהוספת שובר:', error);
      alert('שגיאה בהוספת השובר. אנא נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  // פונקציה שקובעת את התווית של שדה השם בהתאם לקטגוריה
  const getStoreNameLabel = () => {
    switch (category) {
      case 'supermarket': return 'רשת סופרמרקט';
      case 'restaurant': return 'שם מסעדה';
      case 'fuel': return 'חברת דלק';
      case 'fashion': return 'חנות אופנה';
      default: return 'שם השובר';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pb-16 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-xl my-auto">
        <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6 text-center">הוסף שובר חדש</h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* שדה קטגוריה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
            <div className="grid grid-cols-5 gap-2">
              {VOUCHER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 border rounded-lg ${
                    category === cat.id 
                      ? 'bg-blue-100 border-blue-400' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setCategory(cat.id);
                    // אם עוברים מקטגוריית סופרמרקט לקטגוריה אחרת, ניקוי שדות
                    if (cat.id !== 'supermarket') {
                      setStoreName(SUPERMARKET_PROVIDERS[0]);
                      setCustomStoreName(''); // ניקוי השדה המותאם אישית
                    }
                  }}
                >
                  <div className={`p-2 rounded-full ${category === cat.id ? 'bg-blue-200' : 'bg-gray-100'}`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs mt-1">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* שדה שם השובר - תלוי בקטגוריה */}
          {category === 'supermarket' ? (
            // אפשרויות רשתות סופרמרקט
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">{getStoreNameLabel()}</label>
              <select
                id="storeName"
                className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              >
                {SUPERMARKET_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              
              {/* שדה שם רשת מותאם אישית */}
              {storeName === "אחר" && (
                <div className="mt-2">
                  <label htmlFor="customStoreName" className="block text-sm font-medium text-gray-700 mb-1">שם הרשת</label>
                  <input
                    type="text"
                    id="customStoreName"
                    className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={customStoreName}
                    onChange={(e) => setCustomStoreName(e.target.value)}
                    placeholder="הזן שם רשת..."
                  />
                </div>
              )}
            </div>
          ) : (
            // שדה טקסט רגיל לשאר הקטגוריות
            <div>
              <label htmlFor="customStoreName" className="block text-sm font-medium text-gray-700 mb-1">{getStoreNameLabel()}</label>
              <input
                type="text"
                id="customStoreName"
                className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={customStoreName}
                onChange={(e) => setCustomStoreName(e.target.value)}
                placeholder={`הזן ${getStoreNameLabel()}...`}
              />
            </div>
          )}
          
          {/* שדה סכום */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">סכום (₪)</label>
            <input
              type="number"
              id="amount"
              min="0"
              step="0.01"
              className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="לדוגמה: 50"
            />
          </div>
          
          {/* שדה תאריך תפוגה */}
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">תאריך תפוגה (אופציונלי)</label>
            <input
              type="date"
              id="expiryDate"
              className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          
          {/* שדה העלאת תמונה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תמונת השובר</label>
            
            {imagePreview ? (
              <div className="relative bg-gray-50 rounded-lg p-2 border border-gray-200">
                <img
                  src={imagePreview}
                  alt="תצוגה מקדימה של השובר"
                  className="w-full h-40 object-contain rounded-lg"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (cameraInputRef.current) cameraInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span>העלה תמונה</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Camera className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span>צלם תמונה</span>
                </button>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>
          
          {/* כפתורי שליחה וביטול */}
          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              {loading ? 'מוסיף...' : 'הוסף שובר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 