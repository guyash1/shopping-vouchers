import { auth, db, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Item } from '../types/shopping';
import { Voucher } from '../types/vouchers';
import { Household } from '../types/household';

// פונקציית עזר לאימות קלט - משופרת לאבטחה
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, 255) // הגבלת אורך לביטחון
    .replace(/[<>'"&]/g, '') // הסרת תווים מסוכנים
    .replace(/javascript:/gi, '') // הסרת JS schemes
    .replace(/on\w+=/gi, '') // הסרת event handlers
    .replace(/data:/gi, '') // הסרת data URIs
    .replace(/vbscript:/gi, ''); // הסרת VBScript
};

// פונקציה לבדיקת שייכות המשתמש למשק בית
const isUserInHousehold = async (userId: string, householdId: string): Promise<boolean> => {
  try {
    if (!userId || !householdId) return false;
    
    const householdRef = doc(db, 'households', householdId);
    const householdDoc = await getDoc(householdRef);
    
    if (!householdDoc.exists()) return false;
    
    const householdData = householdDoc.data();
    return householdData.members && householdData.members[userId] !== undefined;
  } catch (error) {
    return false;
  }
};

// שירותי רשימת קניות
export const shoppingListService = {
  // קבלת כל הפריטים של משק הבית
  async getItems(householdId: string): Promise<Item[]> {
    try {
      if (!householdId) throw new Error('Household ID is required');
      
      const q = query(
        collection(db, 'items'),
        where('householdId', '==', householdId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const items: Item[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // וידוא שהסטטוס תקין
        let status = data.status;
        if (!status || !['pending', 'inCart', 'missing', 'partial', 'purchased'].includes(status)) {
          status = 'pending';
        }
        
        const item = {
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          status: status,
          imageUrl: data.imageUrl || null,
          purchaseCount: data.purchaseCount || 0,
          lastPurchaseDate: data.lastPurchaseDate?.toDate(),
          lastPartialPurchaseDate: data.lastPartialPurchaseDate?.toDate(),
          householdId: data.householdId,
          addedBy: data.addedBy,
          category: data.category
        } as Item;
        
        items.push(item);
      });
      
      return items;
    } catch (error) {
      throw error;
    }
  },

  // הוספת פריט חדש
  async addItem(itemData: {
    name: string;
    status?: Item['status'];
    quantity: number;
    addedBy: string;
    householdId: string | null;
    imageUrl?: string | null;
    purchaseCount?: number;
  }): Promise<string> {
    try {
      if (!itemData.name || !itemData.addedBy) {
        throw new Error('Item name and user ID are required');
      }
      
      // Rate limiting - מקסימום 10 הוספות פריטים לדקה
      if (!rateLimiter.isAllowed(`addItem:${itemData.addedBy}`, 10, 60000)) {
        throw new Error('Too many items added. Please wait a moment before adding more items.');
      }
      
      // סניטיזציה של קלט המשתמש
      const sanitizedName = sanitizeInput(itemData.name);
      
      // בדיקת הרשאה למשק בית אם יש
      if (itemData.householdId) {
        const isMember = await isUserInHousehold(itemData.addedBy, itemData.householdId);
        if (!isMember) {
          throw new Error('User is not a member of this household');
        }
      }
      
      // הכנת אובייקט המוצר
      const item = {
        name: sanitizedName,
        quantity: itemData.quantity || 1,
        status: itemData.status || 'pending',
        imageUrl: itemData.imageUrl || null,
        purchaseCount: itemData.purchaseCount || 0,
        addedBy: itemData.addedBy,
        householdId: itemData.householdId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // הוספת המוצר למסד הנתונים
      const docRef = await addDoc(collection(db, 'items'), item);
      return docRef.id;
    } catch (error) {
      console.error('שגיאה בהוספת פריט:', error);
      throw error;
    }
  },

  // עדכון פריט
  async updateItem(itemId: string, updates: Partial<Item>): Promise<void> {
    try {
      if (!itemId) throw new Error('Item ID is required');
      
      // סניטיזציה של קלט המשתמש אם קיים
      if (updates.name) {
        updates.name = sanitizeInput(updates.name);
      }
      
      await updateDoc(doc(db, 'items', itemId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  },

  // מחיקת פריט
  async deleteItem(itemId: string): Promise<void> {
    try {
      if (!itemId) throw new Error('Item ID is required');
      
      await deleteDoc(doc(db, 'items', itemId));
    } catch (error) {
      throw error;
    }
  },

  // עדכון סטטוס פריט
  async updateItemStatus(itemId: string, status: Item['status']): Promise<void> {
    try {
      if (!itemId) throw new Error('Item ID is required');
      if (!status || !['pending', 'inCart', 'missing', 'partial', 'purchased'].includes(status)) {
        throw new Error('Invalid status');
      }
      
      await updateDoc(doc(db, 'items', itemId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  },

  // תיעוד רכישה, עדכון מונה רכישות ותאריך רכישה אחרון
  async recordPurchase(itemId: string, partial = false): Promise<void> {
    try {
      if (!itemId) throw new Error('Item ID is required');
      
      const itemRef = doc(db, 'items', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      const updates: Record<string, any> = {
        updatedAt: serverTimestamp()
      };
      
      if (partial) {
        // עבור רכישה חלקית, נעדכן רק את תאריך הרכישה החלקית
        updates.lastPartialPurchaseDate = Timestamp.now();
      } else {
        // עבור רכישה מלאה, נגדיל את מונה הרכישות ונעדכן את תאריך הרכישה
        updates.purchaseCount = (itemData.purchaseCount || 0) + 1;
        updates.lastPurchaseDate = Timestamp.now();
      }
      
      await updateDoc(itemRef, updates);
    } catch (error) {
      throw error;
    }
  },

  // קבלת הפריטים האישיים של המשתמש
  async getUserItems(userId: string): Promise<Item[]> {
    try {
      if (!userId) throw new Error('User ID is required');
      
      // שאילתא שמתאימה לאינדקס הקיים - משתמשת רק ב-userId ו-createdAt
      const q = query(
        collection(db, 'items'),
        where('addedBy', '==', userId),
        where('householdId', '==', null),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const items: Item[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // וידוא שהסטטוס תקין
        let status = data.status;
        if (!status || !['pending', 'inCart', 'missing', 'partial', 'purchased'].includes(status)) {
          status = 'pending';
        }
        
        const item = {
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          status: status,
          imageUrl: data.imageUrl || null,
          purchaseCount: data.purchaseCount || 0,
          lastPurchaseDate: data.lastPurchaseDate?.toDate(),
          lastPartialPurchaseDate: data.lastPartialPurchaseDate?.toDate(),
          householdId: data.householdId,
          addedBy: data.addedBy,
          category: data.category
        } as Item;
        
        items.push(item);
      });
      
      return items;
    } catch (error) {
      console.error('שגיאה בקבלת פריטים אישיים:', error);
      if (error instanceof Error && 
          (error.message.includes('index') || 
           error.message.includes('9-Prop-Order') || 
           error.message.includes('no matching index'))) {
        console.error('שגיאת אינדקס בפיירבייס. יש להוסיף את האינדקס המתאים.');
      }
      throw error;
    }
  }
};

// שירותי שוברים
export const vouchersService = {
  // קבלת השוברים האישיים של המשתמש
  async getVouchers(userId: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<Voucher[]> {
    try {
      if (!userId) throw new Error('User ID is required');
      
      let queryResult;
      try {
        // ניסיון ראשון עם אינדקס
        const q = query(
          collection(db, 'vouchers'),
          where('userId', '==', userId),
          orderBy('createdAt', sortOrder)
        );
        
        queryResult = await getDocs(q);
      } catch (indexError) {
        console.warn('שגיאת אינדקס בפיירבייס. נסה לקבל שוברים ללא מיון:', indexError);
        
        // גישה חלופית ללא מיון אם האינדקס עדיין בבנייה
        const q = query(
          collection(db, 'vouchers'),
          where('userId', '==', userId)
        );
        
        queryResult = await getDocs(q);
      }
      
      const vouchers: Voucher[] = [];
      
      queryResult.forEach((doc) => {
        const data = doc.data();
        
        vouchers.push({
          id: doc.id,
          storeName: data.storeName,
          amount: data.amount,
          isUsed: data.isUsed || false,
          expiryDate: data.expiryDate ? (data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate)) : undefined,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt.toDate(),
          userId: data.userId,
          householdId: data.householdId,
          category: data.category || 'general',
          isPartial: data.isPartial || false,
          remainingAmount: data.remainingAmount
        } as Voucher);
      });
      
      // מיון תוצאות במקרה שלא הצלחנו להשתמש באינדקס
      vouchers.sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
      });
      
      return vouchers;
    } catch (error) {
      console.error('שגיאה בקבלת שוברים אישיים:', error);
      if (error instanceof Error && 
          (error.message.includes('index') || 
           error.message.includes('9-Prop-Order') || 
           error.message.includes('no matching index'))) {
        console.error('שגיאת אינדקס בפיירבייס. נדרש אינדקס על userId ו-createdAt');
      }
      throw error;
    }
  },
  
  // קבלת השוברים של משק הבית
  async getHouseholdVouchers(householdId: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<Voucher[]> {
    try {
      if (!householdId) throw new Error('Household ID is required');
      
      let queryResult;
      try {
        // ניסיון ראשון עם אינדקס
        const q = query(
          collection(db, 'vouchers'),
          where('householdId', '==', householdId),
          orderBy('createdAt', sortOrder)
        );
        
        queryResult = await getDocs(q);
      } catch (indexError) {
        console.warn('שגיאת אינדקס בפיירבייס. נסה לקבל שוברים ללא מיון:', indexError);
        
        // גישה חלופית ללא מיון אם האינדקס עדיין בבנייה
        const q = query(
          collection(db, 'vouchers'),
          where('householdId', '==', householdId)
        );
        
        queryResult = await getDocs(q);
      }
      
      const vouchers: Voucher[] = [];
      
      queryResult.forEach((doc) => {
        const data = doc.data();
        
        vouchers.push({
          id: doc.id,
          storeName: data.storeName,
          amount: data.amount,
          isUsed: data.isUsed || false,
          expiryDate: data.expiryDate ? (data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate)) : undefined,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt.toDate(),
          userId: data.userId,
          householdId: data.householdId,
          category: data.category || 'general',
          isPartial: data.isPartial || false,
          remainingAmount: data.remainingAmount
        } as Voucher);
      });
      
      // מיון תוצאות במקרה שלא הצלחנו להשתמש באינדקס
      vouchers.sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
      });
      
      return vouchers;
    } catch (error) {
      console.error('שגיאה בקבלת שוברים של משק בית:', error);
      if (error instanceof Error && 
          (error.message.includes('index') || 
           error.message.includes('9-Prop-Order') || 
           error.message.includes('no matching index'))) {
        console.error('שגיאת אינדקס בפיירבייס. נדרש אינדקס על householdId ו-createdAt');
      }
      throw error;
    }
  },

  // הוספת שובר חדש
  async addVoucher(userId: string, voucherData: {
    storeName: string;
    amount: number;
    expiryDate?: string;
    imageUrl?: string;
    householdId?: string | null;
    category?: string;
    isPartial?: boolean;
    remainingAmount?: number;
  }): Promise<string> {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!voucherData.storeName) throw new Error('Store name is required');
      if (isNaN(voucherData.amount) || voucherData.amount <= 0) {
        throw new Error('Valid amount is required');
      }
      
      // Rate limiting - מקסימום 5 הוספות שוברים לדקה
      if (!rateLimiter.isAllowed(`addVoucher:${userId}`, 5, 60000)) {
        throw new Error('Too many vouchers added. Please wait a moment before adding more vouchers.');
      }
      
      // סניטיזציה של קלט המשתמש
      const sanitizedStoreName = sanitizeInput(voucherData.storeName);
      
      // בדיקת שייכות למשק בית אם יש
      if (voucherData.householdId) {
        const isMember = await isUserInHousehold(userId, voucherData.householdId);
        if (!isMember) {
          throw new Error('User is not a member of the specified household');
        }
      }
      
      // בדיקת התאריך רק אם הוא קיים
      let expiryDate: Date | null = null;
      if (voucherData.expiryDate) {
        expiryDate = new Date(voucherData.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          throw new Error('Invalid expiry date format');
        }
      }
      
      // הכנת האובייקט להוספה (רק עם שדות חובה בהתחלה)
      const voucherToAdd: Record<string, any> = {
        storeName: sanitizedStoreName,
        amount: voucherData.amount,
        userId,
        createdAt: serverTimestamp(),
        isUsed: false,
        category: voucherData.category || 'general',
        isPartial: voucherData.isPartial || false,
      };
      
      // הוספת שדות נוספים רק אם יש להם ערך תקין
      if (voucherData.householdId !== undefined) {
        voucherToAdd.householdId = voucherData.householdId || null;
      }
      
      if (voucherData.imageUrl) {
        voucherToAdd.imageUrl = voucherData.imageUrl;
      }
      
      if (voucherData.expiryDate) {
        voucherToAdd.expiryDate = voucherData.expiryDate;
      }
      
      // הוספת שדה remainingAmount רק אם זה שובר נצבר וערכו תקין
      if (voucherData.isPartial && typeof voucherData.amount === 'number') {
        // השתמש בערך שסופק או בערך ההתחלתי של amount
        const remainingAmount = voucherData.remainingAmount !== undefined ? 
              voucherData.remainingAmount : voucherData.amount;
        
        if (typeof remainingAmount === 'number' && !isNaN(remainingAmount)) {
          voucherToAdd.remainingAmount = remainingAmount;
        }
      }
      
      const docRef = await addDoc(collection(db, 'vouchers'), voucherToAdd);
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },
  
  // עדכון שובר
  async updateVoucher(voucherId: string, updates: Partial<Voucher>): Promise<void> {
    try {
      if (!voucherId) throw new Error('Voucher ID is required');
      
      // וידוא שהמשתמש הוא בעל השובר או חבר במשק הבית
      const voucherRef = doc(db, 'vouchers', voucherId);
      const voucherSnap = await getDoc(voucherRef);
      
      if (!voucherSnap.exists()) {
        throw new Error('Voucher not found');
      }
      
      const voucherData = voucherSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // בדיקה אם המשתמש הוא הבעלים של השובר
      const isOwner = voucherData.userId === currentUser.uid;
      
      // בדיקה אם המשתמש שייך למשק הבית של השובר
      let isHouseholdMember = false;
      
      if (voucherData.householdId) {
        // בדיקה במסד הנתונים אם המשתמש הוא חבר במשק הבית הזה
        const householdRef = doc(db, 'households', voucherData.householdId);
        const householdSnap = await getDoc(householdRef);
        
        if (householdSnap.exists()) {
          const householdData = householdSnap.data();
          isHouseholdMember = householdData.members && 
                              householdData.members[currentUser.uid] !== undefined;
        }
      }
      
      // אם המשתמש אינו הבעלים ואינו חבר במשק הבית, אין לו הרשאה לעדכן
      if (!isOwner && !isHouseholdMember) {
        throw new Error('Unauthorized to update this voucher');
      }
      
      // סניטיזציה של קלט המשתמש
      if (updates.storeName) {
        updates.storeName = sanitizeInput(updates.storeName);
      }
      
      // יצירת אובייקט העדכון
      const updateData: Record<string, any> = {
        updatedAt: serverTimestamp()
      };
      
      // העתקת כל השדות מ-updates למעט expiryDate ו-remainingAmount
      Object.keys(updates).forEach(key => {
        if (key !== 'expiryDate' && key !== 'remainingAmount') {
          updateData[key] = (updates as Record<string, any>)[key];
        }
      });
      
      // טיפול מיוחד בשדה expiryDate
      if ('expiryDate' in updates) {
        if (updates.expiryDate === undefined || updates.expiryDate === null) {
          // אם התאריך ריק, השתמש ב-deleteField() כדי למחוק את השדה
          updateData['expiryDate'] = deleteField();
        } else {
          // אחרת, השתמש בערך שסופק
          updateData['expiryDate'] = updates.expiryDate;
        }
      }
      
      // טיפול מיוחד בשדה remainingAmount
      if ('remainingAmount' in updates) {
        if (updates.remainingAmount === undefined || updates.remainingAmount === null) {
          // אם הערך ריק, נמחק את השדה
          updateData['remainingAmount'] = deleteField();
        } else if (typeof updates.remainingAmount === 'number' && !isNaN(updates.remainingAmount)) {
          // רק אם זה מספר תקין, נעדכן את הערך
          updateData['remainingAmount'] = updates.remainingAmount;
        }
      }
      
      await updateDoc(voucherRef, updateData);
    } catch (error) {
      throw error;
    }
  },
  
  // החלפת סטטוס שובר (מומש/לא מומש)
  async toggleVoucherUsed(voucherId: string, isUsed: boolean): Promise<void> {
    try {
      if (!voucherId) throw new Error('Voucher ID is required');
      
      // וידוא שהמשתמש הוא בעל השובר או חבר במשק הבית
      const voucherRef = doc(db, 'vouchers', voucherId);
      const voucherSnap = await getDoc(voucherRef);
      
      if (!voucherSnap.exists()) {
        throw new Error('Voucher not found');
      }
      
      const voucherData = voucherSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // בדיקה אם המשתמש הוא הבעלים של השובר
      const isOwner = voucherData.userId === currentUser.uid;
      
      // בדיקה אם המשתמש שייך למשק הבית של השובר
      let isHouseholdMember = false;
      
      if (voucherData.householdId) {
        // בדיקה במסד הנתונים אם המשתמש הוא חבר במשק הבית הזה
        const householdRef = doc(db, 'households', voucherData.householdId);
        const householdSnap = await getDoc(householdRef);
        
        if (householdSnap.exists()) {
          const householdData = householdSnap.data();
          isHouseholdMember = householdData.members && 
                              householdData.members[currentUser.uid] !== undefined;
        }
      }
      
      // אם המשתמש אינו הבעלים ואינו חבר במשק הבית, אין לו הרשאה לעדכן
      if (!isOwner && !isHouseholdMember) {
        throw new Error('Unauthorized to update this voucher');
      }
      
      // בדיקה אם זה שובר נצבר
      const isPartial = voucherData.isPartial || false;
      
      // אם זה שובר נצבר, עדכן גם את הסכום הנותר
      if (isPartial) {
        await updateDoc(voucherRef, {
          isUsed,
          // אם מסמנים כמומש, הסכום הנותר הוא 0
          // אם מסמנים כלא מומש, הסכום הנותר הוא הסכום המקורי
          remainingAmount: isUsed ? 0 : voucherData.amount,
          updatedAt: serverTimestamp()
        });
      } else {
        // אם זה לא שובר נצבר, עדכן רק את הסטטוס
        await updateDoc(voucherRef, {
          isUsed,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      throw error;
    }
  },
  
  // מחיקת שובר
  async deleteVoucher(voucherId: string): Promise<void> {
    try {
      if (!voucherId) throw new Error('Voucher ID is required');
      
      // וידוא שהמשתמש הוא בעל השובר או חבר במשק הבית
      const voucherRef = doc(db, 'vouchers', voucherId);
      const voucherSnap = await getDoc(voucherRef);
      
      if (!voucherSnap.exists()) {
        throw new Error('Voucher not found');
      }
      
      const voucherData = voucherSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // בדיקה אם המשתמש הוא הבעלים של השובר
      const isOwner = voucherData.userId === currentUser.uid;
      
      // בדיקה אם המשתמש שייך למשק הבית של השובר
      let isHouseholdMember = false;
      
      if (voucherData.householdId) {
        // בדיקה במסד הנתונים אם המשתמש הוא חבר במשק הבית הזה
        const householdRef = doc(db, 'households', voucherData.householdId);
        const householdSnap = await getDoc(householdRef);
        
        if (householdSnap.exists()) {
          const householdData = householdSnap.data();
          isHouseholdMember = householdData.members && 
                              householdData.members[currentUser.uid] !== undefined;
        }
      }
      
      // אם המשתמש אינו הבעלים ואינו חבר במשק הבית, אין לו הרשאה למחוק
      if (!isOwner && !isHouseholdMember) {
        throw new Error('Unauthorized to delete this voucher');
      }
      
      await deleteDoc(voucherRef);
    } catch (error) {
      throw error;
    }
  },

  // עדכון הסכום הנותר בשובר נצבר
  async updateRemainingAmount(voucherId: string, remainingAmount: number): Promise<void> {
    try {
      if (!voucherId) throw new Error('Voucher ID is required');
      if (isNaN(remainingAmount) || remainingAmount < 0) {
        throw new Error('Valid remaining amount is required');
      }
      
      // וידוא שהמשתמש הוא בעל השובר או חבר במשק הבית
      const voucherRef = doc(db, 'vouchers', voucherId);
      const voucherSnap = await getDoc(voucherRef);
      
      if (!voucherSnap.exists()) {
        throw new Error('Voucher not found');
      }
      
      const voucherData = voucherSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // בדיקה אם המשתמש הוא הבעלים של השובר
      const isOwner = voucherData.userId === currentUser.uid;
      
      // בדיקה אם המשתמש שייך למשק הבית של השובר
      let isHouseholdMember = false;
      
      if (voucherData.householdId) {
        // בדיקה במסד הנתונים אם המשתמש הוא חבר במשק הבית הזה
        const householdRef = doc(db, 'households', voucherData.householdId);
        const householdSnap = await getDoc(householdRef);
        
        if (householdSnap.exists()) {
          const householdData = householdSnap.data();
          isHouseholdMember = householdData.members && 
                              householdData.members[currentUser.uid] !== undefined;
        }
      }
      
      // אם המשתמש אינו הבעלים ואינו חבר במשק הבית, אין לו הרשאה לעדכן
      if (!isOwner && !isHouseholdMember) {
        throw new Error('Unauthorized to update this voucher');
      }
      
      // בדיקה אם השובר הוא מסוג נצבר
      // אם לא, נהפוך אותו לנצבר במקום לזרוק שגיאה
      const isPartial = voucherData.isPartial || false;
      
      if (!isPartial) {
        // עדכון השובר להיות נצבר
        await updateDoc(voucherRef, {
          isPartial: true,
          updatedAt: serverTimestamp()
        });
      }

      // עדכון הסכום הנותר
      await updateDoc(voucherRef, {
        isPartial: true, // נוודא שוב שזה נצבר
        remainingAmount,
        updatedAt: serverTimestamp()
      });

      // אם הסכום הנותר הוא 0, אז השובר נחשב כמומש
      if (remainingAmount === 0) {
        await updateDoc(voucherRef, {
          isUsed: true,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      throw error;
    }
  }
};

// מערכת Rate Limiting לאבטחה
class RateLimiter {
  private attempts = new Map<string, number[]>();
  
  isAllowed(key: string, limit: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // סינון ניסיונות ישנים מחוץ לחלון הזמן
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= limit) {
      return false;
    }
    
    // הוספת הניסיון הנוכחי
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    // ניקוי זיכרון - הסרת entries ישנים
    if (this.attempts.size > 1000) {
      Array.from(this.attempts.entries()).forEach(([k, attempts]) => {
        const recentForKey = attempts.filter((time: number) => now - time < windowMs);
        if (recentForKey.length === 0) {
          this.attempts.delete(k);
        }
      });
    }
    
    return true;
  }
  
  // איפוס עבור משתמש מסוים (למקרה חירום)
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// יצירת instance גלובלי של Rate Limiter
const rateLimiter = new RateLimiter();

// פונקציית עזר לבדיקת תוכן תמונה - אבטחה מתקדמת
const validateImageContent = async (file: File): Promise<boolean> => {
  try {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // בדיקת magic bytes עבור פורמטים מותרים
    const signatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
      [0x47, 0x49, 0x46, 0x38], // GIF
      [0x52, 0x49, 0x46, 0x46] // WEBP (starts with RIFF)
    ];
    
    return signatures.some(signature => 
      signature.every((byte, index) => 
        index < uint8Array.length && uint8Array[index] === byte
      )
    );
  } catch (error) {
    console.error('Error validating file content:', error);
    return false;
  }
};

// שירותי אחסון (Storage)
export const storageService = {
  // העלאת תמונה
  async uploadImage(userId: string, file: File, folder: string): Promise<string> {
    try {
      if (!userId || !file || !folder) {
        throw new Error('User ID, file, and folder are required');
      }
      
      // Rate limiting - מקסימום 10 העלאות תמונות לדקה
      if (!rateLimiter.isAllowed(`uploadImage:${userId}`, 10, 60000)) {
        throw new Error('Too many images uploaded. Please wait a moment before uploading more images.');
      }
      
      // וידוא שסוג הקובץ תקין
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF and WEBP are allowed');
      }
      
      // בדיקת תוכן הקובץ (magic bytes) - אבטחה מתקדמת
      const isValidImage = await validateImageContent(file);
      if (!isValidImage) {
        throw new Error('Invalid file content. File may be corrupted or not a valid image.');
      }
      
      // הגבלת גודל קובץ ל-3MB (מחמיר יותר לאבטחה)
      const maxFileSize = 3 * 1024 * 1024; // 3MB
      if (file.size > maxFileSize) {
        throw new Error('File too large. Maximum size is 3MB');
      }
      
      // שמירת שם קובץ מאובטח (מניעת path traversal)
      const secureFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${secureFileName}`;
      
      const storageRef = ref(storage, `${folder}/${userId}/${uniqueFileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      throw error;
    }
  },

  // מחיקת תמונה
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl) {
        console.warn('Image URL is empty, skipping deletion');
        return;
      }
      
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete images');
      }

      // חילוץ הנתיב מה-URL
      const urlObj = new URL(imageUrl);
      const fullPath = urlObj.pathname.split('/o/')[1];
      if (!fullPath) {
        throw new Error('Invalid storage URL');
      }

      // פענוח ה-URL והסרת פרמטרים
      const storagePath = decodeURIComponent(fullPath.split('?')[0]);

      // מחיקת התמונה
      const imageRef = ref(storage, storagePath);
      await deleteObject(imageRef);
    } catch (error: any) {
      // אם הקובץ לא נמצא, לא נזרוק שגיאה
      if (error.code === 'storage/object-not-found') {
        console.warn('התמונה כבר נמחקה או לא קיימת');
        return;
      }
      
      // שגיאת הרשאות
      if (error.code === 'storage/unauthorized') {
        console.error('אין הרשאות למחיקת התמונה');
        return;
      }

      console.error('שגיאה במחיקת תמונה:', error);
      throw error;
    }
  }
};

// שירותי משק בית
export const householdService = {
  // יצירת משק בית חדש
  async createHousehold(userId: string, name: string): Promise<string> {
    try {
      if (!userId || !name.trim()) {
        throw new Error('User ID and name are required');
      }
      
      // Rate limiting - מקסימום 3 יצירות משק בית ל-5 דקות
      if (!rateLimiter.isAllowed(`createHousehold:${userId}`, 3, 300000)) {
        throw new Error('Too many households created. Please wait a few minutes before creating another household.');
      }
      
      // סניטיזציה של קלט המשתמש
      const sanitizedName = sanitizeInput(name);
      
      // יצירת קוד רנדומלי בן 6 תווים
      const generateCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from(
          { length: 6 }, 
          () => chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
      };

      const code = generateCode();
      
      // בדיקה שהקוד לא קיים כבר
      const existingHouseholds = await getDocs(
        query(collection(db, 'households'), where('code', '==', code))
      );
      
      if (!existingHouseholds.empty) {
        // אם הקוד קיים, ננסה שוב
        return this.createHousehold(userId, name);
      }
      
      const docRef = await addDoc(collection(db, 'households'), {
        name: sanitizedName,
        code,
        ownerId: userId,
        members: {
          [userId]: {
            role: 'owner',
            name: auth.currentUser?.displayName || 'משתמש חדש',
            joinedAt: serverTimestamp()
          }
        },
        createdAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  // הצטרפות למשק בית קיים
  async joinHousehold(code: string, userId: string): Promise<string> {
    try {
      if (!code || !userId) {
        throw new Error('Code and user ID are required');
      }
      
      // Rate limiting - מקסימום 5 ניסיונות הצטרפות לדקה
      if (!rateLimiter.isAllowed(`joinHousehold:${userId}`, 5, 60000)) {
        throw new Error('Too many join attempts. Please wait a moment before trying again.');
      }
      
      // חיפוש משק הבית לפי הקוד
      const householdsQuery = await getDocs(
        query(collection(db, 'households'), where('code', '==', code))
      );
      
      if (householdsQuery.empty) {
        throw new Error('קוד משק בית לא נמצא');
      }
      
      const household = householdsQuery.docs[0];
      const householdData = household.data();
      
      // בדיקה אם המשתמש כבר חבר
      if (householdData.members?.[userId]) {
        throw new Error('המשתמש כבר חבר במשק בית זה');
      }
      
      // הוספת המשתמש למשק הבית
      await updateDoc(doc(db, 'households', household.id), {
        [`members.${userId}`]: {
          role: 'member',
          name: auth.currentUser?.displayName || 'משתמש חדש',
          joinedAt: serverTimestamp()
        }
      });
      
      return household.id;
    } catch (error) {
      throw error;
    }
  },

  // עזיבת משק בית
  async leaveHousehold(householdId: string, userId: string): Promise<void> {
    try {
      if (!householdId || !userId) {
        throw new Error('Household ID and user ID are required');
      }
      
      const householdRef = doc(db, 'households', householdId);
      const household = await getDoc(householdRef);
      
      if (!household.exists()) {
        throw new Error('משק הבית לא נמצא');
      }
      
      const householdData = household.data();
      
      // בדיקה שהמשתמש לא בעל משק הבית
      if (householdData.ownerId === userId) {
        throw new Error('בעל משק הבית לא יכול לעזוב. עליך למחוק את משק הבית או להעביר בעלות');
      }
      
      // מחיקת המשתמש ממשק הבית
      await updateDoc(householdRef, {
        [`members.${userId}`]: deleteField()
      });
    } catch (error) {
      throw error;
    }
  },
  
  // הוספת חבר למשק בית
  async addHouseholdMember(householdId: string, memberEmail: string): Promise<void> {
    try {
      if (!householdId || !memberEmail) {
        throw new Error('Household ID and member email are required');
      }
      
      // וידוא שהמשתמש הנוכחי הוא בעל משק הבית
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      
      if (!householdSnap.exists()) {
        throw new Error('Household not found');
      }
      
      const householdData = householdSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser || householdData.ownerId !== currentUser.uid) {
        throw new Error('Only the household owner can add members');
      }
      
      // חיפוש המשתמש לפי אימייל
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', memberEmail)
      );
      
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('User not found with the provided email');
      }
      
      const memberDoc = userSnapshot.docs[0];
      const memberId = memberDoc.id;
      const memberData = memberDoc.data();
      
      // עדכון רשימת החברים במשק הבית
      await updateDoc(householdRef, {
        [`members.${memberId}`]: {
          name: memberData.displayName || memberData.email,
          email: memberData.email,
          joinDate: serverTimestamp()
        }
      });
    } catch (error) {
      throw error;
    }
  },
  
  // הסרת חבר ממשק בית
  async removeHouseholdMember(householdId: string, memberId: string): Promise<void> {
    try {
      if (!householdId || !memberId) {
        throw new Error('Household ID and member ID are required');
      }
      
      // וידוא שהמשתמש הנוכחי הוא בעל משק הבית
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      
      if (!householdSnap.exists()) {
        throw new Error('Household not found');
      }
      
      const householdData = householdSnap.data();
      const currentUser = auth.currentUser;
      
      if (!currentUser || (householdData.ownerId !== currentUser.uid && memberId !== currentUser.uid)) {
        throw new Error('Only the household owner can remove members (or members can remove themselves)');
      }
      
      // הסרת החבר ממשק הבית
      await updateDoc(householdRef, {
        [`members.${memberId}`]: deleteField()
      });
    } catch (error) {
      throw error;
    }
  },

  // קבלת משק הבית של המשתמש
  async getUserHousehold(userId: string): Promise<Household | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // מחפש קודם משק בית שהמשתמש יצר
      const q1 = query(
        collection(db, 'households'),
        where('ownerId', '==', userId)
      );
      
      const querySnapshot1 = await getDocs(q1);
      
      if (!querySnapshot1.empty) {
        const householdDoc = querySnapshot1.docs[0];
        const data = householdDoc.data();
        return {
          id: householdDoc.id,
          code: data.code || '',
          name: data.name || '',
          ownerId: data.ownerId || '',
          members: data.members || {},
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        };
      }
      
      // אם לא נמצא, מחפש משקי בית שהמשתמש הוזמן אליהם כחבר
      const q2 = query(
        collection(db, 'households'),
        where(`members.${userId}`, '!=', null)
      );
      
      const querySnapshot2 = await getDocs(q2);
      
      if (!querySnapshot2.empty) {
        const householdDoc = querySnapshot2.docs[0];
        const data = householdDoc.data();
        return {
          id: householdDoc.id,
          code: data.code || '',
          name: data.name || '',
          ownerId: data.ownerId || '',
          members: data.members || {},
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        };
      }
      
      // אם לא נמצא משק בית כלל, מחזיר null
      return null;
    } catch (error) {
      throw error;
    }
  },

  // קבלת כל משקי הבית של המשתמש (גם בעלים וגם חבר)
  async getUserHouseholds(userId: string): Promise<Household[]> {
    try {
      if (!userId) throw new Error('User ID is required');

      const households: Household[] = [];

      // משקי בית שהמשתמש הוא הבעלים שלהם
      const ownedQuery = query(
        collection(db, 'households'),
        where('ownerId', '==', userId)
      );
      const ownedSnapshot = await getDocs(ownedQuery);
      ownedSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        households.push({
          id: docSnap.id,
          code: data.code || '',
          name: data.name || '',
          ownerId: data.ownerId || '',
          members: data.members || {},
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        });
      });

      // משקי בית שהמשתמש חבר בהם
      const memberQuery = query(
        collection(db, 'households'),
        where(`members.${userId}`, '!=', null)
      );
      const memberSnapshot = await getDocs(memberQuery);
      memberSnapshot.forEach(docSnap => {
        // להימנע מכפילות אם המשתמש גם בעלים
        if (households.find(h => h.id === docSnap.id)) return;
        const data = docSnap.data();
        households.push({
          id: docSnap.id,
          code: data.code || '',
          name: data.name || '',
          ownerId: data.ownerId || '',
          members: data.members || {},
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        });
      });

      return households;
    } catch (error) {
      throw error;
    }
  }
}; 