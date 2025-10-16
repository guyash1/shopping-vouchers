import React, { useState, useEffect } from "react";
import { X, Edit, Check } from "lucide-react";
import { Item } from "../../types/shopping";

interface EditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSave: (id: string, newName: string) => void;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({ 
  isOpen, 
  onClose, 
  item, 
  onSave 
}) => {
  const [name, setName] = useState(item.name);

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
    }
  }, [isOpen, item.name]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim() && name.trim() !== item.name) {
      onSave(item.id, name.trim());
      onClose();
    } else if (name.trim() === item.name) {
      onClose();
    }
  };

  const isChanged = name.trim() !== item.name && name.trim() !== '';

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
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">עריכת שם המוצר</h2>
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
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">
              שם המוצר
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  } else if (e.key === 'Escape') {
                    onClose();
                  }
                }}
                placeholder="לדוגמה: חלב 3% 1 ליטר"
                autoFocus
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {isChanged && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              💡 כדאי להיות ספציפיים - זה עוזר לקטלג נכון
            </p>
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
              disabled={!name.trim()}
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

