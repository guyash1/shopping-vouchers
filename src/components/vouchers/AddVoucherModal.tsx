import React, { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Upload, Camera, ShoppingCart, Utensils, Droplet, ShoppingBag, Gift } from 'lucide-react';
import { useFormPersistence } from '../../hooks/useFormPersistence';

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
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // שמירה וטעינה של תמונה ב-localStorage (בנפרד מהטופס)
  useEffect(() => {
    if (isOpen) {
      // טעינת תמונה שמורה בפתיחת המודל
      try {
        const savedImageData = localStorage.getItem('addVoucherModal_imageData');
        if (savedImageData) {
          const { preview, fileName, fileType, fileSize } = JSON.parse(savedImageData);
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

  if (!isOpen) return null;

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

  // טיפול בשינוי תמונה
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      // יצירת URL של התמונה המקורית ופתיחת עורך
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImage(reader.result as string);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
      
      // איפוס השדה כדי שנוכל לבחור אותו קובץ שוב
      e.target.value = '';
    }
  };

  // פונקציה לשמירת התמונה החתוכה
  const handleSaveCroppedImage = (croppedImageBlob: Blob, fileName: string) => {
    // יצירת File object מה-blob
    const croppedFile = new File([croppedImageBlob], fileName, { type: croppedImageBlob.type });
    setSelectedImage(croppedFile);
    
    // יצירת preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    // סגירת העורך
    setShowImageEditor(false);
    setOriginalImage(null);
  };

  // ביטול עריכת התמונה
  const handleCancelImageEdit = () => {
    setShowImageEditor(false);
    setOriginalImage(null);
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
      
      // סגירת המודל
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
        <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6 text-center">הוסף שובר חדש</h2>
        
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
                <span className="text-xs mt-1 text-gray-500">השובר נמחק לאחר שימוש מלא</span>
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
                className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...register('storeName', { required: 'יש לבחור רשת' })}
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
                    className={`block w-full rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border ${errors.customStoreName ? 'border-red-300' : 'border-gray-300'}`}
                    {...register('customStoreName', { 
                      required: watchedStoreName === "אחר" ? 'יש להזין שם רשת' : false 
                    })}
                    placeholder="הזן שם רשת..."
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
                className={`block w-full rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border ${errors.customStoreName ? 'border-red-300' : 'border-gray-300'}`}
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
              className={`block w-full rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border ${errors.amount ? 'border-red-300' : 'border-gray-300'}`}
              {...register('amount', { 
                required: 'יש להזין סכום',
                min: { value: 0.01, message: 'סכום חייב להיות גדול מאפס' }
              })}
              placeholder="לדוגמה: 50"
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
              className="block w-full border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              {...register('expiryDate')}
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
              disabled={isSubmitting}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'מוסיף...' : 'הוסף שובר'}
            </button>
          </div>
        </form>
      </div>
      
      {/* עורך תמונה */}
      {showImageEditor && originalImage && (
        <ImageCropperModal
          imageUrl={originalImage}
          onSave={handleSaveCroppedImage}
          onCancel={handleCancelImageEdit}
        />
      )}
    </div>
  );
}

// רכיב עורך תמונה פשוט
interface ImageCropperModalProps {
  imageUrl: string;
  onSave: (blob: Blob, fileName: string) => void;
  onCancel: () => void;
}

function ImageCropperModal({ imageUrl, onSave, onCancel }: ImageCropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // ציור התמונה והמסגרת
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx) return;

    // ניקוי הקנבס
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ציור התמונה
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // ציור overlay כהה
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ניקוי אזור החיתוך
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // ציור מסגרת החיתוך
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // ציור נקודות שינוי גודל
    const handleSize = 8;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cropArea.x + cropArea.width - handleSize, cropArea.y + cropArea.height - handleSize, handleSize, handleSize);
  }, [cropArea, imageLoaded]);

  // טיפול בלחיצת עכבר
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // בדיקה אם לחצו על נקודת שינוי הגודל
    const handleSize = 8;
    const handleX = cropArea.x + cropArea.width - handleSize;
    const handleY = cropArea.y + cropArea.height - handleSize;

    if (x >= handleX && x <= handleX + handleSize && y >= handleY && y <= handleY + handleSize) {
      setIsResizing(true);
    } else if (x >= cropArea.x && x <= cropArea.x + cropArea.width && 
               y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  };

  // טיפול בתנועת עכבר
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const newX = Math.max(0, Math.min(x - dragStart.x, canvas.width - cropArea.width));
      const newY = Math.max(0, Math.min(y - dragStart.y, canvas.height - cropArea.height));
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const newWidth = Math.max(50, Math.min(x - cropArea.x, canvas.width - cropArea.x));
      const newHeight = Math.max(50, Math.min(y - cropArea.y, canvas.height - cropArea.y));
      setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
    }
  };

  // טיפול בשחרור עכבר
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // שמירת התמונה החתוכה
  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // יצירת קנבס חדש לתמונה החתוכה
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCanvas.width = cropArea.width;
    cropCanvas.height = cropArea.height;

    // חישוב יחס בין התצוגה לתמונה המקורית
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    // חיתוך התמונה
    cropCtx.drawImage(
      img,
      cropArea.x * scaleX, cropArea.y * scaleY,
      cropArea.width * scaleX, cropArea.height * scaleY,
      0, 0,
      cropArea.width, cropArea.height
    );

    // המרה ל-blob
    cropCanvas.toBlob((blob) => {
      if (blob) {
        onSave(blob, 'cropped-image.jpg');
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">עריכת תמונה</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4 text-sm text-gray-600">
          גרור את המסגרת למיקום הרצוי, וגרור את הפינה הימנית התחתונה לשינוי גודל
        </div>
        
        <div className="relative mb-6 flex justify-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="border border-gray-300 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Original"
            className="hidden"
            onLoad={() => {
              const img = imageRef.current;
              const canvas = canvasRef.current;
              if (img && canvas) {
                // חישוב יחס גובה-רוחב
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                
                if (aspectRatio > 600 / 400) {
                  canvas.width = 600;
                  canvas.height = 600 / aspectRatio;
                } else {
                  canvas.height = 400;
                  canvas.width = 400 * aspectRatio;
                }
                
                // מיקום התחלתי של מסגרת החיתוך במרכז
                setCropArea({
                  x: canvas.width / 4,
                  y: canvas.height / 4,
                  width: canvas.width / 2,
                  height: canvas.height / 2
                });
                
                setImageLoaded(true);
              }
            }}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            שמור תמונה
          </button>
        </div>
      </div>
    </div>
  );
} 