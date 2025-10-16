import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus, LogOut } from 'lucide-react';
import Logo from './shared/Logo';

export function Auth() {
  const [user, loading, error] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('שגיאת אימות:', error);
      alert('שגיאה בתהליך ההתחברות. נסו שוב.');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error('Redirect login failed:', redirectError);
        }
      }
      console.error('שגיאת התחברות עם Google:', error);
      const message = error?.code ? `קוד שגיאה: ${error.code}` : 'שגיאה לא ידועה';
      alert(`שגיאה בהתחברות עם Google. ${message}`);
    }
  };

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      if (error) {
        console.error('שגיאה ב-redirect login:', error);
      }
    });
  }, []);

  const handleSignOut = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <p>שגיאה: {error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-blue-500">
                {user.email?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ברוך הבא!</h2>
            <p className="text-gray-600 mb-6">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="bg-white border border-red-500 text-red-500 px-6 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 mx-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          {/* לוגו Carto */}
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800">
            {isSignUp ? 'צור חשבון חדש' : 'ברוך הבא בחזרה'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isSignUp ? 'הצטרפות ל-Carto וקניה בחכמה' : 'התחברות ל-Carto וקניה בחכמה'}
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
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
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              required
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded ml-2"
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-600">
                  זכור אותי
                </label>
              </div>
              <button type="button" className="text-sm text-blue-500 hover:text-blue-700">
                שכחת סיסמה?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg mt-6 flex items-center justify-center gap-2"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-5 h-5" />
                <span>צור חשבון</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>התחברות</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 absolute w-full"></div>
            <span className="bg-white px-4 text-sm text-gray-500 relative">או</span>
          </div>
          
          <button
            onClick={handleGoogleSignIn}
            className="mt-4 w-full flex items-center justify-center gap-3 border border-gray-200 bg-white text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            <span>התחברות עם Google</span>
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-gray-600">
          {isSignUp ? 'כבר יש חשבון?' : 'אין עדיין חשבון?'}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
              setShowPassword(false);
            }}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            {isSignUp ? 'התחברות' : 'הרשמה עכשיו'}
          </button>
        </p>
      </div>
      
      <div className="mt-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Carto | Smart Shopping
      </div>
    </div>
  );
} 