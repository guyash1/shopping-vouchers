import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Auth } from './components/Auth';
import ShoppingList from './components/ShoppingList';
import Vouchers from './components/Vouchers';
import { ScrollText, Receipt, BarChart3 } from "lucide-react";
import { HouseholdProvider } from './contexts/HouseholdContext';
import { HouseholdSwitcherModal } from './components/household/HouseholdSwitcherModal';

// קומפוננטת סטטיסטיקות פשוטה
function Stats() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">סטטיסטיקות</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-600">בקרוב...</p>
      </div>
    </div>
  );
}

// פונקציית עזר לשילוב מחלקות CSS
const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

// קומפוננטת ניווט תחתונה
function BottomNavbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="fixed bottom-0 right-0 left-0 bg-white border-t z-50">
      <nav className="max-w-md mx-auto flex justify-around p-2">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center p-2 rounded-lg",
            currentPath === "/" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <ScrollText className="w-6 h-6" />
          <span className="text-xs mt-1">קניות</span>
        </Link>
        <Link
          to="/vouchers"
          className={cn(
            "flex flex-col items-center p-2 rounded-lg",
            currentPath === "/vouchers" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <Receipt className="w-6 h-6" />
          <span className="text-xs mt-1">שוברים</span>
        </Link>
        <Link
          to="/stats"
          className={cn(
            "flex flex-col items-center p-2 rounded-lg",
            currentPath === "/stats" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-xs mt-1">סטטיסטיקות</span>
        </Link>
      </nav>
    </div>
  );
}

function App() {
  const [user, loading] = useAuthState(auth);
  const [isSwitcherOpen, setSwitcherOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setSwitcherOpen(true);
    window.addEventListener('openHouseholdSwitcher', handler);
    return () => window.removeEventListener('openHouseholdSwitcher', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-l-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <HouseholdProvider>
      <Router>
        <div dir="rtl" className="min-h-screen bg-gray-50">
          <main className="pb-20">
            <Routes>
              <Route path="/" element={<ShoppingList />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/stats" element={<Stats />} />
            </Routes>
          </main>
          <BottomNavbar />
          <HouseholdSwitcherModal isOpen={isSwitcherOpen} onClose={() => setSwitcherOpen(false)} />
        </div>
      </Router>
    </HouseholdProvider>
  );
}

export default App;
