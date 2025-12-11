import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ShoppingCart, Milk, Apple, Beef, Fish, Cake, Candy, Coffee, Droplets, Heart, Package } from "lucide-react";
import { useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Modal from 'react-modal';
import Header from './shared/Header';
import { Item, ShoppingCategory } from '../types/shopping';
import { HelpModal } from './shopping/HelpModal';
import { HistoryModal } from './shopping/HistoryModal';
import { EditQuantityModal } from './shopping/EditQuantityModal';
import { PartialItemModal } from './shopping/PartialItemModal';
import { ShoppingItem } from './shopping/ShoppingItem';
import { AddItemForm } from './shopping/AddItemForm';
import { shoppingListService, storageService } from '../services/firebase';
import { aiService } from '../services/ai.service';
import { useHousehold } from '../contexts/HouseholdContext';
import { usePageVisibility } from '../utils/usePageVisibility';
import { useAuthModal } from '../contexts/AuthModalContext';
import { useFirstTimeUser } from '../hooks/useFirstTimeUser';
import { ScrollToTop } from './shared/ScrollToTop';

Modal.setAppElement('#root');

// מיפוי קטגוריות לאייקונים ולצבעים
const CATEGORY_CONFIG: Record<ShoppingCategory, { emoji: string; color: string; bgColor: string }> = {
  'פירות, ירקות ופיצוחים': { emoji: '🥬', color: 'text-green-700', bgColor: 'bg-green-100' },
  'מוצרי חלב וביצים': { emoji: '🥛', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'בשר, עוף ודגים': { emoji: '🥩', color: 'text-red-700', bgColor: 'bg-red-100' },
  'לחמים ומוצרי מאפה': { emoji: '🍞', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'משקאות, יין, אלכוהול וסנקים': { emoji: '🍷', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'מזון מקורר, קפוא ונקניקים': { emoji: '🧊', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  'בישול אפיה ושימורים': { emoji: '🥫', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'חטיפים מתוקים ודגני בוקר': { emoji: '🍫', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  'פארם וטיפוח': { emoji: '🧴', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  'עולם התינוקות': { emoji: '👶', color: 'text-sky-700', bgColor: 'bg-sky-100' },
  'ניקיון לבית וחד פעמי': { emoji: '🧹', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'ויטמינים ותוספי תזונה': { emoji: '💊', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  'כללי': { emoji: '📦', color: 'text-gray-600', bgColor: 'bg-gray-200' },
};

export default function ShoppingList() {
  const { selectedHousehold } = useHousehold();
  const [user] = useAuthState(auth);
  const { openAuthModal } = useAuthModal();
  const { markOnboardingAsSeen } = useFirstTimeUser();
  const { isActive } = usePageVisibility({ inactivityTimeout: 10, enableInactivityTimeout: true });
  const location = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // Listen for help modal trigger after household creation/join
  // This ensures the tutorial is shown ONLY ONCE after registration when user creates/joins household
  useEffect(() => {
    const handler = () => {
      // Only show if user is logged in
      if (user) {
        setIsHelpModalOpen(true);
        // Mark as seen so it won't show again
        markOnboardingAsSeen();
      }
    };
    window.addEventListener('openHelpModal', handler);
    return () => window.removeEventListener('openHelpModal', handler);
  }, [user, markOnboardingAsSeen]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditQuantityModalOpen, setIsEditQuantityModalOpen] = useState(false);
  const [isPartialItemModalOpen, setIsPartialItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [historyItems, setHistoryItems] = useState<{
    id: string;
    name: string; 
    imageUrl?: string; 
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[]>([]);
  const [frequentItems, setFrequentItems] = useState<string[]>([]);
  const [partialItems, setPartialItems] = useState<Item[]>([]);
  const [isShoppingActive, setIsShoppingActive] = useState(false);

  // סגירת מצב קניות אוטומטית כשאין פריטים במצב pending
  const pendingCount = useMemo(() => items.filter(item => item.status === 'pending').length, [items]);
  const activeShoppingCount = useMemo(() => 
    items.filter(item => item.status === 'inCart' || item.status === 'partial' || item.status === 'missing').length, 
    [items]
  );
  
  useEffect(() => {
    // סוגר את מצב הקניות רק אם אין pending וגם אין פריטים בעגלה/חלקי/חסר
    if (pendingCount === 0 && activeShoppingCount === 0 && isShoppingActive) {
      setIsShoppingActive(false);
    }
  }, [pendingCount, activeShoppingCount, isShoppingActive]);

  // פונקציה לקבלת אייקון לקטגוריה
  const getCategoryIcon = (category?: ShoppingCategory) => {
    switch (category) {
      case 'פירות, ירקות ופיצוחים':
        return <Apple className="w-5 h-5 text-green-600" />;
      case 'מוצרי חלב וביצים':
        return <Milk className="w-5 h-5 text-blue-600" />;
      case 'בשר, עוף ודגים':
        return <Beef className="w-5 h-5 text-red-600" />;
      case 'לחמים ומוצרי מאפה':
        return <Cake className="w-5 h-5 text-amber-600" />;
      case 'משקאות, יין, אלכוהול וסנקים':
        return <Coffee className="w-5 h-5 text-purple-600" />;
      case 'מזון מקורר, קפוא ונקניקים':
        return <Fish className="w-5 h-5 text-cyan-600" />;
      case 'בישול אפיה ושימורים':
        return <Package className="w-5 h-5 text-yellow-600" />;
      case 'חטיפים מתוקים ודגני בוקר':
        return <Candy className="w-5 h-5 text-pink-600" />;
      case 'פארם וטיפוח':
        return <Heart className="w-5 h-5 text-purple-600" />;
      case 'עולם התינוקות':
        return <Heart className="w-5 h-5 text-pink-600" />;
      case 'ניקיון לבית וחד פעמי':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'ויטמינים ותוספי תזונה':
        return <Heart className="w-5 h-5 text-green-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  // הסרת הכפילות: onSnapshot למטה מספק גם טעינה ראשונית וגם עדכונים בזמן אמת

  // בדיקה שאנחנו בטאב קניות
  const isShoppingRoute = location.pathname === '/';

  // מאזין בזמן-אמת לשינויים ברשימת הפריטים עם Page Visibility + Route אופטימיזציה
  useEffect(() => {
    if (!isShoppingRoute) {
      setLoading(false);
      return;
    }

    // אם אין משתמש, רק מציג רשימה ריקה
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (!isActive) {
      // אם הטאב לא פעיל - לא מתחיל onSnapshot
      return;
    }



    let q;
    if (selectedHousehold) {
      q = query(
        collection(db, 'items'),
        where('householdId', '==', selectedHousehold.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'items'),
        where('addedBy', '==', user.uid),
        where('householdId', '==', null),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, snapshot => {
      const liveItems: Item[] = snapshot.docs.map(d => {
        const data = d.data();
        // וידוא סטטוס תקין
        let status = data.status;
        if (!status || !['pending', 'inCart', 'missing', 'partial', 'purchased'].includes(status)) {
          status = 'pending';
        }
        return {
          id: d.id,
          name: data.name,
          quantity: data.quantity,
          status,
          imageUrl: data.imageUrl || null,
          purchaseCount: data.purchaseCount || 0,
          lastPurchaseDate: data.lastPurchaseDate?.toDate(),
          lastPartialPurchaseDate: data.lastPartialPurchaseDate?.toDate(),
          householdId: data.householdId,
          addedBy: data.addedBy,
          category: data.category,
          createdAt: data.createdAt
        } as Item;
      });
      
      // עדכון רק אם יש שינוי אמיתי (למניעת re-renders מיותרים)
      setItems(prev => {
        if (prev.length !== liveItems.length) {
          return liveItems;
        }
        // בדיקה אם יש שינוי בתוכן
        const hasChanges = liveItems.some((newItem, idx) => {
          const oldItem = prev.find(p => p.id === newItem.id);
          if (!oldItem) return true;
          return (
            oldItem.status !== newItem.status ||
            oldItem.quantity !== newItem.quantity ||
            oldItem.name !== newItem.name ||
            oldItem.imageUrl !== newItem.imageUrl
          );
        });
        return hasChanges ? liveItems : prev;
      });
      
      setLoading(false);
    });

    return () => {

      unsubscribe();
    };
  }, [user, selectedHousehold, isActive, isShoppingRoute]);

  // הפעלת מצב קניות אוטומטי כאשר יש מוצר בעגלה
  const inCartCount = useMemo(() => items.filter(item => item.status === 'inCart').length, [items]);
  
  useEffect(() => {
    // אם יש פריט בעגלה, מפעיל את מצב הקניות אוטומטית
    if (inCartCount > 0 && !isShoppingActive) {
      setIsShoppingActive(true);
    }
  }, [inCartCount, isShoppingActive]);

  // טעינת היסטוריית רכישות
  const loadHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      let historyQuery;
      
      if (selectedHousehold) {
        // שאילתה לכל הפריטים ששייכים למשק הבית
        historyQuery = query(
          collection(db, 'items'),
          where('householdId', '==', selectedHousehold.id)
        );
      } else {
        // שאילתה לפריטים אישיים של המשתמש
        historyQuery = query(
          collection(db, 'items'),
          where('addedBy', '==', user.uid),
          where('householdId', '==', null)
        );
      }
      
      // ביצוע השאילתה
      const querySnapshot = await getDocs(historyQuery);

      // קיבוץ לפי שם מוצר (case-insensitive) ושמירת ההופעה האחרונה בלבד
      const grouped = new Map<string, { id: string; name: string; imageUrl?: string; purchaseCount: number; lastPurchaseDate?: Date; lastPartialPurchaseDate?: Date; category?: string }>();

      querySnapshot.forEach((snap) => {
        const data = snap.data();
        const rawName: string = (data.name || '').toString();
        const key = rawName.trim().toLowerCase();
        if (!key) return;

                  const incoming = {
          id: snap.id,
          name: rawName,
          imageUrl: data.imageUrl || undefined,
          purchaseCount: data.purchaseCount || 0,
          lastPurchaseDate: data.lastPurchaseDate?.toDate(),
          lastPartialPurchaseDate: data.lastPartialPurchaseDate?.toDate(),
          category: data.category
        };

        const current = grouped.get(key);
        if (!current) {
          grouped.set(key, incoming);
        } else {
          const curTime = current.lastPurchaseDate ? current.lastPurchaseDate.getTime() : 0;
          const incTime = incoming.lastPurchaseDate ? incoming.lastPurchaseDate.getTime() : 0;
          if (incTime >= curTime) {
            grouped.set(key, {
              ...incoming,
              imageUrl: incoming.imageUrl || current.imageUrl,
              purchaseCount: Math.max(current.purchaseCount || 0, incoming.purchaseCount || 0),
              category: incoming.category || current.category
            });
          }
        }
      });

      const historyData = Array.from(grouped.entries()).map(([_, item]) => ({
        ...item,
        id: item.id || '' // Adding id field
      })).sort(
        (a, b) => (b.lastPurchaseDate?.getTime() || 0) - (a.lastPurchaseDate?.getTime() || 0)
      );

      setHistoryItems(historyData);
      setFrequentItems(historyData.map(h => h.name));
      
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
  
      loadHistory();
    }
  }, [isHistoryModalOpen, user, loadHistory]);

  // פונקציית עזר לבדיקה והוספת קטגוריה למוצר אם חסרה
  const ensureItemHasCategory = useCallback((item: Item, forceRecategorize: boolean = false) => {
    // אם forceRecategorize = true (שינוי שם), תמיד מסווג מחדש
    // אחרת, רק אם אין קטגוריה או שהיא 'כללי'
    if (!forceRecategorize && item.category && item.category !== 'כללי') {
      return;
    }
    
    // קורא ל-AI לסווג את המוצר
    aiService.categorizeItem(item.name)
      .then(async (category) => {
        if (category && category !== item.category) {
          // אם הקטגוריה השתנתה - מאפס את מונה הרכישות כי זה בעצם מוצר חדש
          const updateData: any = { category };
          
          if (item.category && item.category !== 'כללי') {
            // רק אם היה לפני כן קטגוריה ספציפית (לא כללי) - מאפס
            updateData.purchaseCount = 0;
            updateData.lastPurchaseDate = null;
            updateData.lastPartialPurchaseDate = null;
          }
          
          // עדכון בדאטאבייס
          await shoppingListService.updateItem(item.id, updateData);
          
          // עדכון הסטייט המקומי
          setItems(prev => prev.map(i => 
            i.id === item.id ? { 
              ...i, 
              category,
              ...(updateData.purchaseCount !== undefined && {
                purchaseCount: 0,
                lastPurchaseDate: undefined,
                lastPartialPurchaseDate: undefined
              })
            } : i
          ));
        }
      })
      .catch(error => {
        console.error('שגיאה בסיווג מוצר ברקע:', error);
      });
  }, []); // אין dependencies - הפונקציה יציבה

  // הוספת פריט חדש לרשימת הקניות
  const handleAddItem = async (
    itemName: string, 
    quantity: number, 
    image?: File,
    existingImageUrl?: string
  ) => {
    if (!itemName.trim()) return;
    
    if (!user) {
      openAuthModal('add-item');
      return;
    }

    if (!selectedHousehold) {
      const confirmed = window.confirm('כדי להוסיף מוצרים, צריך להיות חלק ממשק בית.\n\nלפתוח את ניהול משק הבית?');
      if (confirmed) {
        const event = new CustomEvent('openHouseholdSwitcher');
        window.dispatchEvent(event);
      }
      return;
    }
    
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


      // אם קיים לפחות מסמך אחד בשם הזה – נשתמש באחד הקיימים (העדפה: האחרון שנרכש)
      if (!querySnapshot.empty) {
        // בחירת מסמך "מוביל": לפי lastPurchaseDate או updatedAt/createdAt
        const pick = querySnapshot.docs
          .map(d => ({
            id: d.id,
            data: d.data(),
            last: d.data().lastPurchaseDate?.toDate?.() || d.data().updatedAt?.toDate?.() || d.data().createdAt?.toDate?.() || new Date(0)
          }))
          .sort((a, b) => b.last.getTime() - a.last.getTime())[0];

        await shoppingListService.updateItem(pick.id, {
          status: 'pending',
          quantity
        });

        // אם הועלתה תמונה חדשה – נעדכן אותה למסמך המוביל
        if (image) {
          const imageUrl = await storageService.uploadImage(user.uid, image, 'items');
          await shoppingListService.updateItem(pick.id, { imageUrl });
        } else if (existingImageUrl) {
          await shoppingListService.updateItem(pick.id, { imageUrl: existingImageUrl });
        }

        // עדכון לוקאלי
        setItems(prev => {
          const existsLocal = prev.some(i => i.id === pick.id);
          const imageUrlToUse = existingImageUrl || (prev.find(i => i.id === pick.id)?.imageUrl ?? null);
          if (existsLocal) {
            return prev.map(i => i.id === pick.id ? { ...i, status: 'pending', quantity, imageUrl: imageUrlToUse || i.imageUrl } : i);
          }
          return [...prev, {
            id: pick.id,
            name: itemName.trim(),
            quantity,
            status: 'pending',
            imageUrl: imageUrlToUse || null,
            householdId: selectedHousehold ? selectedHousehold.id : null,
            addedBy: user.uid
          } as Item];
        });

        // בדיקה והוספת קטגוריה למוצר קיים שחזר לרשימה (ללא המתנה)
        const updatedItem = items.find(i => i.id === pick.id) || pick.data;
        if (updatedItem) {
          ensureItemHasCategory({ ...updatedItem, id: pick.id, name: itemName.trim() } as Item);
        }
      } else {
        // אין בכלל מסמך – נוסיף חדש
        let imageUrl = existingImageUrl;
        if (image) {
          imageUrl = await storageService.uploadImage(user.uid, image, 'items');
        }
        const newItemData = {
          name: itemName.trim(),
          quantity,
          addedBy: user.uid,
          householdId: selectedHousehold ? selectedHousehold.id : null,
          imageUrl: imageUrl || null
        };
        const itemId = await shoppingListService.addItem(newItemData);
        
        // יצירת האובייקט של המוצר החדש עם קטגוריה דפולטית
        const newItem = { 
          ...newItemData, 
          id: itemId, 
          purchaseCount: 0, 
          category: 'כללי', // קטגוריה דפולטית להוספה מיידית
          householdId: selectedHousehold ? selectedHousehold.id : null 
        } as Item;
        
        // הוספה מיידית לסטייט עם קטגוריה דפולטית
        setItems(prev => [...prev, newItem]);
        
        // קטגוריזציה ברקע (ללא המתנה)
        aiService.categorizeItem(itemName.trim())
          .then(async (category) => {
            if (category !== 'כללי') {
              // עדכון בדאטאבייס
              await shoppingListService.updateItem(itemId, { category });
              // עדכון לוקאלי
              setItems(prev => prev.map(item => 
                item.id === itemId ? { ...item, category } : item
              ));
            }
          })
          .catch(error => {
            console.error('שגיאה בסיווג מוצר ברקע:', error);
            // המוצר כבר נוסף עם קטגוריה דפולטית, אז לא צריך לעשות כלום
          });
  
      }
    } catch (error) {
      console.error('שגיאה בהוספת פריט:', error);
      alert('שגיאה בהוספת פריט. אנא נסה שוב.');
    }
  };

  // מחיקת פריט - עם memoization לביצועים
  const handleDeleteItem = useCallback(async (id: string) => {
    if (!user) {
      openAuthModal('delete');
      return;
    }

    try {
      // מוצא את הפריט ברשימה המקומית
      const item = items.find(item => item.id === id);
      if (!item) return;

      const itemRef = doc(db, 'items', id);

      if (item.purchaseCount && item.purchaseCount > 0) {
        // אם המוצר נקנה בעבר, רק משנים את הסטטוס שלו ל-purchased
  
        await updateDoc(itemRef, {
          status: 'purchased',
          updatedAt: serverTimestamp()
        });
      } else {
        // אם המוצר לא נקנה אף פעם, מוחקים אותו לגמרי
        // מוחקים גם את התמונה מ-Storage אם קיימת
        if (item.imageUrl) {
          try {
            await storageService.deleteImage(item.imageUrl);
          } catch (deleteError) {
            console.warn('שגיאה במחיקת התמונה:', deleteError);
            // ממשיכים למחוק את המוצר גם אם נכשלה מחיקת התמונה
          }
        }
  
        await deleteDoc(itemRef);
      }
      
      // מסיר את הפריט מהרשימה המקומית בכל מקרה
      setItems(prev => prev.filter(item => item.id !== id));


      // מעדכן את ההיסטוריה
      await loadHistory();
    } catch (error) {
      console.error('שגיאה במחיקת פריט:', error);
    }
  }, [user, items, loadHistory, openAuthModal]);

  // עדכון סטטוס פריט - עם memoization לביצועים + אוטומטי מצב קניות
  const handleToggleStatus = useCallback(async (id: string, status: Item['status']) => {
    if (!user) {
      openAuthModal('edit');
      return;
    }
    
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

      // הפעלת מצב קניות אוטומטית כשמשנים סטטוס למוצרים
      if (status === 'inCart' || status === 'missing' || status === 'partial') {
        setIsShoppingActive(true);
      }

    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
    }
  }, [user, openAuthModal]);

  // פתיחת מודל עריכת כמות - עם memoization לביצועים
  const handleEditQuantity = useCallback((item: Item) => {
    setSelectedItem(item);
    setIsEditQuantityModalOpen(true);
  }, []);

  // עדכון כמות
  const handleSaveQuantity = useCallback(async (id: string, newQuantity: number) => {
    if (!user) {
      openAuthModal('edit');
      return;
    }

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

    } catch (error) {
      console.error('שגיאה בעדכון כמות:', error);
    }
  }, [user, openAuthModal]);

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
      


      
      if (!querySnapshot.empty) {
        // מצאנו את המוצר ששייך למשתמש או למשק הבית - נעדכן את הסטטוס שלו ל-PENDING
        const doc = querySnapshot.docs[0]; // לוקחים את הראשון במקרה שיש כמה
        const existingItem = doc.data();
        
        
        // עדכון הפריט - כולל מי החזיר אותו לרשימה
        await shoppingListService.updateItem(doc.id, {
          status: 'pending',
          quantity: quantity,
          addedBy: user.uid  // עדכון מי אחראי על המוצר כרגע
        });
        
        // עדכון לוקאלי
        setItems(prev => {
          // בודקים אם המוצר כבר קיים ברשימה
          const itemExists = prev.some(item => item.id === doc.id);
          
          if (itemExists) {
            // אם קיים, מעדכנים את הסטטוס, הכמות ומי החזיר אותו
            return prev.map(item =>
              item.id === doc.id
                ? { ...item, status: 'pending', quantity, addedBy: user.uid }
                : item
            );
          } else {
            // אם לא קיים, מוסיפים אותו לרשימה עם המשתמש הנוכחי
            return [...prev, {
              id: doc.id,
              name: itemName,
              status: 'pending',
              quantity: quantity,
              imageUrl: existingItem.imageUrl || null,
              purchaseCount: existingItem.purchaseCount || 0,
              lastPurchaseDate: existingItem.lastPurchaseDate?.toDate(),
              addedBy: user.uid,  // המשתמש שהחזיר את המוצר
              householdId: existingItem.householdId,
              category: existingItem.category
            } as Item];
          }
        });

        // בדיקה והוספת קטגוריה למוצר מההיסטוריה (ללא המתנה)
        const itemToCheck = {
          id: doc.id,
          name: itemName,
          category: existingItem.category
        } as Item;
        ensureItemHasCategory(itemToCheck);
        
  
      } else {
        // המוצר לא נמצא במשק הבית או ברשימה האישית - ניצור פריט חדש

        await handleAddItem(itemName, quantity, undefined, imageUrl);
      }
      
      // טעינה מחדש של ההיסטוריה כדי לעדכן את הרשימה
      await loadHistory();
      
      // לא סוגרים את המודל - נותנים למשתמש להוסיף עוד פריטים
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
      
      // מחיקת התמונות ועדכון הפריטים
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        
        // אם יש תמונה, מחק אותה מה-Storage
        if (data.imageUrl) {
          try {
            await storageService.deleteImage(data.imageUrl);
      
          } catch (error) {
            console.error('שגיאה במחיקת תמונה:', error);
            // ממשיך למרות שגיאה במחיקת תמונה
          }
        }
        
        // מחיקת הפריט עצמו
        await deleteDoc(doc.ref);
  
      }
      
      // עדכון הסטייט המקומי
      setHistoryItems(prev => prev.filter(item => item.name !== itemName));
      setFrequentItems(prev => prev.filter(name => name !== itemName));
      
    } catch (error) {
      console.error('שגיאה במחיקה מההיסטוריה:', error);
    }
  };

  // העלאת תמונה
  const handleUploadImage = useCallback(async (file: File | null, itemId: string): Promise<string> => {
    if (!user) throw new Error('המשתמש אינו מחובר');
    
    try {
      // קבלת התמונה הקיימת ישירות מ-Firestore
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      const oldImageUrl = itemDoc.data()?.imageUrl;

      if (file === null) {
        // מחיקת תמונה
        if (oldImageUrl) {
          try {
            await storageService.deleteImage(oldImageUrl);
      
          } catch (deleteError) {
            console.warn('שגיאה במחיקת התמונה:', deleteError);
            throw deleteError;
          }
        }
        
        // עדכון המוצר בפיירסטור
        await shoppingListService.updateItem(itemId, { imageUrl: null });
        
        // עדכון הסטייט המקומי
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, imageUrl: null } : item
          )
        );
        
        return '';
      } else {
        // Validate image with AI before upload
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const validation = await aiService.validateImage(imageDataUrl, 'product');
        
        if (!validation.isValid) {
          alert(`❌ התמונה לא מתאימה\n\n${validation.reason}\n\nאנא העלה תמונה של מוצר שקונים בחנות.`);
          throw new Error('Image validation failed');
        }

        // העלאת תמונה חדשה
        const imageUrl = await storageService.uploadImage(user.uid, file, 'items');
        await shoppingListService.updateItem(itemId, { imageUrl });
        
        // מחיקת התמונה הישנה אם קיימת
        if (oldImageUrl) {
          try {
            await storageService.deleteImage(oldImageUrl);
      
          } catch (deleteError) {
            console.warn('שגיאה במחיקת התמונה הישנה:', deleteError);
            // ממשיכים למרות שגיאה במחיקת התמונה הישנה
          }
        }
        
        // עדכון הסטייט המקומי
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, imageUrl } : item
          )
        );
        
        return imageUrl;
      }
    } catch (error) {
      console.error('שגיאה בהעלאת/מחיקת תמונה:', error);
      throw error;
    }
  }, [user]);

  // חישוב סטטיסטיקות קניות - עם memoization לביצועים
  // נחשב על בסיס ספירת סטטוסים ולא על items עצמו
  const itemsInCart = inCartCount;
  const itemsPending = pendingCount;
  const itemsMissing = useMemo(() => items.filter(item => item.status === 'missing').length, [items]);
  const itemsPartial = useMemo(() => items.filter(item => item.status === 'partial').length, [items]);
  const itemsPurchased = useMemo(() => items.filter(item => item.status === 'purchased').length, [items]);
  const activeItemsCount = useMemo(() => items.filter(item => item.status !== 'purchased').length, [items]);
  
  const stats = useMemo(() => {
    const totalItems = activeItemsCount;
    const progress = totalItems > 0 ? ((itemsInCart + itemsMissing + itemsPartial) / totalItems) * 100 : 0;
    
    return {
      totalItems,
      itemsInCart,
      itemsMissing,
      itemsPartial,
      itemsPending,
      itemsPurchased,
      progress
    };
  }, [activeItemsCount, itemsInCart, itemsMissing, itemsPartial, itemsPending, itemsPurchased]);

  // חישוב נתונים לגרף פס - עם memoization לביצועים
  const barChartData = useMemo(() => {
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
  }, [stats]);

  // מיון פריטים לפי סטטוס - עם memoization לביצועים
  const sortedItems = useMemo(() => {
    return [...items].filter(item => item.status !== 'purchased').sort((a, b) => {
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
  }, [items, isShoppingActive]);
  
  // התצוגה הראשית מציגה רק פריטים שלא purchased
  const displayItems = sortedItems;

  // קיבוץ פריטים לפי קטגוריות
  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    
    displayItems.forEach(item => {
      const category = item.category || 'כללי';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // סדר קטגוריות מועדף
    const categoryOrder = [
      'פירות, ירקות ופיצוחים',
      'מוצרי חלב וביצים',
      'בשר, עוף ודגים',
      'לחמים ומוצרי מאפה',
      'משקאות, יין, אלכוהול וסנקים',
      'מזון מקורר, קפוא ונקניקים',
      'בישול אפיה ושימורים',
      'חטיפים מתוקים ודגני בוקר',
      'פארם וטיפוח',
      'עולם התינוקות',
      'ניקיון לבית וחד פעמי',
      'ויטמינים ותוספי תזונה',
      'כללי'
    ];

    const sortedGroups: Array<{ category: ShoppingCategory | 'כללי'; items: Item[] }> = [];
    
    // מוסיף קטגוריות לפי הסדר המועדף
    categoryOrder.forEach(category => {
      if (groups[category] && groups[category].length > 0) {
        sortedGroups.push({ 
          category: category as ShoppingCategory, 
          items: groups[category] 
        });
      }
    });
    
    // מוסיף קטגוריות אחרות שלא במסדר המועדף
    Object.keys(groups).forEach(category => {
      if (!categoryOrder.includes(category) && groups[category].length > 0) {
        sortedGroups.push({ 
          category: category as ShoppingCategory, 
          items: groups[category] 
        });
      }
    });
    
    return sortedGroups;
  }, [displayItems]);

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

  // הערה: מצב קניות יכול להיות פעיל גם בלי פריטים בעגלה
  // המשתמש יכול להתחיל קניות ואז להוסיף פריטים לעגלה בזמן הקנייה

  // פונקציה לשינוי קטגוריה של מוצר
  const handleChangeCategory = useCallback(async (id: string, newCategory: ShoppingCategory) => {
    if (!user) {
      openAuthModal('edit');
      return;
    }

    try {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, {
        category: newCategory,
        updatedAt: serverTimestamp()
      });

      // עדכון הסטייט המקומי
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, category: newCategory } : item
        )
      );
    } catch (error) {
      console.error('שגיאה בשינוי קטגוריה:', error);
    }
  }, [user, openAuthModal]);

  // פונקציה לעריכת שם המוצר
  const handleEditName = useCallback(async (id: string, newName: string) => {
    if (!user) {
      openAuthModal('edit');
      return;
    }

    if (!newName.trim()) {
      return;
    }

    try {
      const itemRef = doc(db, 'items', id);
      
      // Update the name first - עדכון מי שינה את השם
      await updateDoc(itemRef, {
        name: newName.trim(),
        addedBy: user.uid,  // מי ששינה את השם הופך לבעלים הנוכחי
        updatedAt: serverTimestamp()
      });

      // Re-categorize in the background (don't wait) - תמיד מסווג מחדש כשמשנים שם
      const itemDocRef = doc(db, 'items', id);
      const itemSnapshot = await getDoc(itemDocRef);
      if (itemSnapshot.exists()) {
        const itemData = itemSnapshot.data();
        ensureItemHasCategory({ ...itemData, id, name: newName.trim() } as Item, true);
      }
    } catch (error) {
      console.error('Error updating item name:', error);
      alert('שגיאה בעדכון שם המוצר');
    }
  }, [user, openAuthModal, ensureItemHasCategory]);

  // טיפול בפריטים שנקנו במלואם
  const handleProcessInCartItems = async (itemsInCart: Item[]) => {
    try {
  
      
      for (const item of itemsInCart) {
        try {
          const itemRef = doc(db, 'items', item.id);
          
          // הזהירות: לא נשנה את householdId אם כבר יש לפריט
          const itemDoc = await getDoc(itemRef);
          const existingHouseholdId = itemDoc.exists() ? itemDoc.data().householdId : null;
          const finalHouseholdId = existingHouseholdId !== undefined ? existingHouseholdId : (selectedHousehold ? selectedHousehold.id : undefined);
          
          // עדכון סטטוס, הגדלת מונה ושמירת תאריך רכישה אחרון
          await updateDoc(itemRef, {
            status: 'purchased',
            purchaseCount: (item.purchaseCount || 0) + 1,
            lastPurchaseDate: Timestamp.now(),
            updatedAt: serverTimestamp(),
            householdId: finalHouseholdId
          });
          
    
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
  
      await loadHistory();
      
      // טעינה חוזרת של היסטוריה בהדרגה - לפעמים פיירבייס לא מחזיר את הנתונים המעודכנים מיד
      const delayTimes = [100, 500, 1000, 3000];
      
      for (const delay of delayTimes) {
        setTimeout(async () => {
    
          await loadHistory();
        }, delay);
      }
      
      // onSnapshot יטפל באופן אוטומטי בעדכון הנתונים
      
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
    
    // onSnapshot יטפל באופן אוטומטי בעדכון הנתונים
    await loadHistory();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-l-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        showHelp={true} 
        onHelpClick={() => setIsHelpModalOpen(true)}
      />
      
      <ScrollToTop />
      
      <div className="max-w-md mx-auto p-4 pb-6">

      <AddItemForm 
        onAddItem={handleAddItem}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        historyItems={historyItems}
        activeItems={items.filter(item => item.status === 'pending' || item.status === 'missing')}
      />

      {/* Shopping mode toggle - קטן ומשני */}
      {(items.some(item => item.status === 'pending') || (isShoppingActive && activeShoppingCount > 0)) && (
        <div className="flex justify-center mb-4 animate-fade-in">
          <button
            onClick={() => {
              // אם יש פריטים מסומנים במצב קניות, סיום קניות
              if (isShoppingActive && activeShoppingCount > 0) {
                handleFinishShopping();
              } else {
                // אחרת, הפעל/בטל מצב קניות
                toggleShoppingMode();
              }
            }}
            className={`px-8 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 ${
              isShoppingActive && activeShoppingCount > 0
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                : isShoppingActive 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            }`}
          >
            {isShoppingActive && activeShoppingCount > 0
              ? 'סיום קניות'
              : isShoppingActive 
                ? 'סגור מצב קניות' 
                : 'התחל קניות'
            }
          </button>
        </div>
      )}

      {/* Shopping progress statistics */}
      {isShoppingActive && displayItems.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-lg shadow-sm p-4 sm:p-5 mb-4 border border-blue-100 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm sm:text-base font-bold text-gray-700">התקדמות קניות</span>
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{Math.round(stats.progress)}%</span>
          </div>

          {stats.totalItems > 0 && (
            <div className="mb-4">
              <div className="h-4 sm:h-5 w-full bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                {barChartData.map((segment, index) => (
                  <div 
                    key={index} 
                    className="h-full transition-all duration-500" 
                    style={{ 
                      width: `${segment.percentage}%`, 
                      backgroundColor: segment.color 
                    }}
                    title={`${segment.label}: ${segment.value}`}
                  ></div>
                ))}
              </div>
              
              <div className="flex flex-wrap justify-between text-xs text-gray-500 mt-3 gap-1">
                {barChartData.map((segment, index) => (
                  <div key={index} className="flex items-center gap-1 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: segment.color }}></div>
                    <span className="font-medium">
                      {segment.label}: {segment.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* מידע מספרי */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
              <span className="text-lg sm:text-xl font-black text-gray-800">{stats.itemsPending}</span>
              <span className="text-xs font-semibold text-gray-500">בהמתנה</span>
            </div>
            <div className="flex flex-col bg-green-50 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
              <span className="text-lg sm:text-xl font-black text-green-600">{stats.itemsInCart}</span>
              <span className="text-xs font-semibold text-green-600">בעגלה</span>
            </div>
            <div className="flex flex-col bg-yellow-50 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
              <span className="text-lg sm:text-xl font-black text-yellow-500">{stats.itemsPartial}</span>
              <span className="text-xs font-semibold text-yellow-500">חלקי</span>
            </div>
            <div className="flex flex-col bg-red-50 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
              <span className="text-lg sm:text-xl font-black text-red-500">{stats.itemsMissing}</span>
              <span className="text-xs font-semibold text-red-500">חסר</span>
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
        <div className="space-y-4">
          {groupedItems.map(group => (
            <div key={group.category} className={`${CATEGORY_CONFIG[group.category as ShoppingCategory]?.bgColor || 'bg-gray-50'} rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all`}>
              <div className={`${CATEGORY_CONFIG[group.category as ShoppingCategory]?.bgColor || 'bg-gray-50'} px-4 py-3 border-b border-gray-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(group.category as ShoppingCategory)}
                    <h3 className="text-lg font-semibold text-gray-800">
                      {group.category}
                    </h3>
                  </div>
                  <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600 shadow-sm">
                    {group.items.length} פריטים
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map(item => (
                  <div key={item.id} className="p-3">
                    <ShoppingItem
                      item={item}
                      onDelete={handleDeleteItem}
                      onEditQuantity={handleEditQuantity}
                      onToggleStatus={handleToggleStatus}
                      onUploadImage={handleUploadImage}
                      onChangeQuantity={handleSaveQuantity}
                      onEditName={handleEditName}
                      onChangeCategory={handleChangeCategory}
                      household={selectedHousehold}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Finish shopping button */}
          {items.some(item => item.status === 'inCart' || item.status === 'partial' || item.status === 'missing') && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleFinishShopping}
                className="px-8 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                סיום קניות
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-9 h-9 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">הרשימה ריקה</h3>
          <p className="text-gray-500">
            הוספת פריטים לרשימת הקניות
          </p>
        </div>
      )}

      <HelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => {
          setIsHelpModalOpen(false);
          markOnboardingAsSeen();
        }}
      />

        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          frequentItems={frequentItems}
          onItemSelect={handleAddFromHistory}
          historyItemsData={historyItems}
          onDeleteFromHistory={handleDeleteFromHistory}
          handleUploadImage={handleUploadImage}
          onHistoryUpdate={setHistoryItems}
          currentItems={items.filter(item => item.status !== 'purchased').map(item => item.name)}
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
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-slide-down {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}