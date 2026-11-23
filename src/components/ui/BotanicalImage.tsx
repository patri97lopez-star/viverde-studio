import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

interface BotanicalImageProps {
  src?: string;
  alt: string;
  className?: string;
  accentHex?: string;
}

export const BotanicalImage: React.FC<BotanicalImageProps> = ({
  src,
  alt,
  className = '',
  accentHex = '#A7B9A0',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#DDE8D8]/60 text-[#183D32] p-4 ${className}`}
        style={{ backgroundImage: `linear-gradient(135deg, #DDE8D8 0%, ${accentHex}33 100%)` }}
        role="img"
        aria-label={alt}
      >
        <Sprout className="w-8 h-8 mb-2 opacity-75" />
        <span className="text-xs font-medium text-center text-[#183D32]/80 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
