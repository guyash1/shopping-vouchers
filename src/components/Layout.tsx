import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ScrollText, Receipt, BarChart3 } from "lucide-react";
import InstallPrompt from "./InstallPrompt";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isInstallable, isInstalled } = useInstallPrompt();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Install Banner - מופיע רק אם ניתן להתקנה */}
      {isInstallable && !isInstalled && (
        <InstallPrompt 
          variant="banner" 
          position="top" 
          showOnce={true}
          className="animate-slide-down"
        />
      )}
      
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

      <main className={`pb-20 ${isInstallable && !isInstalled ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
} 