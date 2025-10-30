import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // הצגת הכפתור רק כשגוללים למטה
  useEffect(() => {
    const toggleVisibility = () => {
      // הצג את הכפתור אם גללנו יותר מ-200px (קטין סף)
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // בדיקה ראשונית
    toggleVisibility();

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 md:right-8 bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all z-[60] backdrop-blur-sm"
          aria-label="חזרה למעלה"
          title="חזרה למעלה"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </>
  );
};

