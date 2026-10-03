"use client";

import { Sparkle } from 'lucide-react';
import type { CSSProperties } from 'react';

const DOT_COUNT = 8;

interface SparkleLoaderProps {
  size?: number;
  className?: string;
}

export function SparkleLoader({ size = 56, className }: SparkleLoaderProps) {
  const dots = Array.from({ length: DOT_COUNT });

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <Sparkle
        className="absolute left-1/2 top-1/2 animate-sparkle-core text-accent"
        style={{ width: size * 0.38, height: size * 0.38 }}
        fill="currentColor"
      />
      {dots.map((_, i) => {
        const angle = (360 / DOT_COUNT) * i;
        const style: CSSProperties & { '--angle'?: string; '--radius'?: string } = {
          width: size * 0.16,
          height: size * 0.16,
          ['--angle' as any]: `${angle}deg`,
          ['--radius' as any]: `${size * 0.42}px`,
        };
        return (
          <Sparkle
            key={i}
            className="absolute left-1/2 top-1/2 animate-sparkle-burst text-primary"
            style={style}
            fill="currentColor"
          />
        );
      })}
    </div>
  );
}
