import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Eye, EyeOff } from 'lucide-react';

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
      alert('שגיאה בתהליך ההתחברות. אנא נסה שוב.');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('שגיאת התחברות עם Google:', error);
      alert('שגיאה בהתחברות עם Google. אנא נסה שוב.');
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (loading) {
    return <div className="text-center p-4">טוען...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">שגיאה: {error.message}</div>;
  }

  if (user) {
    return (
      <div className="text-center p-4">
        <p className="mb-4">מחובר כ: {user.email}</p>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          התנתק
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">
          {isSignUp ? 'הרשמה' : 'התחברות'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-right"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סיסמה
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="****"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded ml-2"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700">
                זכור אותי
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 transition-colors font-medium text-lg"
          >
            {isSignUp ? 'הירשם' : 'התחבר'}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-center text-sm text-gray-500 mb-4">או התחבר באמצעות</p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            <span>התחבר עם Google</span>
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          {isSignUp ? 'כבר יש לך חשבון?' : 'אין לך חשבון?'}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
              setShowPassword(false);
            }}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            {isSignUp ? 'התחבר' : 'הירשם עכשיו'}
          </button>
        </p>
      </div>
    </div>
  );
} 