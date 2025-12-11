import React, { useState, useEffect } from 'react';
import { LogOut, Home, Users, HelpCircle, LogIn } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Logo from './Logo';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { userService } from '../../services/firebase';

interface HeaderProps {
  title?: string;
  showHouseholdSwitcher?: boolean;
  showHelp?: boolean;
  onHelpClick?: () => void;
}

export default function Header({ 
  title, 
  showHouseholdSwitcher = true, 
  showHelp = false,
  onHelpClick 
}: HeaderProps) {
  const { selectedHousehold } = useHousehold();
  const [user] = useAuthState(auth);
  const { openAuthModal } = useAuthModal();
  const [userDisplayName, setUserDisplayName] = useState<string>('');

  // טעינת שם המשתמש
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        // קודם נציג את displayName מיידית
        setUserDisplayName(user.displayName || 'משתמש');
        
        // ואז ננסה לטעון את הפרופיל המלא
        const profile = await userService.getUserProfile(user.uid);
        if (profile) {
          // נציג רק את השם הפרטי
          let name = 'משתמש';
          if (profile.firstName) {
            name = profile.firstName;
          } else if (profile.displayName) {
            // אם אין שם פרטי, ניקח רק את המילה הראשונה מ-displayName
            name = profile.displayName.split(' ')[0];
          } else if (user.displayName) {
            name = user.displayName.split(' ')[0];
          }
          setUserDisplayName(name);
        }
      } else {
        setUserDisplayName('');
      }
    };
    loadUserProfile();
  }, [user]);

  const handleHouseholdSwitch = () => {
    const event = new CustomEvent('openHouseholdSwitcher');
    window.dispatchEvent(event);
  };

  const handleLogout = () => {
    const confirmed = window.confirm('האם להתנתק מהחשבון?');
    if (confirmed) {
      signOut(auth);
    }
  };

  // קביעת ברכה לפי שעה
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    if (hour >= 18 && hour < 21) return 'ערב טוב';
    return 'לילה טוב'; // 21:00-5:00
  };

  return (
    <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* לוגו ומותג */}
          <div className="flex items-center gap-3">
            <Logo size="md" showText={false} />
            <div>
              <h1 className="text-xl font-bold text-blue-600">
                Carto
              </h1>
              {user ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  {userDisplayName && (
                    <span className="font-medium">
                      {getGreeting()}, {userDisplayName}
                    </span>
                  )}
                  {selectedHousehold && userDisplayName && (
                    <>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Users className="w-3 h-3" aria-label="משק בית" />
                        <span>{selectedHousehold.name}</span>
                      </div>
                    </>
                  )}
                  {selectedHousehold && !userDisplayName && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Users className="w-3 h-3" aria-label="משק בית" />
                      <span>{selectedHousehold.name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">רשימת קניות חכמה</p>
              )}
            </div>
          </div>

          {/* כפתורי פעולה */}
          <div className="flex items-center gap-1">
            {user && showHouseholdSwitcher && (
              <button
                onClick={handleHouseholdSwitch}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="ניהול משק בית"
                title="ניהול משק בית"
              >
                <Home className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            {showHelp && onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="עזרה"
                title="עזרה"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="התנתקות"
                title="התנתקות"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('default')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span>התחברות</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

