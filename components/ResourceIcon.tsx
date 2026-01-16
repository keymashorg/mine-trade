'use client';

import Image from 'next/image';
import { getIconPath, getMetalIcon, getFormIcon } from '@/lib/game/icons';
import { useState } from 'react';
import type { MetalType, SpecimenForm, Grade } from '@/lib/game/constants';

interface ResourceIconProps {
  iconName: string;
  alt: string;
  size?: number;
  className?: string;
}

interface SpecimenIconProps {
  metalType: MetalType;
  form: SpecimenForm;
  grade: Grade;
  size?: number;
  className?: string;
  showOverlays?: boolean;
}

// Basic resource icon
export default function ResourceIcon({ iconName, alt, size = 32, className = '' }: ResourceIconProps) {
  const [imgError, setImgError] = useState(false);
  const iconPath = getIconPath(iconName);

  if (imgError) {
    // Fallback: show a placeholder
    return (
      <div
        className={`bg-gray-700 rounded flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={alt}
      >
        <span className="text-xs text-gray-400">?</span>
      </div>
    );
  }

  return (
    <Image
      src={iconPath}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
      onError={() => setImgError(true)}
    />
  );
}

// Specimen icon with overlays (form badge + grade ring/glow)
export function SpecimenIcon({
  metalType,
  form,
  grade,
  size = 48,
  className = '',
  showOverlays = true,
}: SpecimenIconProps) {
  const [metalError, setMetalError] = useState(false);
  const [formError, setFormError] = useState(false);
  
  const metalIconName = getMetalIcon(metalType);
  const formIconName = getFormIcon(form);
  
  const metalPath = getIconPath(metalIconName);
  const formPath = getIconPath(formIconName);
  
  // Grade styling
  const gradeStyles = {
    Low: {
      ring: 'ring-2 ring-gray-500',
      glow: '',
      bgGlow: '',
    },
    High: {
      ring: 'ring-2 ring-blue-400',
      glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
      bgGlow: 'bg-blue-500/10',
    },
    Ultra: {
      ring: 'ring-2 ring-purple-400',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
      bgGlow: 'bg-purple-500/20',
    },
  };
  
  const style = gradeStyles[grade];
  const badgeSize = Math.max(12, size * 0.35);
  
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-lg ${style.ring} ${style.glow} ${style.bgGlow} ${className}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      {/* Ultra sparkle animation */}
      {grade === 'Ultra' && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute inset-0 animate-pulse opacity-50">
            <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s' }} />
            <div className="absolute top-2 right-2 w-1 h-1 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-2 left-3 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-purple-200 rounded-full animate-ping" style={{ animationDelay: '0.9s' }} />
          </div>
        </div>
      )}
      
      {/* Base metal icon */}
      {!metalError ? (
        <Image
          src={metalPath}
          alt={metalType}
          width={size}
          height={size}
          unoptimized
          onError={() => setMetalError(true)}
        />
      ) : (
        <div
          className="bg-gray-600 rounded flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-xs">{metalType}</span>
        </div>
      )}
      
      {/* Form badge overlay (bottom right) */}
      {showOverlays && (
        <div
          className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full p-0.5 border border-gray-600"
          style={{ width: badgeSize + 4, height: badgeSize + 4 }}
        >
          {!formError ? (
            <Image
              src={formPath}
              alt={form}
              width={badgeSize}
              height={badgeSize}
              unoptimized
              onError={() => setFormError(true)}
            />
          ) : (
            <span className="text-[8px] text-gray-400">{form[0]}</span>
          )}
        </div>
      )}
      
      {/* Grade indicator (top left) */}
      {showOverlays && (
        <div
          className={`absolute -top-1 -left-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
            grade === 'Ultra' ? 'bg-purple-500 text-white' :
            grade === 'High' ? 'bg-blue-500 text-white' :
            'bg-gray-600 text-gray-300'
          }`}
        >
          {grade[0]}
        </div>
      )}
    </div>
  );
}

// Metal icon with just the grade glow (for unit displays)
export function MetalIcon({
  metalType,
  size = 32,
  className = '',
  glow = false,
}: {
  metalType: MetalType;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const iconName = getMetalIcon(metalType);
  const iconPath = getIconPath(iconName);

  if (imgError) {
    return (
      <div
        className={`bg-gray-700 rounded flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={metalType}
      >
        <span className="text-xs text-gray-400">{metalType}</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${glow ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''} ${className}`}>
      <Image
        src={iconPath}
        alt={metalType}
        width={size}
        height={size}
        unoptimized
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// Module category icon
export function ModuleCategoryIcon({
  category,
  size = 24,
  className = '',
}: {
  category: 'extraction' | 'cooling' | 'sorting' | 'refining' | 'storage' | 'market';
  size?: number;
  className?: string;
}) {
  const icons = {
    extraction: '⛏️',
    cooling: '❄️',
    sorting: '🔄',
    refining: '🔥',
    storage: '📦',
    market: '💰',
  };
  
  const colors = {
    extraction: 'bg-orange-500/20 text-orange-400',
    cooling: 'bg-blue-500/20 text-blue-400',
    sorting: 'bg-green-500/20 text-green-400',
    refining: 'bg-red-500/20 text-red-400',
    storage: 'bg-yellow-500/20 text-yellow-400',
    market: 'bg-purple-500/20 text-purple-400',
  };
  
  return (
    <div
      className={`rounded-full flex items-center justify-center ${colors[category]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.6 }}
    >
      {icons[category]}
    </div>
  );
}

// Animated production icon (for shift feed)
export function ProductionFeedIcon({
  metalType,
  units,
  isSpecimen = false,
  grade,
  onComplete,
}: {
  metalType: MetalType;
  units: number;
  isSpecimen?: boolean;
  grade?: Grade;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(true);
  
  // Animate and then remove
  useState(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2000);
    return () => clearTimeout(timer);
  });
  
  if (!visible) return null;
  
  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full
        animate-[slideUp_0.5s_ease-out,fadeOut_0.5s_ease-in_1.5s_forwards]
        ${isSpecimen ? 'bg-purple-600/30 border border-purple-500' : 'bg-gray-700/50'}
      `}
    >
      <MetalIcon metalType={metalType} size={16} />
      <span className="text-xs font-bold">
        {isSpecimen ? '✨' : `+${units}`}
      </span>
    </div>
  );
}
