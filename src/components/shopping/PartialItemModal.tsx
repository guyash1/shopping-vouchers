import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Item } from '../../types/shopping';

interface PartialItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onSave: (updates: { id: string; newQuantity: number }[]) => void;
}

export const PartialItemModal: React.FC<PartialItemModalProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  onSave 
}) => {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // אתחול הכמויות כשהפופאפ נפתח
    if (isOpen && items.length > 0) {
      const initialQuantities = items.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {} as { [key: string]: number });
      setQuantities(initialQuantities);
    }
  }, [items, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updates = items.map(item => ({
      id: item.id,
      newQuantity: Math.max(0, item.quantity - (quantities[item.id] || 0))
    }));
    onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pb-16 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto my-auto relative">
        <button onClick={onClose} className="absolute left-4 top-4 text-gray-500 hover:text-gray-700" aria-label="סגור">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">עדכון כמויות שהובאו</h2>
        <div className="space-y-4">
          {items.length > 0 ? (
            items.map(item => (
              <div key={item.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {item.name} (כמות נוכחית: {item.quantity})
                </label>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500">כמה הבאת?</span>
                  <input
                    type="number"
                    value={quantities[item.id] || 0}
                    onChange={(e) => {
                      const broughtQuantity = Math.max(0, Math.min(item.quantity, parseInt(e.target.value) || 0));
                      setQuantities(prev => ({ ...prev, [item.id]: broughtQuantity }));
                    }}
                    min="0"
                    max={item.quantity}
                    className="w-24 px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">
                    יישארו: {Math.max(0, item.quantity - (quantities[item.id] || 0))}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">אין פריטים חלקיים לעדכון</p>
              <p className="text-sm text-gray-400 mt-1">סמן פריטים כ"נלקחו חלקית" כדי לעדכן את הכמויות שלהם</p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6 sticky bottom-0 bg-white pt-2 pb-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={items.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              שמירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 