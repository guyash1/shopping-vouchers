import React from 'react';
import { LogOut, Home, Users, HelpCircle, LogIn } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Logo from './Logo';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useAuthModal } from '../../contexts/AuthModalContext';

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

  const handleHouseholdSwitch = () => {
    const event = new CustomEvent('openHouseholdSwitcher');
    window.dispatchEvent(event);
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
              {user && selectedHousehold ? (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{selectedHousehold.name}</span>
                </div>
              ) : !user ? (
                <p className="text-xs text-gray-500">רשימת קניות חכמה</p>
              ) : null}
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
                onClick={() => signOut(auth)}
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

