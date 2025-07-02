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
      
      {/* מודל תמונה מוגדלת - מודרני ו-responsive */}
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={() => setIsImageModalOpen(false)}
        className="fixed inset-0 flex items-center justify-center z-[60] p-4 pb-24 overflow-hidden"
        overlayClassName="fixed inset-0 bg-black bg-opacity-80 z-[60]"
        contentLabel={`תמונה של ${item.name}`}
      >
        <div className="relative w-full max-w-2xl max-h-[85vh] my-auto overflow-y-auto flex flex-col items-center scrollbar-hide">
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-[70] shadow-lg"
            aria-label="סגור תמונה"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* כותרת המוצר - עם רקע כהה */}
          <div className="w-full text-center mb-4 px-2">
            <h3 className="text-2xl font-bold text-white drop-shadow mb-2">{item.name}</h3>
            <p className="text-lg text-gray-200">כמות: {item.quantity}</p>
          </div>

          {/* תמונה מוגדלת */}
          <div className="w-full mb-6">
            <img 
              src={item.imageUrl || ''} 
              alt={item.name} 
              className="w-full rounded-lg shadow-lg"
              style={{ maxHeight: '75vh', objectFit: 'contain' }}
            />
          </div>

          {/* כפתור להחלפת התמונה */}
          <div className="flex justify-center mb-4">
            <label className="flex items-center gap-2 px-6 py-3 bg-white/90 text-gray-800 rounded-lg cursor-pointer hover:bg-white transition-colors shadow-lg font-medium">
              <input 
                type="file" 
                accept="image/*"
                className="hidden" 
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <RefreshCw className="w-5 h-5" />
              <span>
                {isUploading ? 'מעלה תמונה...' : 'החלף תמונה'}
              </span>
            </label>
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