import React, { useState, useEffect } from "react";
import { X, Hash, Check, Plus, Minus } from "lucide-react";
import { Item } from "../../types/shopping";

interface EditQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSave: (id: string, newQuantity: number) => void;
}

export const EditQuantityModal: React.FC<EditQuantityModalProps> = ({ 
  isOpen, 
  onClose, 
  item, 
  onSave 
}) => {
  const [quantity, setQuantity] = useState(item.quantity);

  useEffect(() => {
    if (isOpen) {
      setQuantity(item.quantity);
    }
  }, [isOpen, item.quantity]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (quantity !== item.quantity && quantity >= 1) {
      onSave(item.id, quantity);
      onClose();
    } else if (quantity === item.quantity) {
      onClose();
    }
  };

  const isChanged = quantity !== item.quantity;

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Hash className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">עריכת כמות</h2>
              <p className="text-sm text-gray-500 mt-0.5">{item.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="absolute left-4 top-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" 
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              כמות
            </label>
            
            {/* Quantity Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all text-gray-700 font-bold"
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave();
                    } else if (e.key === 'Escape') {
                      onClose();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      incrementQuantity();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      decrementQuantity();
                    }
                  }}
                  min="1"
                  className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {isChanged && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              <button
                onClick={incrementQuantity}
                className="w-12 h-12 flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-xl transition-all text-white font-bold shadow-lg shadow-blue-500/30"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Select */}
            <div className="mt-4 flex gap-2">
              <p className="text-xs text-gray-500 self-center ml-2">בחירה מהירה:</p>
              {[1, 2, 3, 5, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuantity(num)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    quantity === num
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={quantity < 1}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>שמירה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 