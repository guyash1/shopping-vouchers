/**
 * יצירת צבע ייחודי ועקבי למשתמש על בסיס ה-userId שלו
 * מחזיר אובייקט עם צבעים לשימושים שונים
 */
export function getUserColor(userId: string) {
  // פלטת צבעים יפה ומודרנית
  const colors = [
    { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' },
    { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100' },
    { border: 'border-l-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100' },
    { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100' },
    { border: 'border-l-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' },
    { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100' },
    { border: 'border-l-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100' },
    { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100' },
    { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100' },
  ];

  // יצירת hash מה-userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // בחירת צבע על בסיס ה-hash
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

