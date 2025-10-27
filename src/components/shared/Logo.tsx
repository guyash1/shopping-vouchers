import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: {
      logo: 'w-8 h-8',
      text: 'text-lg',
      container: 'gap-2'
    },
    md: {
      logo: 'w-10 h-10',
      text: 'text-2xl',
      container: 'gap-2'
    },
    lg: {
      logo: 'w-16 h-16',
      text: 'text-4xl',
      container: 'gap-3'
    }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={`flex items-center ${sizeClasses.container} ${className}`}>
      {/* תמונת הלוגו עם אופטימיזציה לחדות */}
      <img 
        src="/logo512.png" 
        alt="Carto Logo" 
        className={`${sizeClasses.logo} object-contain`}
        style={{ 
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased'
        }}
        loading="eager"
      />
      
      {showText && size !== 'sm' && (
        <div className="flex flex-col leading-none">
          <span className="text-xs text-gray-500 mt-0.5">Smart Shopping</span>
        </div>
      )}
    </div>
  );
}

