"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "~/lib/utils";

interface PrefetchLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetchOnHover?: boolean;
}

export function PrefetchLink({ 
  href, 
  children, 
  className, 
  prefetchOnHover = true 
}: PrefetchLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!prefetchOnHover) return;

    const link = linkRef.current;
    if (!link) return;

    const handleMouseEnter = () => {
      // Create a temporary link to trigger Next.js prefetching
      const tempLink = document.createElement('link');
      tempLink.rel = 'prefetch';
      tempLink.href = href;
      document.head.appendChild(tempLink);
      
      // Remove after a short delay
      setTimeout(() => {
        document.head.removeChild(tempLink);
      }, 100);
    };

    link.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      link.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [href, prefetchOnHover]);

  return (
    <Link
      ref={linkRef}
      href={href}
      prefetch={false} // We'll handle prefetching manually
      className={cn(className)}
    >
      {children}
    </Link>
  );
} 