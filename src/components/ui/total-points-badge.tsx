"use client";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { Award, Trophy, Medal } from "lucide-react";

interface TotalPointsBadgeProps {
  groupId: number;
  className?: string;
  showRankingAward?: boolean;
}

export function TotalPointsBadge({ groupId, className, showRankingAward = false }: TotalPointsBadgeProps) {
  const { data: groupScores, isLoading: isLoadingGroupScores } = api.score.getByGroup.useQuery(
    { groupId },
    {
      refetchInterval: 5000, // Refresh every 5 seconds for more responsive live updates
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Refetch when component mounts
    }
  );

  // Fetch all scores and groups for ranking calculation (only if showRankingAward is true)
  const { data: allScores, isLoading: isLoadingAllScores } = api.score.getAll.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    enabled: showRankingAward, // Only fetch if we need ranking
  });
  
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery(undefined, {
    enabled: showRankingAward, // Only fetch if we need ranking
  });

  if (isLoadingGroupScores || (showRankingAward && (isLoadingAllScores || isLoadingGroups))) {
    return null; // Don't show anything while loading
  }

  if (!groupScores || groupScores.length === 0) {
    return null; // Don't show badge if no scores yet
  }

  const totalPoints = groupScores.reduce((sum, score) => sum + score.score, 0);

  // Calculate ranking if requested
  let groupRank: number | null = null;
  if (showRankingAward && allScores && groups) {
    type GroupScore = {
      groupId: number;
      totalScore: number;
      gamesPlayed: number;
      actualRank: number;
      isTied: boolean;
    };

    // Calculate total scores for each group
    const groupScores: GroupScore[] = groups.map((group) => {
      const groupScoreEntries = allScores.filter((score) => score.groupId === group.id);
      const totalScore = groupScoreEntries.reduce((sum, score) => sum + score.score, 0);
      const gamesPlayed = groupScoreEntries.length;
      
      return {
        groupId: group.id,
        totalScore,
        gamesPlayed,
        actualRank: 0, // Will be calculated later
        isTied: false, // Will be calculated later
      };
    });

    // Sort by total score (descending), then by games played (ascending for tiebreaker)
    const sortedGroups = groupScores.sort((a, b) => {
      if (a.totalScore !== b.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.gamesPlayed - b.gamesPlayed;
    });

    // Calculate actual ranks with proper tie handling
    const rankedGroups: GroupScore[] = [];
    
    sortedGroups.forEach((group, index) => {
      if (index === 0) {
        // First group gets rank 1
        group.actualRank = 1;
        group.isTied = false;
      } else {
        const previousGroup = rankedGroups[rankedGroups.length - 1];
        
        // Check if this group is tied with the previous group
        if (previousGroup && 
            group.totalScore === previousGroup.totalScore && 
            group.gamesPlayed === previousGroup.gamesPlayed) {
          // Same rank as previous group (tied)
          group.actualRank = previousGroup.actualRank;
          group.isTied = true;
          
          // Mark previous group as tied too if it wasn't already
          if (!previousGroup.isTied) {
            previousGroup.isTied = true;
          }
        } else {
          // Different score, get next rank (which is current position + 1)
          group.actualRank = index + 1;
          group.isTied = false;
        }
      }
      
      rankedGroups.push(group);
    });

    // Find the rank for our specific group
    const currentGroup = rankedGroups.find(g => g.groupId === groupId);
    if (currentGroup) {
      groupRank = currentGroup.actualRank;
    }
  }

  const getRankText = (rank: number) => {
    return rank;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-8 w-8 text-yellow-600" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-600" />;
      case 3:
        return <Award className="h-8 w-8 text-orange-500" />;
      default:
        return <Award className="h-8 w-8 text-oriental-dark-brown" />;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Badge 
        variant="default" 
        className={cn(
          "bg-oriental-gold hover:bg-oriental-gold-dark text-oriental-dark-brown font-semibold text-sm px-3 py-1 flex-shrink-0",
          className
        )}
      >
        {totalPoints} pts
      </Badge>
      
      {showRankingAward && groupRank && totalPoints > 0 && (
        <div className={cn(
          "flex items-center",
          groupRank <= 3 ? "gap-2" : "gap-1"
        )}>
          {getRankIcon(groupRank)}
          <span className={cn(
            "text-2xl font-bold",
            groupRank === 1 ? "text-yellow-600" : 
            groupRank === 2 ? "text-gray-600" : 
            groupRank === 3 ? "text-orange-500" : 
            "text-oriental-dark-brown"
          )}>
            {getRankText(groupRank)}
          </span>
        </div>
      )}
    </div>
  );
} 