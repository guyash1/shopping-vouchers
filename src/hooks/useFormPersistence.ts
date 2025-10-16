import { useEffect, useCallback, useState } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

interface UseFormPersistenceOptions {
  /**
   * מפתח ייחודי לשמירה ב-localStorage
   */
  storageKey: string;
  
  /**
   * האם לנקות את הנתונים השמורים לאחר שליחה מוצלחת
   * @default true
   */
  clearOnSubmit?: boolean;
  
  /**
   * שדות שלא צריך לשמור (למשל סיסמאות, קבצים)
   */
  excludeFields?: string[];
  
  /**
   * האם לשמור רק ערכים שאינם ריקים
   * @default true
   */
  saveOnlyNonEmpty?: boolean;
}

/**
 * Hook לשמירה אוטומטית של נתוני טופס ב-localStorage
 * 
 * @example
 * ```tsx
 * const form = useForm();
 * useFormPersistence(form, {
 *   storageKey: 'add-voucher-form',
 *   excludeFields: ['imageFile']
 * });
 * ```
 */
export function useFormPersistence<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  options: UseFormPersistenceOptions
) {
  const { 
    storageKey, 
    clearOnSubmit = true, 
    excludeFields = [], 
    saveOnlyNonEmpty = true 
  } = options;

  // טעינת נתונים שמורים בטעינה ראשונית (רק פעם אחת)
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // סינון שדות מוחרגים
        const filteredData = Object.keys(parsedData).reduce((acc, key) => {
          if (!excludeFields.includes(key)) {
            acc[key] = parsedData[key];
          }
          return acc;
        }, {} as any);

        // עדכון הטופס עם הנתונים השמורים
        Object.keys(filteredData).forEach(key => {
          const value = filteredData[key];
          if (!saveOnlyNonEmpty || (value !== '' && value !== null && value !== undefined)) {
            form.setValue(key as any, value, { shouldDirty: false, shouldValidate: false });
          }
        });
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתוני טופס שמורים:', error);
      // ניקוי נתונים פגומים
      localStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // רק כשה-storageKey משתנה, לא בכל פעם

  // שמירת נתונים בכל שינוי
  useEffect(() => {
    const subscription = form.watch((value) => {
      try {
        // סינון שדות מוחרגים
        const dataToSave = Object.keys(value || {}).reduce((acc, key) => {
          if (!excludeFields.includes(key)) {
            const fieldValue = value[key];
            // שמירה רק אם השדה לא ריק (אם מוגדר כך)
            if (!saveOnlyNonEmpty || (fieldValue !== '' && fieldValue !== null && fieldValue !== undefined)) {
              acc[key] = fieldValue;
            }
          }
          return acc;
        }, {} as any);

        // שמירה רק אם יש נתונים לשמור
        if (Object.keys(dataToSave).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        } else {
          // אם אין נתונים, נמחק מה-storage
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('שגיאה בשמירת נתוני טופס:', error);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // מתעלמים מ-dependencies אחרים כדי למנוע re-subscriptions מיותרים

  // פונקציה לניקוי ידני של הנתונים השמורים
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('שגיאה בניקוי נתונים שמורים:', error);
    }
  }, [storageKey]);

  // פונקציה לעטיפת handleSubmit שמנקה את הנתונים לאחר שליחה מוצלחת
  const wrapSubmitHandler = useCallback(
    <T>(originalHandler: (data: T) => Promise<void> | void) => {
      return async (data: T) => {
        try {
          await originalHandler(data);
          // אם הגיעו עד כאן - השליחה הצליחה
          if (clearOnSubmit) {
            clearPersistedData();
          }
        } catch (error) {
          // אם יש שגיאה, לא מנקים את הנתונים
          throw error;
        }
      };
    },
    [clearOnSubmit, clearPersistedData]
  );

  return {
    clearPersistedData,
    wrapSubmitHandler,
  };
}

/**
 * Hook פשוט יותר לשמירת ערכי טופס ב-localStorage
 * מתאים לטפסים פשוטים יותר
 */
export function useSimpleFormPersistence(
  storageKey: string,
  initialValues: Record<string, any> = {}
) {
  const [values, setValues] = useState(initialValues);

  // טעינת נתונים שמורים
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        setValues(prev => ({ ...prev, ...parsedData }));
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // שמירת נתונים
  const updateValue = useCallback((key: string, value: any) => {
    setValues(prev => {
      const newValues = { ...prev, [key]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newValues));
      } catch (error) {
        console.error('שגיאה בשמירת נתונים:', error);
      }
      return newValues;
    });
  }, [storageKey]);

  // ניקוי נתונים
  const clearValues = useCallback(() => {
    setValues(initialValues);
    localStorage.removeItem(storageKey);
  }, [storageKey, initialValues]);

  return {
    values,
    updateValue,
    clearValues,
  };
}
