// Secure Storage Wrapper - מעטפת מאובטחת לאחסון מקומי
// הגנה מפני localStorage hijacking ובעיות privacy

class SecureStorage {
  private static instance: SecureStorage;
  private readonly prefix = 'shopping_app_';
  private readonly maxValueLength = 10000; // הגבלת אורך ערכים
  
  private constructor() {}
  
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }
  
  // פונקציית עזר לניקוי מפתח
  private sanitizeKey(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }
    
    return this.prefix + key
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50); // הגבלת אורך המפתח
  }
  
  // פונקציית עזר לניקוי ערך
  private sanitizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (stringValue.length > this.maxValueLength) {
      throw new Error('Value too large for storage');
    }
    
    return stringValue;
  }
  
  // שמירה מאובטחת
  setItem(key: string, value: any): boolean {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const sanitizedValue = this.sanitizeValue(value);
      
      localStorage.setItem(sanitizedKey, sanitizedValue);
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  }
  
  // קריאה מאובטחת
  getItem(key: string): string | null {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      return localStorage.getItem(sanitizedKey);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }
  
  // קריאה עם parsing אוטומטי
  getItemParsed<T>(key: string): T | null {
    try {
      const value = this.getItem(key);
      if (value === null) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('Failed to parse localStorage value:', error);
      return null;
    }
  }
  
  // מחיקה מאובטחת
  removeItem(key: string): boolean {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      localStorage.removeItem(sanitizedKey);
      return true;
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
      return false;
    }
  }
  
  // ניקוי כל הנתונים של האפליקציה
  clearAppData(): boolean {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear app data:', error);
      return false;
    }
  }
  
  // בדיקת זמינות localStorage
  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// יצוא instance יחיד
export const secureStorage = SecureStorage.getInstance();

// Backward compatibility - פונקציות פשוטות לשימוש קל
export const setStorageItem = (key: string, value: any): boolean => 
  secureStorage.setItem(key, value);

export const getStorageItem = (key: string): string | null => 
  secureStorage.getItem(key);

export const getStorageItemParsed = <T>(key: string): T | null => 
  secureStorage.getItemParsed<T>(key);

export const removeStorageItem = (key: string): boolean => 
  secureStorage.removeItem(key);

export const clearAppStorage = (): boolean => 
  secureStorage.clearAppData(); 