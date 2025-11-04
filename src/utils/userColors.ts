// מטמון של הקצאות צבעים לכל משק בית
const householdColorAssignments = new Map<string, Map<string, number>>();

/**
 * יצירת צבע ייחודי ועקבי למשתמש על בסיס ה-userId שלו
 * מחזיר אובייקט עם צבעים לשימושים שונים
 * מבטיח שכל משתמש במשק בית מקבל צבע שונה
 */
export function getUserColor(userId: string, householdId?: string) {
  // פלטת צבעים יפה ומודרנית - מורחבת ל-15 צבעים
  const colors = [
    { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' },
    { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100' },
    { border: 'border-l-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100' },
    { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100' },
    { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100' },
    { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' },
    { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100' },
    { border: 'border-l-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100' },
    { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100' },
    { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100' },
    { border: 'border-l-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', badge: 'bg-lime-100' },
    { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100' },
    { border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100' },
    { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100' },
    { border: 'border-l-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', badge: 'bg-fuchsia-100' },
  ];

  // אם יש householdId, נשתמש בהקצאה חכמה
  if (householdId) {
    // אם אין מפה למשק בית הזה, ניצור אחת
    if (!householdColorAssignments.has(householdId)) {
      householdColorAssignments.set(householdId, new Map());
    }
    
    const householdMap = householdColorAssignments.get(householdId)!;
    
    // אם המשתמש כבר קיבל צבע, נחזיר אותו
    if (householdMap.has(userId)) {
      return colors[householdMap.get(userId)!];
    }
    
    // אחרת, נמצא את הצבע הבא שעוד לא בשימוש
    const usedIndices = new Set(householdMap.values());
    let nextIndex = 0;
    while (usedIndices.has(nextIndex) && nextIndex < colors.length) {
      nextIndex++;
    }
    
    // אם כל הצבעים תפוסים, נתחיל מחדש
    if (nextIndex >= colors.length) {
      nextIndex = householdMap.size % colors.length;
    }
    
    // שמירת ההקצאה
    householdMap.set(userId, nextIndex);
    return colors[nextIndex];
  }
  
  // אם אין householdId, נשתמש בשיטה הישנה (hash)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * קבלת שם המשתמש מה-household members
 */
export function getUserName(
  userId: string,
  household: { members: { [key: string]: { name: string } } } | null
): string {
  if (!household || !household.members || !household.members[userId]) {
    return 'משתמש';
  }
  return household.members[userId].name;
}

/**
 * קבלת שם קצר (אות ראשונה של השם הפרטי ושם המשפחה)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }
  return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
}

