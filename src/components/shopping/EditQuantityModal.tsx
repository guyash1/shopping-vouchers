import React, { useState } from "react";
import { X } from "lucide-react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button 
          onClick={onClose} 
          className="absolute left-4 top-4 text-gray-500 hover:text-gray-700" 
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">עריכת כמות</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {item.name}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={() => {
                onSave(item.id, quantity);
                onClose();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              שמירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 