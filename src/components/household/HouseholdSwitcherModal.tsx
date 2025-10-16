import React, { useState } from 'react';
import { X, PlusSquare, Copy, Users, ChevronRight, CheckCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useHousehold } from '../../contexts/HouseholdContext';
import { HouseholdManager } from './HouseholdManager';
import { auth } from '../../firebase';
import { householdService } from '../../services/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppIcon = FaWhatsapp as unknown as React.FC<{ className?: string }>;

export function HouseholdSwitcherModal({ isOpen, onClose }: Props) {
  const { households, selectedHousehold, setSelectedHousehold, refreshHouseholds } = useHousehold();
  const [managerMode, setManagerMode] = useState<'none' | 'create' | 'join'>('none');

  const handleSelect = (id: string) => {
    const hh = households.find(h => h.id === id) || null;
    setSelectedHousehold(hh);
    onClose();
  };

  const handleLeave = async () => {
    if (!selectedHousehold) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    if (selectedHousehold.ownerId === userId) {
      alert('בעל משק הבית לא יכול לעזוב – יש להעביר בעלות או למחוק.');
      return;
    }
    if (!window.confirm('האם לעזוב את משק הבית?')) return;
    try {
      await householdService.leaveHousehold(selectedHousehold.id, userId);
      setSelectedHousehold(null);
      await refreshHouseholds();
      alert('עזבת את משק הבית בהצלחה');
    } catch (e) {
      alert('שגיאה בעזיבת משק הבית');
    }
  };

  const copyCodeToClipboard = () => {
    if (selectedHousehold) {
      const textArea = document.createElement('textarea');
      textArea.value = selectedHousehold.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('קוד השיתוף עותק בהצלחה');
    }
  };

  const handleManagerSuccess = (hh: any) => {
    refreshHouseholds();
    if (hh) setSelectedHousehold(hh);
    setManagerMode('none');
  };

  // יצירת הודעת WhatsApp דינמית
  const whatsappLink = React.useMemo(() => {
    if (!selectedHousehold) return '#';
    const msg = `היי!\nרוצים להזמין אותך לרשימה המשותפת "${selectedHousehold.name}" לניהול רשימת הקניות וניהול משק הבית המשותף ביחד!\nהקישור לאתר הוא:\nhttps://subtle-froyo-666af2.netlify.app/\nהיכנסו, התחברו דרך גוגל והתחברו למשק הבית המשותף בקוד\n${selectedHousehold.code}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, [selectedHousehold]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-80 max-w-full p-4 relative" onClick={e => e.stopPropagation()}>
        <button className="absolute left-3 top-3 text-gray-500" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">בחירת משק בית</h2>

        {/* תוכן ראשי (רשימה + כרטיס) מוצג רק כאשר לא פתוח מנהל המשקים */}
        {managerMode === 'none' && (
          <>
            {/* כותרת ברורה */}
            <p className="text-sm font-medium mb-2 text-center text-gray-700">בחר/י משק בית פעיל</p>

            {/* רשימת משקי בית */}
            <ul className="space-y-2 max-h-56 overflow-y-auto mb-2 border rounded-lg p-2 bg-gray-50">
              {households.map(hh => (
                <li key={hh.id}>
                  <button
                    onClick={() => handleSelect(hh.id)}
                    className={`w-full flex justify-between items-center px-4 py-3 rounded-lg shadow-sm cursor-pointer transition border ${selectedHousehold?.id === hh.id ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white hover:bg-gray-100 border-gray-200'}`}
                  >
                    <span>{hh.name}</span>
                    {selectedHousehold?.id === hh.id ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </li>
              ))}
              {households.length === 0 && (
                <li className="text-center text-sm text-gray-500">אין משקי בית</li>
              )}
            </ul>

            <p className="text-center text-xs text-gray-500 mb-4">לחצו על משק הבית להפעלה</p>

            {selectedHousehold && (
              <div className="bg-gray-100 rounded-xl p-4 mb-3">
                <h3 className="font-semibold text-lg mb-3 text-center">{selectedHousehold.name}</h3>
                <div className="flex items-center justify-center gap-3 mb-3">
                   <span className="text-sm font-mono bg-white px-2 py-1 rounded border">{selectedHousehold.code}</span>
                   <button onClick={copyCodeToClipboard} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                     <Copy className="w-4 h-4" />העתק
                   </button>
                   <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800" title="שלח הזמנה ב-WhatsApp">
                     <WhatsAppIcon className="w-4 h-4" />
                   </a>
                </div>
                <p className="text-sm font-medium mb-1">חברי משק הבית:</p>
                <ul className="text-sm mb-2 max-h-28 overflow-y-auto">
                  {selectedHousehold.members && Object.entries(selectedHousehold.members).map(([uid, m]: [string, any]) => (
                    <li key={uid} className="flex justify-between mb-1">
                      <span>{m.name}</span>
                      <span className="text-gray-500 text-xs">{m.role === 'owner' ? 'מנהל' : 'חבר'}</span>
                    </li>
                  ))}
                </ul>
                {auth.currentUser?.uid !== selectedHousehold.ownerId && (
                  <button
                    onClick={handleLeave}
                    className="w-full bg-red-100 text-red-600 py-1.5 rounded-lg hover:bg-red-200 text-sm"
                  >עזוב משק בית</button>
                )}
              </div>
            )}

            {/* שני כפתורים במקום כפתור אחד */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setManagerMode('create')}
                className="w-full flex justify-center items-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusSquare className="w-4 h-4" />
                צור משק בית נוסף
              </button>
              <button
                onClick={() => setManagerMode('join')}
                className="w-full flex justify-center items-center gap-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                <Users className="w-4 h-4" />
                הצטרף למשק בית קיים
              </button>
            </div>
          </>
        )}

        {/* תצוגת מנהל משקים - טפסי יצירה/הצטרפות בלבד */}
        {managerMode !== 'none' && (
          <HouseholdManager 
            onClose={() => setManagerMode('none')} 
            onSuccess={handleManagerSuccess} 
            initialMode={managerMode}
          />
        )}
      </div>
    </div>
  );
} 