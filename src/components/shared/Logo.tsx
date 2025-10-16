import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-6 h-6',
      text: 'text-lg',
      container: 'gap-2'
    },
    md: {
      icon: 'w-8 h-8',
      text: 'text-2xl',
      container: 'gap-2'
    },
    lg: {
      icon: 'w-12 h-12',
      text: 'text-4xl',
      container: 'gap-3'
    }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={`flex items-center ${sizeClasses.container} ${className}`}>
      <div className="relative">
        {/* אייקון עגלה עם עיצוב מיוחד */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2 shadow-lg">
          <ShoppingCart className={`${sizeClasses.icon} text-white`} strokeWidth={2.5} />
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent ${sizeClasses.text}`}>
            Carto
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-gray-500 mt-0.5">Smart Shopping</span>
          )}
        </div>
      )}
    </div>
  );
}

