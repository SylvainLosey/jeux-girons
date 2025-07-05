"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

export function NavigationProgress() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Reset loading state when pathname changes (navigation complete)
    setIsLoading(false);
    setProgress(0);
  }, [pathname]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Listen for navigation events
  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
      setProgress(0);
    };

    const handleComplete = () => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    };

    // Listen for custom navigation events
    const handleCustomStart = () => handleStart();
    const handleCustomComplete = () => handleComplete();

    // Add event listeners
    window.addEventListener('beforeunload', handleStart);
    window.addEventListener('navigation-start', handleCustomStart);
    window.addEventListener('navigation-complete', handleCustomComplete);
    
    return () => {
      window.removeEventListener('beforeunload', handleStart);
      window.removeEventListener('navigation-start', handleCustomStart);
      window.removeEventListener('navigation-complete', handleCustomComplete);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
      <div
        className={cn(
          "h-full bg-gradient-to-r from-oriental-gold via-oriental-gold-dark to-oriental-gold transition-all duration-300 ease-out",
          "shadow-lg shadow-oriental-gold/50"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Hook to trigger navigation loading
export function useNavigationLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = () => {
    setIsLoading(true);
    // Dispatch a custom event to trigger the progress bar
    window.dispatchEvent(new CustomEvent('navigation-start'));
  };

  const stopLoading = () => {
    setIsLoading(false);
    window.dispatchEvent(new CustomEvent('navigation-complete'));
  };

  return { isLoading, startLoading, stopLoading };
} 