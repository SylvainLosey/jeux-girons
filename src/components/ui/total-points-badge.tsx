"use client";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface TotalPointsBadgeProps {
  groupId: number;
  className?: string;
}

export function TotalPointsBadge({ groupId, className }: TotalPointsBadgeProps) {
  const { data: scores, isLoading } = api.score.getByGroup.useQuery(
    { groupId },
    {
      refetchInterval: 5000, // Refresh every 5 seconds for more responsive live updates
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Refetch when component mounts
    }
  );

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (!scores || scores.length === 0) {
    return null; // Don't show badge if no scores yet
  }

  const totalPoints = scores.reduce((sum, score) => sum + score.score, 0);

  return (
    <Badge 
      variant="default" 
      className={cn(
        "bg-oriental-gold hover:bg-oriental-gold-dark text-white font-semibold text-sm px-3 py-1 flex-shrink-0",
        className
      )}
    >
      {totalPoints} pts
    </Badge>
  );
} 