import React, { useState, useEffect } from 'react';
import { X, PlusSquare, Copy, Users, ChevronRight, CheckCircle, Edit2, Check, User, Trash2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useHousehold } from '../../contexts/HouseholdContext';
import { HouseholdManager } from './HouseholdManager';
import { auth } from '../../firebase';
import { householdService, userService } from '../../services/firebase';
import { UserProfile } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const WhatsAppIcon = FaWhatsapp as unknown as React.FC<{ className?: string }>;

export function HouseholdSwitcherModal({ isOpen, onClose, onSuccess }: Props) {
  const { households, selectedHousehold, setSelectedHousehold, refreshHouseholds } = useHousehold();
  const [managerMode, setManagerMode] = useState<'none' | 'create' | 'join'>('none');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [memberProfiles, setMemberProfiles] = useState<{ [uid: string]: UserProfile }>({});

  // Load member profiles when household changes
  useEffect(() => {
    const loadMemberProfiles = async () => {
      if (!selectedHousehold?.members) return;
      
      const profiles: { [uid: string]: UserProfile } = {};
      const memberIds = Object.keys(selectedHousehold.members);
      
      await Promise.all(
        memberIds.map(async (uid) => {
          const profile = await userService.getUserProfile(uid);
          if (profile) {
            profiles[uid] = profile;
          }
        })
      );
      
      setMemberProfiles(profiles);
    };

    if (selectedHousehold) {
      loadMemberProfiles();
    }
  }, [selectedHousehold]);

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

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!selectedHousehold) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const memberProfile = memberProfiles[memberIdToRemove];
    const memberName = memberProfile
      ? `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || memberProfile.displayName
      : 'חבר זה';

    if (!window.confirm(`האם להסיר את ${memberName} ממשק הבית?`)) return;

    try {
      await householdService.removeMember(selectedHousehold.id, memberIdToRemove, userId);
      await refreshHouseholds();
      
      // Reload member profiles after removal
      const profiles: { [uid: string]: UserProfile } = {};
      const memberIds = Object.keys(selectedHousehold.members || {}).filter(id => id !== memberIdToRemove);
      
      await Promise.all(
        memberIds.map(async (uid) => {
          const profile = await userService.getUserProfile(uid);
          if (profile) {
            profiles[uid] = profile;
          }
        })
      );
      
      setMemberProfiles(profiles);
      alert('החבר הוסר בהצלחה');
    } catch (error: any) {
      alert(error.message || 'שגיאה בהסרת החבר');
    }
  };

  const handleEditName = async () => {
    if (!selectedHousehold || !newName.trim()) return;
    
    try {
      await householdService.updateHouseholdName(selectedHousehold.id, newName.trim());
      await refreshHouseholds();
      setEditingName(false);
      setNewName('');
    } catch (error) {
      alert('שגיאה בעדכון שם משק הבית');
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

  const shareViaWhatsApp = () => {
    if (!selectedHousehold) return;
    const message = `הצטרפו למשק הבית "${selectedHousehold.name}" ב-Carto!\n\nמה זה משק בית משותף?\nרשימת קניות חכמה ומשותפת שכל בני המשפחה יכולים לערוך ולעדכן בזמן אמת. כולם רואים מה צריך לקנות ומה כבר נקנה.\n\nאבל זה לא הכול! האפליקציה כוללת גם:\n• מערכת מתקדמת לניהול שוברים\n• שימוש נוח בשוברי סופרמרקט\n• סטטיסטיקות מפורטות על השוברים הקיימים בבית\nועוד...\n\nקוד ההצטרפות שלכם: ${selectedHousehold.code}\n\nאיך מצטרפים?\n1. היכנסו לאתר: https://carto.co.il\n2. הירשמו או התחברו\n3. הזינו את קוד ההצטרפות\n4. מתחילים לנהל את הקניות והשוברים ביחד!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleManagerSuccess = (hh: any) => {
    refreshHouseholds();
    if (hh) setSelectedHousehold(hh);
    setManagerMode('none');
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">בחירת משק בית</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="סגור"
          >
            <X className="w-6 h-6" />
        </button>
        </div>

        <div className="p-6">
        {managerMode === 'none' && (
          <>
              <p className="text-sm text-gray-600 mb-4 text-center">
                בחרו משק בית פעיל או הוסיפו חדש
              </p>

            {/* רשימת משקי בית */}
              <div className="space-y-3 mb-6">
              {households.map(hh => (
                  <button
                    key={hh.id}
                    onClick={() => handleSelect(hh.id)}
                    className={`w-full flex justify-between items-center px-4 py-4 rounded-xl transition-all border-2 ${
                      selectedHousehold?.id === hh.id
                        ? 'bg-blue-50 border-blue-500 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedHousehold?.id === hh.id ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <Users className={`w-5 h-5 ${
                          selectedHousehold?.id === hh.id ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          selectedHousehold?.id === hh.id ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {hh.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {hh.members ? Object.keys(hh.members).length : 0} חברים
                        </div>
                      </div>
                    </div>
                    {selectedHousehold?.id === hh.id ? (
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
              ))}
              {households.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">אין עדיין משקי בית</p>
                  </div>
              )}
              </div>

              {/* פרטי משק בית נבחר */}
            {selectedHousehold && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6 border border-gray-200">
                  {/* שם משק בית עם אפשרות עריכה */}
                  <div className="mb-4">
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder={selectedHousehold.name}
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditName();
                            if (e.key === 'Escape') {
                              setEditingName(false);
                              setNewName('');
                            }
                          }}
                        />
                        <button
                          onClick={handleEditName}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          disabled={!newName.trim()}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false);
                            setNewName('');
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">{selectedHousehold.name}</h3>
                        {auth.currentUser?.uid === selectedHousehold.ownerId && (
                          <button
                            onClick={() => {
                              setEditingName(true);
                              setNewName(selectedHousehold.name);
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="ערוך שם משק בית"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* קוד שיתוף */}
                  <div className="flex items-center justify-center gap-3 mb-4 bg-white rounded-lg p-3 border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">קוד שיתוף:</span>
                    <span className="text-lg font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200">
                      {selectedHousehold.code}
                    </span>
                    <button
                      onClick={copyCodeToClipboard}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      title="העתק קוד"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={shareViaWhatsApp}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors"
                      title="שתף בווטסאפ"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* רשימת חברים */}
                  <div className="border-t border-gray-300 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      חברי משק הבית ({selectedHousehold.members ? Object.keys(selectedHousehold.members).length : 0})
                    </h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedHousehold.members && Object.entries(selectedHousehold.members).map(([userId, member]) => {
                        const profile = memberProfiles[userId];
                        const displayName = profile
                          ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.displayName
                          : member.name;
                        const isOwner = member.role === 'owner';
                        const isCurrentUser = userId === auth.currentUser?.uid;

                        const canRemove = auth.currentUser?.uid === selectedHousehold.ownerId && !isOwner;

                        return (
                          <li
                            key={userId}
                            className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-gray-200"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isOwner ? 'bg-yellow-100' : 'bg-gray-100'
                              }`}>
                                <User className={`w-4 h-4 ${
                                  isOwner ? 'text-yellow-600' : 'text-gray-600'
                                }`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm text-gray-900">
                                  {displayName}
                                  {isCurrentUser && <span className="text-xs text-blue-600 mr-1">(את/ה)</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isOwner
                                  ? 'bg-yellow-100 text-yellow-700 font-semibold'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {isOwner ? '👑 מנהל' : 'חבר'}
                              </span>
                              {canRemove && (
                                <button
                                  onClick={() => handleRemoveMember(userId)}
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                  title="הסר חבר"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                   </button>
                              )}
                </div>
                    </li>
                        );
                      })}
                </ul>
                  </div>

                  {/* כפתור עזיבה */}
                {auth.currentUser?.uid !== selectedHousehold.ownerId && (
                  <button
                    onClick={handleLeave}
                      className="w-full mt-4 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      עזוב משק בית
                    </button>
                )}
              </div>
            )}

              {/* כפתורי פעולה */}
              <div className="flex flex-col gap-3">
              <button
                onClick={() => setManagerMode('create')}
                  className="w-full flex justify-center items-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-semibold"
              >
                  <PlusSquare className="w-5 h-5" />
                  הוספת משק בית חדש
              </button>
              <button
                onClick={() => setManagerMode('join')}
                  className="w-full flex justify-center items-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                  <Users className="w-5 h-5" />
                הצטרף למשק בית קיים
              </button>
            </div>
          </>
        )}

          {/* תצוגת מנהל משקים */}
        {managerMode !== 'none' && (
          <HouseholdManager 
            onClose={() => setManagerMode('none')} 
            onSuccess={handleManagerSuccess} 
            initialMode={managerMode}
          />
        )}
        </div>
      </div>
    </div>
  );
} 
