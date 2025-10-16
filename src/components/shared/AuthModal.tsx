import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ShoppingCart, Receipt, BarChart3, Sparkles } from 'lucide-react';
import { auth } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import Logo from './Logo';
import { AuthActionType } from '../../contexts/AuthModalContext';
import { userService } from '../../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: AuthActionType;
}

const ACTION_MESSAGES = {
  'add-item': {
    icon: <ShoppingCart className="w-12 h-12 text-blue-500" />,
    title: 'רק רגע קטן!',
    subtitle: 'רוצים לשמור את רשימת הקניות ולסנכרן עם כל המשפחה? התחברו עכשיו',
    emoji: '🛒'
  },
  'add-voucher': {
    icon: <Receipt className="w-12 h-12 text-blue-500" />,
    title: 'לא רוצים לפספס אף שובר?',
    subtitle: 'התחברו כדי לנהל את כל השוברים במקום אחד',
    emoji: '🎫'
  },
  'stats': {
    icon: <BarChart3 className="w-12 h-12 text-blue-500" />,
    title: '"מאמי כמה נשאר לנו מהביימי?"',
    subtitle: 'התחברו כדי לראות את היתרה בגרפים לפי קטגוריות וחנויות',
    emoji: '📊'
  },
  'optimize': {
    icon: <Sparkles className="w-12 h-12 text-blue-500" />,
    title: 'חישוב חכם של השוברים!',
    subtitle: 'התחברו כדי לקבל את השילוב האופטימלי לכיסוי הקנייה',
    emoji: '💡'
  },
  'edit': {
    icon: <ShoppingCart className="w-12 h-12 text-blue-500" />,
    title: 'רגע אחד!',
    subtitle: 'כדי לערוך ולנהל את הפריטים, התחברו תוך שניות',
    emoji: '✏️'
  },
  'delete': {
    icon: <ShoppingCart className="w-12 h-12 text-blue-500" />,
    title: 'כמעט שם!',
    subtitle: 'כדי לנהל את הרשימה, התחברו תוך שניות',
    emoji: '🗑️'
  },
  'default': {
    icon: <ShoppingCart className="w-12 h-12 text-blue-500" />,
    title: 'ברוכים הבאים ל-Carto! 🛒',
    subtitle: 'התחברו כדי לשמור את רשימת הקניות ולסנכרן עם כל המשפחה',
    emoji: '👋'
  }
};

export default function AuthModal({ isOpen, onClose, actionType }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const message = actionType ? ACTION_MESSAGES[actionType] : ACTION_MESSAGES['add-item'];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          setError('נא למלא שם פרטי ושם משפחה');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save user profile to Firestore
        await userService.saveUserProfile(
          userCredential.user.uid,
          userCredential.user.email!,
          firstName,
          lastName,
          'email'
        );
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (error: any) {
      console.error('שגיאת אימות:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('המייל כבר קיים במערכת');
      } else if (error.code === 'auth/weak-password') {
        setError('הסיסמה חלשה מדי - לפחות 6 תווים');
      } else if (error.code === 'auth/invalid-email') {
        setError('כתובת המייל לא תקינה');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('המייל או הסיסמה שגויים');
      } else {
        setError('אופס! משהו השתבש. נסו שוב');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      
      // Save/update user profile for Google users
      const user = result.user;
      const displayName = user.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await userService.saveUserProfile(
        user.uid,
        user.email!,
        firstName,
        lastName,
        'google',
        user.photoURL || undefined
      );
      
      onClose();
    } catch (error: any) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error('Redirect login failed:', redirectError);
        }
      }
      console.error('שגיאת התחברות עם Google:', error);
      setError('שגיאה בהתחברות עם Google. נסו שוב');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setShowPassword(false);
    setError('');
    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>

          {/* Action Message */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              {message.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {message.title}
            </h2>
            <p className="text-gray-600 text-sm">
              {message.subtitle}
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-gray-200 absolute w-full"></div>
            <span className="bg-white px-4 text-sm text-gray-500 relative">
              {isSignUp ? 'הרשמה והתחלת חיסכון' : 'התחברות תוך שניות'}
            </span>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 bg-white text-gray-700 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium mb-4 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            <span>התחברות עם Google</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-gray-200 absolute w-full"></div>
            <span className="bg-white px-4 text-xs text-gray-400 relative">או</span>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span>שם פרטי</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="למשל: אבי"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right transition-all"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span>שם משפחה</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="למשל: כהן"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>אימייל</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Lock className="w-4 h-4" />
                <span>סיסמה</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>יצירת חשבון</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>התחברות</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <p className="text-center mt-6 text-sm text-gray-600">
            {isSignUp ? 'כבר יש חשבון?' : 'אין עדיין חשבון?'}{' '}
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-blue-500 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {isSignUp ? 'התחברות' : 'הרשמה עכשיו'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

