'use client';

import Image from 'next/image';
import { getIconPath } from '@/lib/game/icons';
import { useState } from 'react';

interface ResourceIconProps {
  iconName: string;
  alt: string;
  size?: number;
  className?: string;
}

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

