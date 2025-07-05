"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

interface ClickFeedbackProps {
  children: React.ReactNode;
  className?: string;
  showSpinner?: boolean;
}

export function ClickFeedback({ 
  children, 
  className, 
  showSpinner = false 
}: ClickFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <div
      className={cn(
        "transition-all duration-100 select-none cursor-pointer",
        isPressed && "scale-[0.98] opacity-80",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-2">
        {children}
        {showSpinner && isPressed && (
          <Loader2 className="h-4 w-4 animate-spin text-oriental-gold" />
        )}
      </div>
    </div>
  );
} 