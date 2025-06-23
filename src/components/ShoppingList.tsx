import React, { useState, useEffect, useCallback } from "react";
import { ShoppingCart, X, LogOut, HelpCircle, Home, Users } from "lucide-react";
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, deleteField, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import Modal from 'react-modal';
import { Item } from '../types/shopping';
import { HelpModal } from './shopping/HelpModal';
import { HistoryModal } from './shopping/HistoryModal';
import { EditQuantityModal } from './shopping/EditQuantityModal';
import { PartialItemModal } from './shopping/PartialItemModal';
import { ShoppingItem } from './shopping/ShoppingItem';
import { AddItemForm } from './shopping/AddItemForm';
import { shoppingListService, storageService, householdService } from '../services/firebase';
import { useHousehold } from '../contexts/HouseholdContext';

Modal.setAppElement('#root');

export default function ShoppingList() {
  const { selectedHousehold } = useHousehold();
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditQuantityModalOpen, setIsEditQuantityModalOpen] = useState(false);
  const [isPartialItemModalOpen, setIsPartialItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [historyItems, setHistoryItems] = useState<{
    name: string; 
    imageUrl?: string; 
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[]>([]);
  const [frequentItems, setFrequentItems] = useState<string[]>([]);
  const [partialItems, setPartialItems] = useState<Item[]>([]);
  const [isShoppingActive, setIsShoppingActive] = useState(false);

  // טעינת נתוני המשתמש ופריטים
  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // טעינת משק הבית של המשתמש
      const userHousehold = selectedHousehold;
      
      try {
        // טעינת הפריטים
        let loadedItems: Item[] = [];
        
        if (userHousehold) {
          // אם המשתמש במשק בית, מביאים את כל הפריטים של משק הבית
          loadedItems = await shoppingListService.getItems(userHousehold.id);
        } else {
          // אם המשתמש לא במשק בית, מביאים רק את הפריטים שלו
          try {
            // שימוש בפונקציה החדשה לקבלת פריטים אישיים
            loadedItems = await shoppingListService.getUserItems(user.uid);
          } catch (error: any) {
            // בדיקה לשגיאת אינדקס ספציפית לשאילתת הפריטים האישיים
            if (error.message && (
                error.message.includes('index') || 
                error.message.includes('9-Prop-Order') || 
                error.message.includes('no matching index')
            )) {
              alert(`שגיאת אינדקס בפיירבייס בשאילתת פריטים אישיים. 
יש ללחוץ על הקישור בקונסול כדי להוסיף אינדקס חדש.
אם האינדקס כבר הוסף, אנא המתן כ-5 דקות עד שהאינדקס יתעדכן.`);
              console.error('פרטי שגיאת האינדקס:', error);
            } else {
              throw error; // זורק את השגיאה הלאה אם היא לא קשורה לאינדקס
            }
          }
        }
        
        setItems(loadedItems);
        
        // כבר לא טוענים היסטוריה כאן - useEffect ייעודי יטפל בזה
        console.log('נטענו נתוני משתמש ופריטים פעילים בהצלחה');
        
      } catch (error: any) {
        console.error('שגיאה בטעינת פריטים:', error);
        // בדיקה לשגיאות אינדקס כלליות
        if (error.message && (
            error.message.includes('index') || 
            error.message.includes('9-Prop-Order') || 
            error.message.includes('no matching index')
        )) {
          alert(`שגיאת אינדקס בפיירבייס. יש ללחוץ על הקישור בקונסול כדי להוסיף אינדקס חדש.
אם האינדקס כבר הוסף, אנא המתן כ-5 דקות עד שהאינדקס יתעדכן.`);
        } else {
          alert('שגיאה בטעינת פריטים: ' + error.message);
        }
      }
    } catch (error: any) {
      console.error('שגיאה בטעינת נתונים:', error);
      alert('שגיאה בטעינת נתונים: ' + (error.message || 'אירעה שגיאה'));
    } finally {
      setLoading(false);
    }
  }, [user, selectedHousehold]);

  // טעינת הפריטים מהדאטאבייס בטעינת הקומפוננטה
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  // הפעלת מצב קניות אוטומטי כאשר יש מוצר בעגלה
  useEffect(() => {
    // בודק אם יש לפחות מוצר אחד בעגלה
    const hasItemInCart = items.some(item => item.status === 'inCart');
    
    // אם יש פריט בעגלה, מפעיל את מצב הקניות אוטומטית
    if (hasItemInCart && !isShoppingActive) {
      setIsShoppingActive(true);
    }
  }, [items, isShoppingActive]);

  // טעינת היסטוריית רכישות
  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('מתחיל טעינת היסטוריה...');
      
      // טעינת היסטוריה ישירות מהפיירסטור בשאילתה מקיפה
      let historyQuery;
      
      if (selectedHousehold) {
        console.log(`מחפש מוצרים במצב "purchased" במשק בית ${selectedHousehold.id}`);
        
        // שאילתה לכל הפריטים ששייכים למשק הבית במצב purchased
        historyQuery = query(
          collection(db, 'items'),
          where('householdId', '==', selectedHousehold.id),
          where('status', '==', 'purchased')
        );
      } else {
        console.log(`מחפש מוצרים אישיים במצב "purchased" של משתמש ${user.uid}`);
        
        // שאילתה לפריטים אישיים של המשתמש במצב purchased
        historyQuery = query(
          collection(db, 'items'),
          where('addedBy', '==', user.uid),
          where('householdId', '==', null),
          where('status', '==', 'purchased')
        );
      }
      
      // ביצוע השאילתה
      console.log('ביצוע שאילתת היסטוריה...');
      const querySnapshot = await getDocs(historyQuery);
      console.log(`נמצאו ${querySnapshot.size} פריטים בהיסטוריה`);
      
      // עיבוד התוצאות
      const historyData: {
        name: string;
        imageUrl?: string;
        purchaseCount: number;
        lastPurchaseDate?: Date;
        lastPartialPurchaseDate?: Date;
      }[] = [];
      const frequentNames: string[] = [];
      
      // לוג מפורט של כל פריט
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // בדיקת תקינות של כל השדות
        console.log(`נמצא פריט בהיסטוריה: ${data.name || 'ללא שם'}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  סטטוס: ${data.status || 'לא מוגדר'}`);
        console.log(`  תמונה: ${data.imageUrl ? 'יש' : 'אין'}`);
        console.log(`  נקנה: ${data.purchaseCount || 0} פעמים`);
        console.log(`  משק בית: ${data.householdId || 'אישי'}`);
        console.log(`  משתמש: ${data.addedBy}`);
        console.log(`  תאריך רכישה אחרון: ${data.lastPurchaseDate ? data.lastPurchaseDate.toDate().toLocaleDateString('he-IL') : 'לא קיים'}`);
        
        // מוסיף את הפריט להיסטוריה גם אם אין purchaseCount
        historyData.push({
          name: data.name,
          imageUrl: data.imageUrl || undefined,
          purchaseCount: data.purchaseCount || 0,
          lastPurchaseDate: data.lastPurchaseDate?.toDate(),
          lastPartialPurchaseDate: data.lastPartialPurchaseDate?.toDate()
        });
        
        if (!frequentNames.includes(data.name)) {
          frequentNames.push(data.name);
        }
      });
      
      // מיון התוצאות לפי תדירות רכישה (גם אם 0)
      historyData.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
      
      console.log(`נטענו ${historyData.length} פריטים להיסטוריה:`, 
        historyData.map(item => `${item.name} (${item.purchaseCount || 0})`).join(', '));
      
      // עדכון הסטייט
      setHistoryItems(historyData);
      setFrequentItems(frequentNames);
      
    } catch (error) {
      console.error('שגיאה בטעינת היסטוריה:', error);
    }
  }, [user, selectedHousehold]);

  // טעינת ההיסטוריה באופן אוטומטי בכל שינוי של משק הבית
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, selectedHousehold, loadHistory]);
  
  // טעינת ההיסטוריה כאשר פותחים את המודל
  useEffect(() => {
    if (isHistoryModalOpen && user) {
      console.log('מודל היסטוריה נפתח - טעינת היסטוריה מחדש');
      loadHistory();
    }
  }, [isHistoryModalOpen, user, loadHistory]);

  // הוספת פריט חדש לרשימת הקניות
  const handleAddItem = async (
    itemName: string, 
    quantity: number, 
    image?: File,
    existingImageUrl?: string
  ) => {
    console.log(`מתחיל הוספת פריט: ${itemName}, כמות: ${quantity}`);
    
    if (!user || !itemName.trim()) return;
    
    try {
      // חיפוש המוצר בדאטאבייס לפי שם ושייכות למשתמש או למשק בית
      let itemQuery;
      
      if (selectedHousehold) {
        // נחפש רק מוצרים במשק הבית הנוכחי
        itemQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName.trim()),
          where('householdId', '==', selectedHousehold.id)
        );
      } else {
        // נחפש רק מוצרים אישיים של המשתמש
        itemQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName.trim()),
          where('addedBy', '==', user.uid),
          where('householdId', '==', null)
        );
      }
      
      const querySnapshot = await getDocs(itemQuery);
      const existingItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status,
        householdId: doc.data().householdId
      }));
      
      console.log('נמצאו פריטים קיימים:', existingItems.length);
      
      // חיפוש מוצר פעיל (במצב שאינו purchased)
      const activeItem = existingItems.find(item => 
        item.status !== 'purchased');
      
      if (activeItem) {
        // עדכון המוצר הקיים
        console.log('נמצא מוצר פעיל:', activeItem.id);
        
        await shoppingListService.updateItem(activeItem.id, {
          status: 'pending',
          quantity: quantity
        });
        
        // עדכון לוקאלי של הרשימה
        setItems(prev => {
          const exists = prev.some(item => item.id === activeItem.id);
          
          if (exists) {
            return prev.map(item => 
              item.id === activeItem.id 
                ? { ...item, status: 'pending', quantity } 
                : item
            );
          } else {
            // אם המוצר לא נמצא ברשימה המקומית, נוסיף אותו
            return [...prev, {
              id: activeItem.id,
              name: itemName.trim(),
              quantity,
              status: 'pending',
              imageUrl: existingImageUrl || null,
              householdId: selectedHousehold ? selectedHousehold.id : null,
              addedBy: user.uid
            } as Item];
          }
        });
      } else {
        // אם המוצר כבר קיים אך במצב purchased, או לא קיים בכלל - נוסיף אותו כמוצר חדש
        // נשתמש בשירות להוספת מוצרים
        
        let imageUrl = existingImageUrl;
        if (image) {
          // העלאת התמונה אם יש
          imageUrl = await storageService.uploadImage(user.uid, image, 'items');
        }
        
        const newItemData = {
          name: itemName.trim(),
          quantity: quantity,
          addedBy: user.uid,
          householdId: selectedHousehold ? selectedHousehold.id : null,
          imageUrl: imageUrl || null
        };
        
        const itemId = await shoppingListService.addItem(newItemData);
        
        // עדכון לוקאלי של הרשימה
        setItems(prev => [...prev, { 
          ...newItemData, 
          id: itemId,
          purchaseCount: 0,
          householdId: selectedHousehold ? selectedHousehold.id : null
        } as Item]);
        
        console.log('נוסף מוצר חדש:', itemId);
      }
    } catch (error) {
      console.error('שגיאה בהוספת פריט:', error);
      alert('שגיאה בהוספת פריט. אנא נסה שוב.');
    }
  };

  // מחיקת פריט
  const handleDeleteItem = async (id: string) => {
    if (!user) return;

    try {
      // מוצא את הפריט ברשימה המקומית
      const item = items.find(item => item.id === id);
      if (!item) return;

      const itemRef = doc(db, 'items', id);

      if (item.purchaseCount && item.purchaseCount > 0) {
        // אם המוצר נקנה בעבר, רק משנים את הסטטוס שלו ל-purchased
        console.log(`פריט ${id} נקנה בעבר ${item.purchaseCount} פעמים, משנה סטטוס ל-purchased`);
        await updateDoc(itemRef, {
          status: 'purchased',
          updatedAt: serverTimestamp()
        });
      } else {
        // אם המוצר לא נקנה אף פעם, מוחקים אותו לגמרי
        console.log(`פריט ${id} לא נקנה אף פעם, מוחק מה-DB`);
        await deleteDoc(itemRef);
      }
      
      // מסיר את הפריט מהרשימה המקומית בכל מקרה
      setItems(prev => prev.filter(item => item.id !== id));
      console.log(`פריט ${id} טופל בהצלחה`);

      // מעדכן את ההיסטוריה
      await loadHistory();
    } catch (error) {
      console.error('שגיאה במחיקת פריט:', error);
    }
  };

  // עדכון סטטוס פריט
  const handleToggleStatus = async (id: string, status: Item['status']) => {
    if (!user) return;
    
    try {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
        setItems(prev =>
          prev.map(item =>
          item.id === id ? { ...item, status } : item
          )
        );

      console.log(`עודכן סטטוס של פריט ${id} ל-${status}`);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
    }
  };

  // פתיחת מודל עריכת כמות
  const handleEditQuantity = (item: Item) => {
    setSelectedItem(item);
    setIsEditQuantityModalOpen(true);
  };

  // עדכון כמות
  const handleSaveQuantity = async (id: string, newQuantity: number) => {
    if (!user) return;

    try {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });
      
      setItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
      
      setSelectedItem(null);
      console.log(`כמות של פריט ${id} עודכנה ל-${newQuantity}`);
    } catch (error) {
      console.error('שגיאה בעדכון כמות:', error);
    }
  };

  // הוספת פריט מההיסטוריה
  const handleAddFromHistory = async (itemName: string, quantity: number = 1, imageUrl?: string) => {
    if (!user) return;
    
    try {
      // חיפוש המוצר בדאטאבייס - חשוב: נחפש רק מוצרים ששייכים למשתמש או למשק הבית שלו
      let householdQuery;
      
      if (selectedHousehold) {
        // חיפוש בתוך מוצרי משק הבית
        householdQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName),
          where('householdId', '==', selectedHousehold.id)
        );
      } else {
        // חיפוש רק במוצרים האישיים של המשתמש
        householdQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName),
          where('addedBy', '==', user.uid),
          where('householdId', '==', null)
        );
      }
      
      const querySnapshot = await getDocs(householdQuery);
      
      console.log(`חיפוש מוצר "${itemName}" מההיסטוריה:`, 
        querySnapshot.size, 'תוצאות',
        selectedHousehold ? `במשק בית ${selectedHousehold.id}` : 'אישי');
      
      if (!querySnapshot.empty) {
        // מצאנו את המוצר ששייך למשתמש או למשק הבית - נעדכן את הסטטוס שלו ל-PENDING
        const doc = querySnapshot.docs[0]; // לוקחים את הראשון במקרה שיש כמה
        const existingItem = doc.data();
        
        console.log('נמצא מוצר קיים בהיסטוריה שלנו:', doc.id, 
          'שייך למשק בית:', existingItem.householdId || 'אישי',
          'נוסף על ידי:', existingItem.addedBy);
        
        // עדכון הפריט
        await shoppingListService.updateItem(doc.id, {
          status: 'pending',
          quantity: quantity
        });
        
        // עדכון לוקאלי
        setItems(prev => {
          // בודקים אם המוצר כבר קיים ברשימה
          const itemExists = prev.some(item => item.id === doc.id);
          
          if (itemExists) {
            // אם קיים, מעדכנים את הסטטוס והכמות
            return prev.map(item =>
              item.id === doc.id
                ? { ...item, status: 'pending', quantity }
                : item
            );
          } else {
            // אם לא קיים, מוסיפים אותו לרשימה
            return [...prev, {
              id: doc.id,
              name: itemName,
              status: 'pending',
              quantity: quantity,
              imageUrl: existingItem.imageUrl || null,
              purchaseCount: existingItem.purchaseCount || 0,
              lastPurchaseDate: existingItem.lastPurchaseDate?.toDate(),
              addedBy: existingItem.addedBy,
              householdId: existingItem.householdId
            } as Item];
          }
        });
        
        console.log('מוצר הועבר למצב pending:', itemName);
      } else {
        // המוצר לא נמצא במשק הבית או ברשימה האישית - ניצור פריט חדש
        console.log('יוצר מוצר חדש עבור משתמש/משק בית:', itemName);
        await handleAddItem(itemName, quantity, undefined, imageUrl);
      }
      
      // טעינה מחדש של ההיסטוריה כדי לעדכן את הרשימה
      await loadHistory();
      
      setIsHistoryModalOpen(false);
    } catch (error) {
      console.error('שגיאה בהוספת פריט מההיסטוריה:', error);
    }
  };

  // מחיקת פריט מההיסטוריה
  const handleDeleteFromHistory = async (itemName: string) => {
    if (!user) return;
    
    try {
      // קבלת כל הפריטים עם השם הזה, בהתאם למשק הבית או למשתמש
      let historyQuery;
      
      if (selectedHousehold) {
        // חיפוש בפריטים של משק הבית
        historyQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName),
          where('householdId', '==', selectedHousehold.id),
          where('status', '==', 'purchased')
        );
      } else {
        // חיפוש בפריטים אישיים של המשתמש
        historyQuery = query(
          collection(db, 'items'),
          where('name', '==', itemName),
          where('addedBy', '==', user.uid),
          where('householdId', '==', null),
          where('status', '==', 'purchased')
        );
      }
      
      const querySnapshot = await getDocs(historyQuery);
      
      // עדכון כל פריט כדי לאפס את מונה הרכישות
      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, { 
          purchaseCount: 0,
          lastPurchaseDate: deleteField(),
          lastPartialPurchaseDate: deleteField()
        });
      }
      
      // עדכון הסטייט המקומי
      setHistoryItems(prev => prev.filter(item => item.name !== itemName));
      setFrequentItems(prev => prev.filter(name => name !== itemName));
      
    } catch (error) {
      console.error('שגיאה במחיקה מההיסטוריה:', error);
    }
  };

  // העלאת תמונה
  const handleUploadImage = async (file: File, itemId: string): Promise<string> => {
    if (!user) throw new Error('המשתמש אינו מחובר');
    
    try {
      const imageUrl = await storageService.uploadImage(user.uid, file, 'items');
      await shoppingListService.updateItem(itemId, { imageUrl });
      
      // עדכון הסטייט המקומי
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, imageUrl } : item
        )
      );
      
      return imageUrl;
    } catch (error) {
      console.error('שגיאה בהעלאת תמונה:', error);
      throw error;
    }
  };

  // חישוב סטטיסטיקות קניות
  const getShoppingStats = () => {
    // פריטים פעילים הם אלה שלא במצב purchased
    const activeItems = items.filter(item => item.status !== 'purchased');
    const totalItems = activeItems.length;
    
    const itemsInCart = activeItems.filter(item => item.status === 'inCart').length;
    const itemsMissing = activeItems.filter(item => item.status === 'missing').length;
    const itemsPartial = activeItems.filter(item => item.status === 'partial').length;
    const itemsPending = activeItems.filter(item => item.status === 'pending').length;
    
    // כמות פריטים שנקנו - נשמור לסטטיסטיקות אבל לא נציג ברשימה הפעילה
    const itemsPurchased = items.filter(item => item.status === 'purchased').length;
    
    return {
      totalItems,
      itemsInCart,
      itemsMissing,
      itemsPartial,
      itemsPending,
      itemsPurchased,
      progress: totalItems > 0 ? ((itemsInCart + itemsMissing + itemsPartial) / totalItems) * 100 : 0
    };
  };

  const stats = getShoppingStats();

  // חישוב נתונים לגרף פס
  const getBarChartData = () => {
    const segments = [
      { 
        value: stats.itemsInCart, 
        color: '#10B981', // ירוק
        label: 'בעגלה',
        percentage: stats.totalItems > 0 ? (stats.itemsInCart / stats.totalItems) * 100 : 0 
      },
      { 
        value: stats.itemsPartial, 
        color: '#F59E0B', // צהוב
        label: 'חלקי',
        percentage: stats.totalItems > 0 ? (stats.itemsPartial / stats.totalItems) * 100 : 0 
      },
      { 
        value: stats.itemsMissing, 
        color: '#EF4444', // אדום
        label: 'חסר',
        percentage: stats.totalItems > 0 ? (stats.itemsMissing / stats.totalItems) * 100 : 0 
      },
      { 
        value: stats.itemsPending, 
        color: '#6B7280', // אפור
        label: 'בהמתנה',
        percentage: stats.totalItems > 0 ? (stats.itemsPending / stats.totalItems) * 100 : 0 
      }
    ];

    // מחזיר רק את מקטעי הגרף שיש בהם ערך
    return segments.filter(segment => segment.value > 0);
  };

  const barChartData = getBarChartData();

  // מיון פריטים לפי סטטוס
  const sortedItems = [...items].filter(item => item.status !== 'purchased').sort((a, b) => {
    if (isShoppingActive) {
      // כאשר הקניות פעילות, סדר שונה - פריטים בהמתנה מוצגים ראשונים
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
    } else {
      // סדר רגיל - מיון לפי סטטוס
      // פריטים בהמתנה בהתחלה
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // אחר כך פריטים חלקיים
      if (a.status === 'partial' && b.status !== 'partial') return -1;
      if (a.status !== 'partial' && b.status === 'partial') return 1;
      
      // אחר כך פריטים חסרים
      if (a.status === 'missing' && b.status !== 'missing') return -1;
      if (a.status !== 'missing' && b.status === 'missing') return 1;
      
      // אחר כך פריטים בעגלה
      if (a.status === 'inCart' && b.status !== 'inCart') return -1;
      if (a.status !== 'inCart' && b.status === 'inCart') return 1;
    }
    
    return 0;
  });
  
  // התצוגה הראשית מציגה רק פריטים שלא purchased
  const displayItems = sortedItems;

  // כאשר לוחצים על כפתור סיום קניות, מבטלים את מצב הקניות
  const handleFinishShopping = async () => {
    // השארת הלוגיקה הקיימת
    try {
      setLoading(true);
      
      // מחלקים את הפריטים לפי סטטוס
      const itemsInCart = items.filter(item => item.status === 'inCart');
      const missingItems = items.filter(item => item.status === 'missing');
      const partialItems = items.filter(item => item.status === 'partial');
      
      // מטפלים בפריטים שנמצאים בעגלה - מעבירים אותם לסטטוס purchased
      if (itemsInCart.length > 0) {
        await handleProcessInCartItems(itemsInCart);
      }
      
      // מטפלים בפריטים חסרים - מחזירים אותם למצב pending אם יש
      if (missingItems.length > 0) {
        await handleResetMissingItems(missingItems);
      }
      
      // אם יש פריטים חלקיים, פותחים מודל לעדכון כמויות
      if (partialItems.length > 0) {
        setPartialItems(partialItems);
        setIsPartialItemModalOpen(true);
      }
      
      console.log('סיום קניות הושלם בהצלחה!');
      
      // מבטלים מצב קניות פעיל
      setIsShoppingActive(false);
    } catch (error) {
      console.error('שגיאה בסיום קניות:', error);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה חדשה להפעלת/ביטול מצב הקניות
  const toggleShoppingMode = () => {
    setIsShoppingActive(!isShoppingActive);
  };

  // טיפול בפריטים שנקנו במלואם
  const handleProcessInCartItems = async (itemsInCart: Item[]) => {
    try {
      console.log(`מעבד ${itemsInCart.length} פריטים שנקנו במלואם ועובר למצב 'purchased'`);
      
      for (const item of itemsInCart) {
        try {
          const itemRef = doc(db, 'items', item.id);
          
          // הזהירות: לא נשנה את householdId אם כבר יש לפריט
          const itemDoc = await getDoc(itemRef);
          const existingHouseholdId = itemDoc.exists() ? itemDoc.data().householdId : null;
          const finalHouseholdId = existingHouseholdId !== undefined ? existingHouseholdId : (selectedHousehold ? selectedHousehold.id : undefined);
          
          // עדכון סטטוס הפריט ל-purchased ועדכון מונה רכישות
          await updateDoc(itemRef, {
            status: 'purchased',
            purchaseCount: (item.purchaseCount || 0) + 1,
            lastPurchaseDate: Timestamp.now(),
            updatedAt: serverTimestamp(),
            householdId: finalHouseholdId
          });
          
          console.log(`פריט ${item.name} סומן כנרכש (purchased), householdId: ${finalHouseholdId}`);
        } catch (error) {
          console.error(`שגיאה בטיפול בפריט ${item.name}:`, error);
        }
      }
      
      // עדכון ברשימה המקומית - לשנות את כל הפריטים שהיו ב-inCart ל-purchased
      setItems(prev =>
        prev.map(item =>
        item.status === 'inCart' ? { 
          ...item, 
          status: 'purchased', 
          purchaseCount: (item.purchaseCount || 0) + 1,
          lastPurchaseDate: new Date(),
          // שמירת householdId הקיים של הפריט אם יש כזה
          householdId: item.householdId !== undefined ? item.householdId : (selectedHousehold ? selectedHousehold.id : undefined)
        } : item
      )
    );
      
      // טעינה מחדש של ההיסטוריה באופן מפורש ומיידי
      console.log('טוען היסטוריה מיד לאחר עדכון פריטים ל-purchased');
      await loadHistory();
      
      // טעינה חוזרת של היסטוריה בהדרגה - לפעמים פיירבייס לא מחזיר את הנתונים המעודכנים מיד
      const delayTimes = [100, 500, 1000, 3000];
      
      for (const delay of delayTimes) {
        setTimeout(async () => {
          console.log(`טוען היסטוריה שוב לאחר ${delay}ms`);
          await loadHistory();
        }, delay);
      }
      
      // מחכים גם לטעינה מחדש של הנתונים הרגילים
      setTimeout(async () => {
        await loadUserData();
      }, 500);
      
    } catch (error) {
      console.error('שגיאה בעיבוד פריטים שנרכשו:', error);
    }
  };

  // איפוס פריטים חסרים
  const handleResetMissingItems = async (missingItems: Item[]) => {
    for (const item of missingItems) {
      try {
        await shoppingListService.updateItemStatus(item.id, 'pending');
      } catch (error) {
        console.error(`שגיאה באיפוס פריט ${item.name}:`, error);
      }
    }
    
    // עדכון הרשימה המקומית
      setItems(prev =>
      prev.map(item => 
        item.status === 'missing' ? { ...item, status: 'pending' } : item
      )
    );
  };

  // שמירת פריטים חלקיים
  const handleSavePartialItems = async (updates: { id: string; newQuantity: number }[]) => {
    for (const update of updates) {
      const item = items.find(i => i.id === update.id);
      if (!item) continue;
      
      try {
        // עדכון הכמות
        await shoppingListService.updateItem(update.id, { quantity: update.newQuantity });
        
        // רישום רכישה חלקית
        await shoppingListService.recordPurchase(update.id, true);
        
        // עדכון הסטטוס ל-pending
        await shoppingListService.updateItemStatus(update.id, 'pending');
      } catch (error) {
        console.error(`שגיאה בעדכון פריט חלקי ${update.id}:`, error);
      }
    }
    
    // סגירת המודל
    setIsPartialItemModalOpen(false);
    
    // עדכון הסטייט המקומי לפני טעינה מחדש
    setItems(prev => 
      prev.map(item => 
        updates.some(update => update.id === item.id)
          ? { ...item, status: 'pending', quantity: updates.find(u => u.id === item.id)?.newQuantity || item.quantity }
          : item
      )
    );
    
    // טעינה מחדש
    await loadUserData();
    await loadHistory();
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      {/* כותרת ראשית וכפתורי פעולה */}
      <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">רשימת קניות</h1>
            {selectedHousehold && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <Users className="w-4 h-4" />
                <span>{selectedHousehold.name}</span>
              </div>
            )}
          </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
            onClick={() => {
              const ev = new CustomEvent('openHouseholdSwitcher');
              window.dispatchEvent(ev);
            }}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="ניהול משק בית"
          >
            <Home className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setIsHelpModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100"
              aria-label="עזרה"
            >
            <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
            <button
            onClick={() => signOut(auth)}
            className="p-2 rounded-full hover:bg-gray-100"
              aria-label="התנתק"
            >
            <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

      {/* טופס הוספת פריט */}
      <AddItemForm 
        onAddItem={handleAddItem}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        historyItems={historyItems}
        activeItems={items.filter(item => item.status === 'pending' || item.status === 'missing')}
      />

      {/* כפתור הפעלת מצב קניות - מוצג רק אם יש פריטים ואין אף פריט בעגלה */}
      {displayItems.length > 0 && !items.some(item => item.status === 'inCart') && (
        <div className="mb-4">
          <button
            onClick={toggleShoppingMode}
            className={`w-full py-2 px-4 rounded-md text-white font-medium shadow transition-colors ${
              isShoppingActive ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isShoppingActive ? 'סגור מצב קניות' : 'התחל קניות'}
          </button>
        </div>
      )}

      {/* סטטיסטיקות - מוצגות רק במצב קניות פעיל */}
      {isShoppingActive && displayItems.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">התקדמות קניות:</span>
            <span className="text-sm font-medium">{Math.round(stats.progress)}%</span>
          </div>

          {/* גרף פס אופקי */}
          {stats.totalItems > 0 && (
            <div className="mb-4">
              <div className="h-3 w-full bg-gray-200 rounded-md overflow-hidden flex">
                {barChartData.map((segment, index) => (
                  <div 
                    key={index} 
                    className="h-full" 
                    style={{ 
                      width: `${segment.percentage}%`, 
                      backgroundColor: segment.color 
                    }}
                    title={`${segment.label}: ${segment.value}`}
                  ></div>
                ))}
              </div>
              
              <div className="flex flex-wrap justify-between text-xs text-gray-500 mt-2">
                {barChartData.map((segment, index) => (
                  <div key={index} className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }}></div>
                    <span>
                      {segment.label}: {segment.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* מידע מספרי */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-gray-800">{stats.itemsPending}</span>
              <span className="text-xs text-gray-500">בהמתנה</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-green-600">{stats.itemsInCart}</span>
              <span className="text-xs text-gray-500">בעגלה</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-yellow-500">{stats.itemsPartial}</span>
              <span className="text-xs text-gray-500">חלקי</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-red-500">{stats.itemsMissing}</span>
              <span className="text-xs text-gray-500">חסר</span>
            </div>
          </div>
        </div>
      )}

      {/* רשימת הפריטים */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-l-blue-600 mb-2"></div>
          <p className="text-gray-600">טוען פריטים...</p>
        </div>
      ) : displayItems.length > 0 ? (
        <div className="space-y-3">
          {sortedItems.map(item => (
            <ShoppingItem
              key={item.id}
              item={item}
              onDelete={handleDeleteItem}
              onEditQuantity={handleEditQuantity}
              onToggleStatus={handleToggleStatus}
              onUploadImage={handleUploadImage}
            />
          ))}

          {/* כפתור סיום קניות - מוצג רק כשיש פריטים בעגלה */}
          {items.some(item => item.status === 'inCart') && (
            <div className="mt-6">
              <button
                onClick={handleFinishShopping}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-semibold"
              >
                סיום קניות
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="flex justify-center mb-4">
            <ShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">הרשימה ריקה</h3>
          <p className="text-gray-500">
            הוסף פריטים לרשימת הקניות שלך
          </p>
        </div>
      )}

      {/* מודלים */}
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />

        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          frequentItems={frequentItems}
        onItemSelect={handleAddFromHistory}
        historyItemsData={historyItems}
          onDeleteFromHistory={handleDeleteFromHistory}
        />

      {selectedItem && (
          <EditQuantityModal
          isOpen={isEditQuantityModalOpen}
          onClose={() => setIsEditQuantityModalOpen(false)}
          item={selectedItem}
          onSave={handleSaveQuantity}
        />
      )}

        <PartialItemModal
        isOpen={isPartialItemModalOpen}
        onClose={() => setIsPartialItemModalOpen(false)}
          items={partialItems}
        onSave={handleSavePartialItems}
        />
    </div>
  );
}