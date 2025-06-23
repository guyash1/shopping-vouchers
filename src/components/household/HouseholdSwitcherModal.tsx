import React, { useState } from 'react';
import { X, PlusSquare, Copy } from 'lucide-react';
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
  const [showManager, setShowManager] = useState(false);

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
    if (!window.confirm('האם אתה בטוח שברצונך לעזוב את משק הבית?')) return;
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
    setShowManager(false);
    onClose();
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
        {!showManager && (
          <>
            {/* רשימת משקי בית */}
            <ul className="space-y-2 max-h-56 overflow-y-auto mb-4">
              {households.map(hh => (
                <li key={hh.id}>
                  <button
                    onClick={() => handleSelect(hh.id)}
                    className={`w-full flex justify-between items-center px-3 py-2 rounded-lg border ${selectedHousehold?.id === hh.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span>{hh.name}</span>
                    {selectedHousehold?.id === hh.id && (
                      <span className="text-xs text-blue-600">פעיל</span>
                    )}
                  </button>
                </li>
              ))}
              {households.length === 0 && (
                <li className="text-center text-sm text-gray-500">אין משקי בית</li>
              )}
            </ul>

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

            {/* כפתור לפתיחת מנהל משקים */}
            <button
              onClick={() => setShowManager(true)}
              className="w-full flex justify-center items-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusSquare className="w-4 h-4" />
              הוסף / הצטרף למשק בית
            </button>
          </>
        )}

        {/* תצוגת מנהל משקים */}
        {showManager && (
          <HouseholdManager onClose={() => setShowManager(false)} onSuccess={handleManagerSuccess} />
        )}
      </div>
    </div>
  );
} 