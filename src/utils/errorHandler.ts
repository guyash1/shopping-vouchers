// Secure Error Handler - מטפל מאובטח בשגיאות
// מונע חשיפת מידע טכני רגיש למשתמש הקצה

export interface SafeError {
  message: string;
  code?: string;
  timestamp: number;
}

// מפת שגיאות ידידותיות למשתמש
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  // Firebase Auth errors
  'auth/user-not-found': 'משתמש לא נמצא במערכת',
  'auth/wrong-password': 'סיסמה שגויה',
  'auth/invalid-email': 'כתובת מייל לא תקינה',
  'auth/user-disabled': 'החשבון חסום. אנא פנה לתמיכה',
  'auth/email-already-in-use': 'כתובת המייל כבר בשימוש',
  'auth/weak-password': 'הסיסמה חלשה מדי. נדרשים לפחות 6 תווים',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
  'auth/network-request-failed': 'בעיית רשת. בדוק את החיבור לאינטרנט',
  
  // Firestore errors  
  'firestore/permission-denied': 'אין הרשאה לבצע פעולה זו',
  'firestore/not-found': 'המידע המבוקש לא נמצא',
  'firestore/already-exists': 'הפריט כבר קיים במערכת',
  'firestore/resource-exhausted': 'המערכת עמוסה. נסה שוב בעוד כמה דקות',
  'firestore/failed-precondition': 'הפעולה לא יכולה להתבצע כעת',
  'firestore/aborted': 'הפעולה בוטלה. נסה שוב',
  'firestore/out-of-range': 'ערך לא תקין',
  'firestore/unimplemented': 'הפעולה לא נתמכת',
  'firestore/internal': 'שגיאה פנימית במערכת',
  'firestore/unavailable': 'השירות זמנית לא זמין',
  'firestore/data-loss': 'שגיאה בנתונים',
  
  // Storage errors
  'storage/object-not-found': 'הקובץ לא נמצא',
  'storage/bucket-not-found': 'שטח האחסון לא נמצא',
  'storage/project-not-found': 'הפרויקט לא נמצא',
  'storage/quota-exceeded': 'חרגת ממכסת האחסון',
  'storage/unauthenticated': 'נדרשת הזדהות',
  'storage/unauthorized': 'אין הרשאה לקובץ זה',
  'storage/retry-limit-exceeded': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
  'storage/invalid-checksum': 'הקובץ פגום',
  'storage/canceled': 'ההעלאה בוטלה',
  'storage/invalid-event-name': 'שגיאה טכנית',
  'storage/invalid-url': 'כתובת לא תקינה',
  'storage/invalid-argument': 'פרמטר לא תקין',
  'storage/no-default-bucket': 'שגיאה בהגדרות',
  'storage/cannot-slice-blob': 'שגיאה בעיבוד הקובץ',
  'storage/server-file-wrong-size': 'גודל הקובץ לא תקין',
  
  // Custom app errors
  'validation/invalid-input': 'הקלט שהוזן לא תקין',
  'validation/required-field': 'שדה חובה חסר',
  'validation/invalid-format': 'פורמט לא תקין',
  'rate-limit/exceeded': 'יותר מדי פעולות. המתן רגע ונסה שוב',
  'network/offline': 'אין חיבור לאינטרנט',
  'app/unauthorized': 'אין הרשאה לבצע פעולה זו',
  'app/not-found': 'הפריט המבוקש לא נמצא',
  'app/already-exists': 'הפריט כבר קיים',
  
  // Generic fallbacks
  'unknown': 'אירעה שגיאה לא צפויה',
  'network': 'בעיית רשת. בדוק את החיבור לאינטרנט',
  'server': 'שגיאה בשרת. נסה שוב מאוחר יותר'
};

// רשימת קודי שגיאה שמותר לחשוף (לא מכילים מידע רגיש)
const SAFE_ERROR_CODES = new Set([
  'auth/user-not-found',
  'auth/wrong-password', 
  'auth/invalid-email',
  'auth/user-disabled',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/too-many-requests',
  'validation/invalid-input',
  'validation/required-field',
  'rate-limit/exceeded',
  'app/not-found',
  'app/already-exists'
]);

class SecureErrorHandler {
  private static instance: SecureErrorHandler;
  private isDevelopment: boolean;
  
  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }
  
  static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler();
    }
    return SecureErrorHandler.instance;
  }
  
  // עיבוד שגיאה מאובטח
  handleError(error: any): SafeError {
    const timestamp = Date.now();
    
    // ברירת מחדל לשגיאה לא ידועה
    let safeError: SafeError = {
      message: USER_FRIENDLY_ERRORS['unknown'],
      timestamp
    };
    
    try {
      // אם זה שגיאת Firebase
      if (error?.code) {
        const errorCode = error.code.toLowerCase();
        
        // בדיקה אם זה קוד שגיאה בטוח לחשיפה
        if (SAFE_ERROR_CODES.has(errorCode)) {
          safeError.code = errorCode;
        }
        
        // חיפוש הודעה ידידותית
        const friendlyMessage = USER_FRIENDLY_ERRORS[errorCode];
        if (friendlyMessage) {
          safeError.message = friendlyMessage;
        }
      }
      // אם זה שגיאת רשת
      else if (error?.message?.includes('network') || 
               error?.message?.includes('offline') ||
               error?.name === 'NetworkError') {
        safeError.message = USER_FRIENDLY_ERRORS['network'];
        safeError.code = 'network/offline';
      }
      // אם זה שגיאת rate limiting שלנו
      else if (error?.message?.includes('Too many')) {
        safeError.message = USER_FRIENDLY_ERRORS['rate-limit/exceeded'];
        safeError.code = 'rate-limit/exceeded';
      }
      // שגיאות custom validation שלנו
      else if (error?.message?.includes('required') || 
               error?.message?.includes('Invalid')) {
        safeError.message = error.message; // הודעות validation שלנו בטוחות
        safeError.code = 'validation/invalid-input';
      }
      
      // ב-development mode - רושמים את השגיאה המלאה לקונסול
      if (this.isDevelopment) {
      }
      
    } catch (processingError) {
      // אם יש שגיאה בעיבוד השגיאה עצמה
      if (this.isDevelopment) {
        console.error('Error processing error:', processingError);
      }
    }
    
    return safeError;
  }
  
  // יצירת הודעת שגיאה קצרה למשתמש
  getDisplayMessage(error: any): string {
    const safeError = this.handleError(error);
    return safeError.message;
  }
  
  // בדיקה אם השגיאה קריטית (דורשת התערבות מפתח)
  isCriticalError(error: any): boolean {
    if (!error?.code) return true; // שגיאות ללא קוד נחשבות קריטיות
    
    const criticalCodes = [
      'firestore/internal',
      'firestore/data-loss', 
      'storage/server-file-wrong-size',
      'auth/network-request-failed'
    ];
    
    return criticalCodes.includes(error.code);
  }
  
  // דיווח על שגיאה קריטית (ניתן לחבר למערכת monitoring)
  reportCriticalError(error: any, context?: string): void {
    if (this.isCriticalError(error)) {
      // כאן ניתן לשלוח לשירות monitoring כמו Sentry
      console.error('Critical error reported:', {
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    }
  }
}

// יצוא instance יחיד
export const errorHandler = SecureErrorHandler.getInstance();

// פונקציות נוחות לשימוש
export const handleError = (error: any): SafeError => 
  errorHandler.handleError(error);

export const getErrorMessage = (error: any): string => 
  errorHandler.getDisplayMessage(error);

export const reportError = (error: any, context?: string): void => 
  errorHandler.reportCriticalError(error, context); 