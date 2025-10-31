import React, { useState } from 'react';
import { ShoppingCart, AlertCircle, MinusCircle, PlusCircle, X, Edit, Camera, Trash2, RefreshCw } from 'lucide-react';
import { Item } from '../../types/shopping';
import Modal from 'react-modal';
import { EditNameModal } from './EditNameModal';
import { getUserColor, getUserName, getInitials } from '../../utils/userColors';
import { Household } from '../../types/household';

interface ShoppingItemProps {
  item: Item;
  onDelete: (id: string) => void;
  onEditQuantity: (item: Item) => void;
  onToggleStatus: (id: string, status: Item['status']) => void;
  onUploadImage: (file: File | null, itemId: string) => Promise<string>;
  onChangeQuantity: (id: string, newQuantity: number) => Promise<void>;
  onEditName?: (id: string, newName: string) => Promise<void>;
  household: Household | null;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = React.memo(({ 
  item, 
  onDelete, 
  onEditQuantity, 
  onToggleStatus,
  onUploadImage,
  onChangeQuantity,
  onEditName,
  household
}) => {
  // קבלת פרטי המשתמש שהוסיף
  const userColor = getUserColor(item.addedBy);
  const userName = getUserName(item.addedBy, household);
  const userInitials = getInitials(userName);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingQty, setIsUpdatingQty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  
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
    // בדיקה מיוחדת לסטטוס "חלקי" עם כמות 1
    if (status === 'partial' && item.quantity === 1) {
      alert('לא ניתן לסמן מוצר כחלקי כאשר הכמות היא 1!\n\n סמנו אותו "בעגלה" או "חסר".');
      return;
    }
    
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
    <div className={`grid grid-cols-[56px_1fr_auto_auto] gap-3 p-3 rounded-lg shadow ${getItemBackgroundColor(item.status)} relative border-b border-gray-100 items-start border-r-4 ${userColor.border}`}>
      {/* תמונת המוצר - עמודה קבועה */}
      <div className="w-14 h-14">
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
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            ) : (
              <label className="flex items-center justify-center cursor-pointer w-full h-full">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Camera className="text-gray-400" size={20} />
              </label>
            )}
          </div>
        )}
      </div>

      {/* תוכן המוצר - עמודה גמישה */}
      <div className="min-w-0">
        {/* שם המוצר */}
        <div className="flex items-center gap-1 mb-1">
          <div className="font-medium text-gray-800 leading-tight break-words flex-1">
            {item.name}
          </div>
          {onEditName && (
            <button
              onClick={() => setIsEditNameModalOpen(true)}
              className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
              aria-label="עריכת שם"
              title="עריכת שם"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* תג של מי הוסיף */}
        <div className="flex items-center gap-1 mb-2">
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${userColor.badge} text-xs ${userColor.text}`}>
            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold">
              {userInitials}
            </div>
            <span className="font-medium">{userName}</span>
          </div>
        </div>
        
        {/* כפתורי סטטוס */}
        <div className="flex gap-2">
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleStatusToggle('inCart')}
              className={`p-1.5 rounded-full hover:bg-green-100 ${
                item.status === 'inCart' ? 'bg-green-100' : ''
              }`}
              aria-label="סמן כנמצא בעגלה"
              title="בעגלה"
            >
              <ShoppingCart className={`w-4 h-4 ${
                item.status === 'inCart' ? 'text-green-500' : 'text-gray-400'
              }`} aria-hidden="true" />
            </button>
            <span className="text-[10px] text-gray-500 mt-1 leading-none">בעגלה</span>
          </div>
          
          <div className="flex flex-col items-center">
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
            <span className="text-[10px] text-gray-500 mt-1 leading-none">חלקי</span>
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleStatusToggle('missing')}
              className={`p-1.5 rounded-full hover:bg-red-100 ${
                item.status === 'missing' ? 'bg-red-100' : ''
              }`}
              aria-label="סמן כחסר במלאי"
              title="חסר"
            >
              <AlertCircle className={`w-4 h-4 ${
                item.status === 'missing' ? 'text-red-500' : 'text-gray-400'
              }`} aria-hidden="true" />
            </button>
            <span className="text-[10px] text-gray-500 mt-1 leading-none">חסר</span>
          </div>
        </div>
      </div>

      {/* בקרת כמות - עמודה קבועה */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center bg-blue-50 rounded-md border border-blue-100 overflow-hidden">
          <button
            disabled={isUpdatingQty || item.quantity <= 1}
            onClick={async () => {
              if (item.quantity <= 1) return;
              try {
                setIsUpdatingQty(true);
                await onChangeQuantity(item.id, item.quantity - 1);
              } finally {
                setIsUpdatingQty(false);
              }
            }}
            className={`p-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-100`}
            aria-label="הפחת כמות"
            title="הפחת כמות"
          >
            <MinusCircle className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </button>
          <span className="px-2 py-1 font-semibold text-blue-700 select-none min-w-[2rem] text-center">{item.quantity}</span>
          <button
            disabled={isUpdatingQty}
            onClick={async () => {
              try {
                setIsUpdatingQty(true);
                await onChangeQuantity(item.id, item.quantity + 1);
              } finally {
                setIsUpdatingQty(false);
              }
            }}
            className={`p-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-100`}
            aria-label="הוספת כמות"
            title="הגדל כמות"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </button>
        </div>
        {/* כפתור עריכה */}
        <button
          onClick={() => onEditQuantity(item)}
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          aria-label="עריכת כמות"
        >
          <Edit className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-gray-500 mt-1 leading-none">עריכת כמות</span>
      </div>

      {/* כפתור מחיקה - עמודה קבועה */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-full hover:bg-red-50"
          aria-label="מחק פריט"
        >
          <X className="w-5 h-5 text-red-500" />
        </button>
        <span className="text-xs text-gray-600 mt-1 leading-none text-center">מחק</span>
      </div>
      
      {/* מודל תמונה מוגדלת - מודרני ו-responsive */}
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={() => setIsImageModalOpen(false)}
        className="fixed inset-0 flex items-center justify-center z-[60] p-4 pb-24 overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-90 z-[60]"
        contentLabel={`תמונה של ${item.name}`}
      >
        <div className="relative w-full max-w-2xl flex flex-col items-center gap-6 my-auto">
          {/* כפתורי פעולה עליונים */}
          <div className="flex items-center justify-between w-full px-2">
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="bg-white/20 backdrop-blur-md rounded-full p-2.5 text-white hover:bg-white/30 transition-colors"
              aria-label="סגור תמונה"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex gap-2">
              <label className={`bg-white/20 backdrop-blur-md rounded-full p-2.5 text-white transition-colors ${isUploading ? 'cursor-wait' : 'cursor-pointer hover:bg-white/30'}`}>
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <RefreshCw className={`w-6 h-6 ${isUploading ? 'animate-spin' : ''}`} />
              </label>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-white/20 backdrop-blur-md rounded-full p-2.5 text-red-300 hover:bg-white/30 hover:text-red-200 transition-colors"
                aria-label="מחק תמונה"
                disabled={isUploading}
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* כותרת המוצר - מעל התמונה */}
          <div className="w-full text-center">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{item.name}</h2>
            <p className="text-xl text-yellow-300 font-semibold drop-shadow">כמות: {item.quantity}</p>
          </div>

          {/* תמונה מוגדלת */}
          <div className="w-full rounded-xl overflow-hidden shadow-2xl">
            <img 
              src={item.imageUrl || ''} 
              alt={item.name} 
              className="w-full h-auto object-contain"
              style={{ maxHeight: '70vh' }}
            />
          </div>
        </div>
      </Modal>

      {/* מודל אישור מחיקת תמונה */}
      <Modal
        isOpen={showDeleteConfirm}
        onRequestClose={() => setShowDeleteConfirm(false)}
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
                if (item.imageUrl) {
                  try {
                    setIsUploading(true);
                    await onUploadImage(null, item.id);
                    setShowDeleteConfirm(false);
                    setIsImageModalOpen(false);
                  } catch (error) {
                    console.error('שגיאה במחיקת תמונה:', error);
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              {isUploading ? 'מוחק...' : 'מחק'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              בטל
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Name Modal */}
      {onEditName && (
        <EditNameModal
          isOpen={isEditNameModalOpen}
          onClose={() => setIsEditNameModalOpen(false)}
          item={item}
          onSave={onEditName}
        />
      )}

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