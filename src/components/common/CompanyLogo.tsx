import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import companyLogoImg from '../../assets/logo.jpg';

interface CompanyLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  size = 'md',
  showText = false,
  textClassName = '',
  variant = 'auto',
  className = '',
}) => {
  const { isRtl } = useLanguage();
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-md',
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  const iconSizes = {
    xs: 16,
    sm: 20,
    md: 26,
    lg: 38,
    xl: 54,
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 flex items-center justify-center shrink-0 border border-blue-400/30 shadow-md shadow-blue-950/20 group`}
      >
        {!imageError ? (
          <img
            src={companyLogoImg}
            alt="Geoinformatics Logo"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* High-Fidelity GIS Vector Fallback */
          <svg
            width={iconSizes[size]}
            height={iconSizes[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white"
          >
            <circle cx="50" cy="50" r="46" stroke="url(#logo_grad_1)" strokeWidth="3" opacity="0.4" />
            <circle cx="50" cy="50" r="38" fill="url(#logo_grad_bg)" />
            {/* Latitude parallels */}
            <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3" fill="none" opacity="0.7" />
            <line x1="12" y1="50" x2="88" y2="50" stroke="#93c5fd" strokeWidth="2.5" />
            {/* Longitude meridians */}
            <ellipse cx="50" cy="50" rx="16" ry="38" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.7" />
            <line x1="50" y1="12" x2="50" y2="88" stroke="#38bdf8" strokeWidth="2.5" />
            {/* Orbital Remote Sensing Satellite path */}
            <path
              d="M18 78 C25 35, 75 25, 84 20"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Satellite beacon */}
            <circle cx="84" cy="20" r="4.5" fill="#fbbf24" />
            <circle cx="84" cy="20" r="8" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
            {/* Center GIS Coordinate Target */}
            <circle cx="50" cy="50" r="5" fill="#3b82f6" />
            <circle cx="50" cy="50" r="2" fill="#ffffff" />
            <defs>
              <linearGradient id="logo_grad_1" x1="0" y1="0" x2="100" y2="100">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#4f46e5" />
              </linearGradient>
              <radialGradient id="logo_grad_bg" cx="50" cy="50" r="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1e3a8a" />
                <stop offset="0.7" stopColor="#0f172a" />
                <stop offset="1" stopColor="#020617" />
              </radialGradient>
            </defs>
          </svg>
        )}
      </div>

      {showText && (
        <div className={`flex flex-col text-start ${textClassName}`}>
          <span className="font-black text-slate-900 text-sm tracking-tight leading-none">
            GEOINFORMATICS
          </span>
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
            {isRtl ? 'نظم المعلومات والاستشعار عن بعد' : 'GIS & Remote Sensing Platform'}
          </span>
        </div>
      )}
    </div>
  );
};
