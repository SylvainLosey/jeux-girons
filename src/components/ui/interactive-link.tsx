"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "~/lib/utils";

interface InteractiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: () => void;
}

export function InteractiveLink({ 
  href, 
  children, 
  className, 
  prefetch = true, 
  onClick 
}: InteractiveLinkProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    onClick?.();
    
    // Trigger navigation progress
    window.dispatchEvent(new CustomEvent('navigation-start'));
    
    // Reset after animation
    setTimeout(() => setIsClicked(false), 300);
  };

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "transition-all duration-200",
        isClicked && "opacity-80 scale-[0.98]",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
} 