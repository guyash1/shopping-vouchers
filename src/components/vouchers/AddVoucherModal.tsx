import React, { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Upload, Camera, ShoppingCart, Utensils, Droplet, ShoppingBag, Gift } from 'lucide-react';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { aiService } from '../../services/ai.service';

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

// טיפוסי הטופס
interface AddVoucherFormData {
  storeName: string;
  amount: string;
  expiryDate: string;
  customStoreName: string;
  category: string;
  isPartial: boolean;
}

interface AddVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVoucher: (voucherData: {
    storeName: string;
    amount: number;
    expiryDate?: string;
    imageFile?: File;
    category?: string;
    isPartial?: boolean;
    remainingAmount?: number;
  }) => Promise<void>;
}

export function AddVoucherModal({ isOpen, onClose, onAddVoucher }: AddVoucherModalProps) {
  // הגדרת הטופס עם ערכי ברירת מחדל
  const form = useForm<AddVoucherFormData>({
    defaultValues: {
      storeName: SUPERMARKET_PROVIDERS[0],
      amount: '',
      expiryDate: '',
      customStoreName: '',
      category: VOUCHER_CATEGORIES[0].id,
      isPartial: false,
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = form;

  // שמירה אוטומטית של הטופס
  const { clearPersistedData, wrapSubmitHandler } = useFormPersistence(form, {
    storageKey: 'add-voucher-form',
    excludeFields: ['imageFile'], // לא שומרים קבצים
    clearOnSubmit: true
  });

  // מעקב אחר שינויים בשדות
  const watchedCategory = watch('category');
  const watchedStoreName = watch('storeName');
  
  // State נוסף שלא חלק מהטופס
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validatingImage, setValidatingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // שמירה וטעינה של תמונה ב-localStorage (בנפרד מהטופס)
  useEffect(() => {
    if (isOpen) {
      // טעינת תמונה שמורה בפתיחת המודל
      try {
        const savedImageData = localStorage.getItem('addVoucherModal_imageData');
        if (savedImageData) {
          const { preview, fileName, fileType } = JSON.parse(savedImageData);
          setImagePreview(preview);
          
          // שחזור File object מה-base64
          if (preview && fileName && fileType) {
            fetch(preview)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], fileName, { type: fileType });
                setSelectedImage(file);
              })
              .catch(error => {
                console.error('שגיאה בשחזור קובץ תמונה:', error);
              });
          }
        }
      } catch (error) {
        console.error('שגיאה בטעינת תמונה שמורה:', error);
        // ניקוי נתונים פגומים
        localStorage.removeItem('addVoucherModal_imageData');
      }
    }
  }, [isOpen]);

  // שמירת התמונה כל פעם שהיא משתנה
  useEffect(() => {
    if (imagePreview && selectedImage) {
      try {
        const imageData = {
          preview: imagePreview,
          fileName: selectedImage.name,
          fileType: selectedImage.type,
          fileSize: selectedImage.size
        };
        localStorage.setItem('addVoucherModal_imageData', JSON.stringify(imageData));
      } catch (error) {
        console.error('שגיאה בשמירת תמונה:', error);
      }
    }
  }, [imagePreview, selectedImage]);

  // פונקציה להסרת תמונה
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    
    // ניקוי localStorage
    try {
      localStorage.removeItem('addVoucherModal_imageData');
    } catch (error) {
      console.error('שגיאה בניקוי תמונה שמורה:', error);
    }
    
    // איפוס input fields
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // פונקציה לסגירת המודל עם ניקוי תמונה
  const handleClose = () => {
    handleRemoveImage();
    onClose();
  };

  if (!isOpen) return null;

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

  // טיפול בשינוי תמונה
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // ולידציה בסיסית בצד לקוח
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('סוג קובץ לא נתמך. רק JPEG, PNG, GIF ו-WEBP מותרים');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        alert('קובץ גדול מדי (מקסימום 3MB). נסה לכווץ את התמונה.');
        return;
      }

      setValidatingImage(true);
      
      // Read file as data URL for AI validation
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        
        // Validate with AI before showing preview
        try {
          const validation = await aiService.validateImage(imageDataUrl, 'voucher');
          
          if (!validation.isValid) {
            alert(`❌ התמונה לא מתאימה\n\n${validation.reason}\n\nאנא העלה תמונה של שובר/קופון עם ברקוד או קוד.`);
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

  // טיפול בשליחת הטופס עם React Hook Form
  const onSubmit = wrapSubmitHandler(async (data: AddVoucherFormData) => {
    try {
      let finalStoreName = '';
      
      // קביעת שם השובר על פי הקטגוריה
      if (data.category === 'supermarket') {
        finalStoreName = data.storeName === "אחר" ? data.customStoreName : data.storeName;
        if (data.storeName === "אחר" && !data.customStoreName.trim()) {
          alert('יש להזין שם רשת');
          return;
        }
      } else {
        // בשאר הקטגוריות שם השובר הוא הערך שהוזן בשדה הטקסט
        finalStoreName = data.customStoreName;
        if (!data.customStoreName.trim()) {
          alert('יש להזין שם שובר');
          return;
        }
      }
      
      const parsedAmount = parseFloat(data.amount);
      if (!parsedAmount || parsedAmount <= 0) {
        alert('סכום חייב להיות גדול מאפס');
        return;
      }

      // בדיקה חוזרת לתמונה אם קיימת
      if (selectedImage) {
        if (!ALLOWED_TYPES.includes(selectedImage.type)) {
          alert('סוג קובץ לא נתמך. רק JPEG, PNG, GIF ו-WEBP מותרים');
          return;
        }
        if (selectedImage.size > MAX_IMAGE_SIZE) {
          alert('קובץ גדול מדי (מקסימום 3MB).');
          return;
        }
      }

      await onAddVoucher({
        storeName: finalStoreName,
        amount: parsedAmount,
        expiryDate: data.expiryDate,
        imageFile: selectedImage || undefined,
        category: data.category,
        isPartial: data.isPartial,
        // אם זה שובר נצבר, הסכום ההתחלתי הוא מלוא הסכום
        remainingAmount: data.isPartial ? parsedAmount : undefined
      });
      
      // איפוס הטופס והתמונה
      reset();
      setSelectedImage(null);
      setImagePreview(null);
      clearPersistedData(); // ניקוי הנתונים השמורים רק אחרי שליחה מוצלחת
      
      // ניקוי תמונה שמורה
      try {
        localStorage.removeItem('addVoucherModal_imageData');
      } catch (error) {
        console.error('שגיאה בניקוי תמונה שמורה:', error);
      }
      
      // סגירת המודל (ללא ניקוי תמונה כי הצלחנו להוסיף)
      onClose();
    } catch (error) {
      console.error('שגיאה בהוספת שובר:', error);
      alert('שגיאה בהוספת השובר. אנא נסה שנית.');
    }
  });

  // פונקציה שקובעת את התווית של שדה השם בהתאם לקטגוריה
  const getStoreNameLabel = () => {
    switch (watchedCategory) {
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
        <button onClick={handleClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6 text-center">הוספת שובר חדש</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* שדה קטגוריה */}
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
            <div className="grid grid-cols-5 gap-2">
              {VOUCHER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 border rounded-lg ${
                    watchedCategory === cat.id 
                      ? 'bg-blue-100 border-blue-400' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    const prevCategory = watchedCategory;
                    setValue('category', cat.id);

                    // אם עוברים לקטגוריית סופרמרקט, תמיד נאפס לברירת מחדל
                    if (cat.id === 'supermarket') {
                      setValue('storeName', SUPERMARKET_PROVIDERS[0]);
                      setValue('customStoreName', '');
                    } 
                    // אם עוברים מקטגוריה שאינה סופרמרקט לקטגוריה שאינה סופרמרקט
                    else if (prevCategory !== 'supermarket' && cat.id !== 'supermarket') {
                      // נשמור את הערך הקיים
                      // לא עושים כלום כי customStoreName כבר מכיל את הערך הנכון
                    }
                    // אם עוברים מסופרמרקט לקטגוריה אחרת
                    else if (prevCategory === 'supermarket') {
                      setValue('customStoreName', '');
                    }
                  }}
                >
                  <div className={`p-2 rounded-full ${watchedCategory === cat.id ? 'bg-blue-200' : 'bg-gray-100'}`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs mt-1">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* שדה סוג שובר - חד פעמי או נצבר */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג שובר</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-lg ${
                  !watch('isPartial')
                    ? 'bg-blue-100 border-blue-400'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setValue('isPartial', false)}
              >
                <span className="font-medium">חד פעמי</span>
                <span className="text-xs mt-1 text-gray-500">השובר יימחק לאחר שימוש מלא</span>
              </button>
              <button
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-lg ${
                  watch('isPartial')
                    ? 'bg-blue-100 border-blue-400'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setValue('isPartial', true)}
              >
                <span className="font-medium">נצבר</span>
                <span className="text-xs mt-1 text-gray-500">ניתן לשימוש חלקי פעמים רבות</span>
              </button>
            </div>
          </div>
          
          {/* שדה שם השובר - תלוי בקטגוריה */}
           {watchedCategory === 'supermarket' ? (
            // אפשרויות רשתות סופרמרקט
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                {getStoreNameLabel()} <span className="text-red-500">*</span>
              </label>
              <select
                id="storeName"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                {...register('storeName', { required: 'יש לבחור רשת' })}
                dir="rtl"
              >
                {SUPERMARKET_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              
              {/* שדה שם רשת מותאם אישית */}
              {watchedStoreName === "אחר" && (
                <div className="mt-2">
                  <label htmlFor="customStoreName" className="block text-sm font-medium text-gray-700 mb-1">
                    שם הרשת <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customStoreName"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.customStoreName ? 'border-red-300' : 'border-gray-200'}`}
                    {...register('customStoreName', { 
                      required: watchedStoreName === "אחר" ? 'יש להזין שם רשת' : false 
                    })}
                    placeholder="הזן שם רשת..."
                    dir="rtl"
                  />
                  {errors.customStoreName && (
                    <p className="mt-1 text-xs text-red-600">{errors.customStoreName.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // שדה טקסט רגיל לשאר הקטגוריות
            <div>
              <label htmlFor="customStoreName" className="block text-sm font-medium text-gray-700 mb-1">
                {getStoreNameLabel()} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="customStoreName"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.customStoreName ? 'border-red-300' : 'border-gray-200'}`}
                {...register('customStoreName', { 
                  required: watchedCategory !== 'supermarket' ? 'יש להזין שם שובר' : false 
                })}
                placeholder={`הזן ${getStoreNameLabel()}...`}
              />
              {errors.customStoreName && (
                <p className="mt-1 text-xs text-red-600">{errors.customStoreName.message}</p>
              )}
            </div>
          )}
          
          {/* שדה סכום */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              סכום (₪) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              min="0.01"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.amount ? 'border-red-300' : 'border-gray-200'}`}
              {...register('amount', { 
                required: 'יש להזין סכום',
                min: { value: 0.01, message: 'סכום חייב להיות גדול מאפס' }
              })}
              placeholder="לדוגמה: 50"
              dir="rtl"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>
          
          {/* שדה תאריך תפוגה */}
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">תאריך תפוגה (אופציונלי)</label>
            <input
              type="date"
              id="expiryDate"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              {...register('expiryDate')}
              dir="rtl"
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
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  onClick={handleRemoveImage}
                  title="הסר תמונה"
                  aria-label="הסר תמונה"
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
              onClick={handleClose}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={isSubmitting || validatingImage}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || validatingImage}
            >
              {isSubmitting ? 'מוסיף...' : 'הוספת שובר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 