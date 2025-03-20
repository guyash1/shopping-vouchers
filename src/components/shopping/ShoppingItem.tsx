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

export const ShoppingItem: React.FC<ShoppingItemProps> = ({ 
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
    <div className={`flex items-center gap-3 p-4 rounded-lg shadow ${getItemBackgroundColor(item.status)}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">({item.quantity})</span>
            <button
              onClick={() => onEditQuantity(item)}
              className="p-1 text-gray-400 hover:text-blue-500"
              aria-label="ערוך כמות"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {item.imageUrl ? (
          <div className="mt-2 relative group">
            <img 
              src={item.imageUrl} 
              alt={item.name} 
              className="w-16 h-16 object-cover rounded cursor-pointer" 
              onClick={() => setIsImageModalOpen(true)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100"
                  onClick={() => setIsImageModalOpen(true)}
                  aria-label="הגדל תמונה"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <label className="p-1 rounded-full bg-white shadow-md hover:bg-gray-100 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <RefreshCw className="h-4 w-4" />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
              <input 
                type="file" 
                accept="image/*"
                className="hidden" 
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isUploading ? 'מעלה תמונה...' : 'הוסף תמונה'}
              </span>
            </label>
          </div>
        )}
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="מחק פריט"
        >
          <X className="w-5 h-5 text-red-500" />
        </button>
        
        <button
          onClick={() => handleStatusToggle('inCart')}
          className={`p-2 rounded-full hover:bg-green-100 ${
            item.status === 'inCart' ? 'bg-green-100' : ''
          }`}
          aria-label="סמן כנמצא בעגלה"
        >
          <ShoppingCart className={`w-5 h-5 ${
            item.status === 'inCart' ? 'text-green-500' : 'text-gray-400'
          }`} />
        </button>
        
        <button
          onClick={() => handleStatusToggle('partial')}
          className={`p-2 rounded-full hover:bg-yellow-100 ${
            item.status === 'partial' ? 'bg-yellow-100' : ''
          }`}
          aria-label="סמן כנלקח חלקית"
        >
          <MinusCircle className={`w-5 h-5 ${
            item.status === 'partial' ? 'text-yellow-500' : 'text-gray-400'
          }`} />
        </button>
        
        <button
          onClick={() => handleStatusToggle('missing')}
          className={`p-2 rounded-full hover:bg-red-100 ${
            item.status === 'missing' ? 'bg-red-100' : ''
          }`}
          aria-label="סמן כחסר במלאי"
        >
          <AlertCircle className={`w-5 h-5 ${
            item.status === 'missing' ? 'text-red-500' : 'text-gray-400'
          }`} />
        </button>
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
          
          <div className="bg-white p-4 rounded-lg shadow-xl overflow-hidden max-w-full max-h-full">
            <h3 className="text-xl font-semibold text-center mb-4">{item.name}</h3>
            <div className="overflow-auto max-h-[70vh]">
              <img 
                src={item.imageUrl || ''} 
                alt={item.name} 
                className="max-w-full max-h-full object-contain rounded-md" 
                style={{ minHeight: '200px' }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}; 