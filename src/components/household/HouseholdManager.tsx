import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, Copy, LogOut } from 'lucide-react';
import { householdService, userService } from '../../services/firebase';
import { Household } from '../../types/household';
import { UserProfile } from '../../types/user';
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface HouseholdManagerProps {
  onClose: () => void;
  onSuccess?: (household: Household | null) => void;
  initialMode?: 'create' | 'join';
}

export function HouseholdManager({ onClose, onSuccess, initialMode }: HouseholdManagerProps) {
  const [user] = useAuthState(auth);
  const [household, setHousehold] = useState<Household | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(initialMode === 'create');
  const [isJoining, setIsJoining] = useState(initialMode === 'join');
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHousehold = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [householdData, profileData] = await Promise.all([
        householdService.getUserHousehold(user.uid),
        userService.getUserProfile(user.uid)
      ]);
      setHousehold(householdData);
      setUserProfile(profileData);
    } catch (error) {
      setError('שגיאה בטעינת משק הבית');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHousehold();
    }
  }, [user, loadHousehold]);

  const handleCreateHousehold = async () => {
    if (!user || !householdName.trim()) return;
    try {
      setError('');
      setLoading(true);
      await householdService.createHousehold(user.uid, householdName);
      const hh = await householdService.getUserHousehold(user.uid);
      setHousehold(hh);
      if (onSuccess) onSuccess(hh);
      await loadHousehold();
      setIsCreating(false);
    } catch (error) {
      setError('שגיאה ביצירת משק בית');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!user || !joinCode.trim()) return;
    try {
      setError('');
      setLoading(true);
      await householdService.joinHousehold(joinCode, user.uid);
      const hh = await householdService.getUserHousehold(user.uid);
      setHousehold(hh);
      if (onSuccess) onSuccess(hh);
      await loadHousehold();
      setIsJoining(false);
    } catch (error: any) {
      setError(error.message || 'שגיאה בהצטרפות למשק בית');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!user || !household) return;
    try {
      setError('');
      setLoading(true);
      await householdService.leaveHousehold(household.id, user.uid);
      setHousehold(null);
    } catch (error: any) {
      setError(error.message || 'שגיאה בעזיבת משק בית');
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (household?.code) {
      navigator.clipboard.writeText(household.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <input
          type="text"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="שם משק הבית"
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          dir="rtl"
        />
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={handleCreateHousehold}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            צור
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="הכנס קוד שיתוף"
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          dir="rtl"
        />
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={handleJoinHousehold}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            הצטרף
          </button>
          <button
            onClick={() => setIsJoining(false)}
            className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {household ? (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">{household.name}</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                קוד שיתוף: <span className="font-mono">{household.code}</span>
              </div>
              <button
                onClick={copyCodeToClipboard}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Copy className="w-4 h-4 ml-1" />
                {copied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 ml-2" />
                חברי משק הבית
              </h4>
              <ul className="space-y-2">
                {household.members && Object.entries(household.members).map(([userId, member]) => (
                  <li key={userId} className="flex justify-between items-center">
                    <span>{member.name}</span>
                    <span className="text-sm text-gray-500">
                      {member.role === 'owner' ? 'מנהל' : 'חבר'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {household.ownerId !== user?.uid && (
            <button
              onClick={handleLeaveHousehold}
              className="w-full bg-red-100 text-red-600 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 ml-2" />
              עזוב משק בית
            </button>
          )}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Home className="w-5 h-5 ml-2" />
              צור משק בית נוסף
            </button>
            <button
              onClick={() => setIsJoining(true)}
              className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Users className="w-5 h-5 ml-2" />
              הצטרף למשק בית קיים
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 ml-2" />
            צור משק בית חדש
          </button>
          <button
            onClick={() => setIsJoining(true)}
            className="w-full bg-gray-100 text-gray-600 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Users className="w-5 h-5 ml-2" />
            הצטרף למשק בית קיים
          </button>
        </div>
      )}
    </div>
  );
} 