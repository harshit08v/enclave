import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge' | 'wordmark';
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  size = 'md',
  variant = 'full',
  showTagline = false,
  className = '',
  href = '/'
}: BrandLogoProps) {
  const sizeMap = {
    xs: { iconSize: 22, textSize: 'text-xs', taglineSize: 'text-[9px]', gap: 'gap-1.5' },
    sm: { iconSize: 28, textSize: 'text-sm', taglineSize: 'text-[10px]', gap: 'gap-2' },
    md: { iconSize: 34, textSize: 'text-base', taglineSize: 'text-[10px]', gap: 'gap-2.5' },
    lg: { iconSize: 44, textSize: 'text-lg', taglineSize: 'text-xs', gap: 'gap-3' },
    xl: { iconSize: 64, textSize: 'text-2xl', taglineSize: 'text-sm', gap: 'gap-3.5' }
  };

  const config = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center ${config.gap} group select-none ${className}`}>
      {/* Brand Emblem Icon */}
      {variant !== 'wordmark' && (
        <div
          className="relative overflow-hidden rounded-lg bg-[#0c120f] border border-[var(--border)] dark:border-[#253830] shadow-xs flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 duration-200"
          style={{ width: config.iconSize, height: config.iconSize }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="ENCLAVE Logo"
            width={config.iconSize}
            height={config.iconSize}
            className="w-full h-full object-cover rounded-lg"
            loading="eager"
          />
        </div>
      )}

      {/* Brand Wordmark & Tagline */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span
              className={`font-mono font-bold tracking-[0.2em] text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors ${config.textSize}`}
            >
              ENCL<span className="text-[var(--accent)]">A</span>VE
            </span>
          </div>
          {showTagline && (
            <span
              className={`font-mono font-medium tracking-[0.25em] text-[var(--text-muted)] uppercase mt-0.5 ${config.taglineSize}`}
            >
              Private by design
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

export default BrandLogo;
