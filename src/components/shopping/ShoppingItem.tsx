import React, { useState } from 'react';
import { ShoppingCart, AlertCircle, MinusCircle, X, Edit, Camera, RefreshCw } from 'lucide-react';
import { Item } from '../../types/shopping';
import Modal from 'react-modal';

interface ShoppingItemProps {
  item: Item;
  onDelete: (id: string) => void;
  onEditQuantity: (item: Item) => void;
  onToggleStatus: (id: string, status: Item['status']) => void;
  onUploadImage: (file: File, itemId: string) => Promise<string>;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = React.memo(({ 
  item, 
  onDelete, 
  onEditQuantity, 
  onToggleStatus,
  onUploadImage
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
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
    <div className={`flex items-center gap-3 p-3 rounded-lg shadow ${getItemBackgroundColor(item.status)} relative border-b border-gray-100`}>
      <div className="flex-1 flex items-start gap-2">
        {/* תמונת המוצר */}
        <div className="flex-shrink-0">
          {item.imageUrl ? (
            <div className="relative group w-14 h-14">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover rounded cursor-pointer transition-transform duration-200 group-hover:scale-105" 
                onClick={() => setIsImageModalOpen(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 flex items-center justify-center border rounded border-gray-200 bg-gray-50">
              <label className="flex items-center justify-center cursor-pointer w-full h-full">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Camera className={`${isUploading ? 'text-gray-400 animate-pulse' : 'text-gray-400'}`} size={20} />
              </label>
            </div>
          )}
        </div>

        {/* פרטי המוצר */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">{item.name}</span>
                {/* תיבת כמות בולטת */}
                <div className="inline-flex items-center bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                  <span className="font-semibold text-blue-700">{item.quantity}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onEditQuantity(item)}
              className="p-1 text-gray-400 hover:text-blue-500 flex-shrink-0"
              aria-label="ערוך כמות"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
          
          {/* כפתורי פעולה */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => handleStatusToggle('inCart')}
                className={`p-1.5 rounded-full hover:bg-green-100 ${
                  item.status === 'inCart' ? 'bg-green-100' : ''
                }`}
                aria-label="סמן כנמצא בעגלה"
              >
                <ShoppingCart className={`w-4 h-4 ${
                  item.status === 'inCart' ? 'text-green-500' : 'text-gray-400'
                }`} />
              </button>
              
              <button
                onClick={() => handleStatusToggle('partial')}
                className={`p-1.5 rounded-full hover:bg-yellow-100 ${
                  item.status === 'partial' ? 'bg-yellow-100' : ''
                }`}
                aria-label="סמן כנלקח חלקית"
              >
                <MinusCircle className={`w-4 h-4 ${
                  item.status === 'partial' ? 'text-yellow-500' : 'text-gray-400'
                }`} />
              </button>
              
              <button
                onClick={() => handleStatusToggle('missing')}
                className={`p-1.5 rounded-full hover:bg-red-100 ${
                  item.status === 'missing' ? 'bg-red-100' : ''
                }`}
                aria-label="סמן כחסר במלאי"
              >
                <AlertCircle className={`w-4 h-4 ${
                  item.status === 'missing' ? 'text-red-500' : 'text-gray-400'
                }`} />
              </button>
            </div>
            
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 rounded-full hover:bg-gray-100"
              aria-label="מחק פריט"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
      
      {/* מודל תמונה מוגדלת - עם z-index גבוה ותמיכה בגרירה */}
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={() => setIsImageModalOpen(false)}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-90 z-50"
        contentLabel={`תמונה של ${item.name}`}
      >
        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-2 right-2 p-3 rounded-full bg-white shadow-md hover:bg-gray-100 z-50"
            aria-label="סגור"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
          
          <div className="bg-white p-4 rounded-lg shadow-xl overflow-hidden max-w-full max-h-full animate-scale-up">
            <h3 className="text-xl font-semibold text-center mb-4">{item.name}</h3>
            <div className="overflow-auto max-h-[70vh]">
              <img 
                src={item.imageUrl || ''} 
                alt={item.name} 
                className="max-w-full max-h-full object-contain rounded-md" 
                style={{ minHeight: '200px' }}
              />
            </div>

            {/* כפתור להחלפת התמונה */}
            <div className="mt-4 flex justify-center">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <RefreshCw className="w-5 h-5" />
                <span className="font-medium">
                  {isUploading ? 'מעלה תמונה...' : 'החלף תמונה'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

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
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes scale-up {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .animate-scale-up {
    animation: scale-up 0.2s ease-out forwards;
  }
`;
document.head.appendChild(styleElement); 