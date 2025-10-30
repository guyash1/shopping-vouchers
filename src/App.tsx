import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import ShoppingList from './components/ShoppingList';
import Vouchers from './components/Vouchers';
import { ScrollText, Receipt, BarChart3, Wallet } from "lucide-react";
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext';
import { VouchersProvider } from './contexts/VouchersContext';
import { AuthModalProvider } from './contexts/AuthModalContext';
import { HouseholdSwitcherModal } from './components/household/HouseholdSwitcherModal';
import AuthModal from './components/shared/AuthModal';
import { useAuthModal } from './contexts/AuthModalContext';
import Stats from './components/Stats';
import RedeemVouchers from './components/VoucherOptimizer';

// פונקציית עזר לשילוב מחלקות CSS
const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

// קומפוננטת ניווט תחתונה
function BottomNavbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="fixed bottom-0 right-0 left-0 bg-white border-t z-50">
      <nav className="max-w-md mx-auto flex p-2">
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center p-2 rounded-lg",
            currentPath === "/" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <ScrollText className="w-6 h-6" />
          <span className="text-xs mt-1">קניות</span>
        </Link>
        <Link
          to="/vouchers"
          className={cn(
            "flex-1 flex flex-col items-center p-2 rounded-lg",
            currentPath === "/vouchers" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <Receipt className="w-6 h-6" />
          <span className="text-xs mt-1">שוברים</span>
        </Link>
        <Link
          to="/stats"
          className={cn(
            "flex-1 flex flex-col items-center p-2 rounded-lg",
            currentPath === "/stats" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-xs mt-1">סטטיסטיקות</span>
        </Link>
        <Link
          to="/redeem"
          className={cn(
            "flex-1 flex flex-col items-center p-2 rounded-lg",
            currentPath === "/redeem" ? "text-blue-600" : "text-gray-600"
          )}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-xs mt-1">מימוש סופר</span>
        </Link>
      </nav>
    </div>
  );
}

function AppContent() {
  const [isSwitcherOpen, setSwitcherOpen] = React.useState(false);
  const { isOpen, actionType, closeAuthModal } = useAuthModal();
  const { needsOnboarding, loading: householdLoading, refreshHouseholds } = useHousehold();

  React.useEffect(() => {
    const handler = () => setSwitcherOpen(true);
    window.addEventListener('openHouseholdSwitcher', handler);
    return () => window.removeEventListener('openHouseholdSwitcher', handler);
  }, []);

  // Auto-open household selector for new users
  React.useEffect(() => {
    if (needsOnboarding && !householdLoading) {
      setSwitcherOpen(true);
    }
  }, [needsOnboarding, householdLoading]);

  const handleSwitcherClose = () => {
    setSwitcherOpen(false);
  };

  const handleSwitcherSuccess = () => {
    refreshHouseholds();
    setSwitcherOpen(false);
    
    // Open help modal for first-time users
    if (needsOnboarding) {
      setTimeout(() => {
        const event = new CustomEvent('openHelpModal');
        window.dispatchEvent(event);
      }, 500);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <main className="pb-20">
        <Routes>
          <Route path="/" element={<ShoppingList />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/redeem" element={<RedeemVouchers />} />
        </Routes>
      </main>
      <BottomNavbar />
      <HouseholdSwitcherModal 
        isOpen={isSwitcherOpen} 
        onClose={handleSwitcherClose}
        onSuccess={handleSwitcherSuccess}
      />
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} actionType={actionType} />
    </div>
  );
}

function App() {
  const [, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-l-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <AuthModalProvider>
        <HouseholdProvider>
          <VouchersProvider>
            <AppContent />
          </VouchersProvider>
        </HouseholdProvider>
      </AuthModalProvider>
    </Router>
  );
}

export default App;
