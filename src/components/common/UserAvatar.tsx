import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rounded?: 'full' | 'xl' | '2xl' | 'lg';
  alt?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base font-semibold',
  xl: 'w-16 h-16 text-xl font-bold',
  '2xl': 'w-24 h-24 text-3xl font-bold',
};

const roundedClasses = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  lg: 'rounded-lg',
};

// Deterministic pleasing gradient based on name
function getGradient(name: string = '') {
  const gradients = [
    'from-blue-600 to-indigo-700 text-white',
    'from-emerald-600 to-teal-700 text-white',
    'from-purple-600 to-violet-800 text-white',
    'from-amber-600 to-orange-700 text-white',
    'from-cyan-600 to-blue-700 text-white',
    'from-rose-600 to-pink-700 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string = ''): string {
  if (!name) return 'GI';
  const clean = name.replace(/^(د\.|م\.|Eng\.|Dr\.)\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = '',
  className = '',
  size = 'md',
  rounded = 'xl',
  alt = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const roundClass = roundedClasses[rounded] || roundedClasses.xl;
  const gradientClass = getGradient(name);
  const initials = getInitials(name);

  // Normalize image source path
  const normalizedSrc = src
    ? src.startsWith('/') || src.startsWith('http') || src.startsWith('data:')
      ? src
      : `/${src}`
    : '';

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={`bg-gradient-to-br ${gradientClass} ${sizeClass} ${roundClass} flex items-center justify-center font-bold select-none shrink-0 border border-white/20 shadow-xs ${className}`}
        aria-label={alt || name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt || name}
      onError={() => setHasError(true)}
      className={`${sizeClass} ${roundClass} object-cover shrink-0 border border-slate-200/80 shadow-xs ${className}`}
      loading="lazy"
    />
  );
};

export default UserAvatar;
