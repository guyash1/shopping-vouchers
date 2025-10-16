import React from "react";
import { X, ShoppingCart, MinusCircle, AlertCircle } from "lucide-react";
import Modal from "react-modal";

// וידוא שהספרייה יודעת מי האלמנט השורש של האפליקציה
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-11/12 max-h-[90vh] overflow-hidden flex flex-col"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
        <h2 className="text-xl font-bold">איך להשתמש ברשימת הקניות?</h2>
        <button 
          onClick={onClose} 
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700" 
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1">
        <div className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">הוספת פריטים</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>הקלד את שם המוצר בשדה הטקסט</li>
              <li>הגדר את הכמות הרצויה (ברירת מחדל: 1)</li>
              <li>אופציונלי: הוספת תמונה של המוצר</li>
              <li>לחץ על כפתור + להוספה</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-2">סימון סטטוס פריט</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                <span>פריט נמצא בעגלה</span>
              </div>
              <div className="flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-yellow-500" />
                <span>פריט נלקח חלקית</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>פריט חסר במלאי</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">* לחיצה נוספת על כפתור הסטטוס תבטל אותו</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">עריכת כמויות</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>לחץ על כפתור העיפרון ליד הכמות לעריכת כמות הפריט</li>
              <li>בסיום קניות, תתבקש לעדכן כמויות עבור פריטים שנלקחו חלקית</li>
              <li>לאחר עדכון הכמויות, הפריטים יחזרו למצב רגיל</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-2">פעולות נוספות</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>לחץ על X למחיקת פריט מהרשימה</li>
              <li>השתמש בהיסטוריית המוצרים להוספה מהירה</li>
              <li>סיום קניות ימחק את הפריטים שבעגלה ויעדכן כמויות לפריטים חלקיים</li>
              <li>פריטים שסומנו כחסרים יחזרו למצב רגיל בסיום הקניות</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}; 