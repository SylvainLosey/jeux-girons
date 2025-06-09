"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Trophy, Medal, Award, ArrowUp, ArrowDown, Clock, TrendingUp } from "lucide-react";
import { cn } from "~/lib/utils";

// Helper function to create URL-friendly slugs
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

type GroupScore = {
  group: { id: number; name: string };
  totalScore: number;
  gamesPlayed: number;
  previousRank?: number;
  scoreChange?: number;
};

type RecentScore = {
  id: number;
  score: number;
  round: number;
  createdAt: Date;
  updatedAt: Date | null;
  groupId: number;
  gameId: number;
  group: { 
    id: number; 
    name: string;
    contactName: string | null;
    contactPhone: string | null;
    createdAt: Date;
    updatedAt: Date | null;
  };
  game: { 
    id: number; 
    name: string;
    createdAt: Date;
    updatedAt: Date | null;
  };
};

// Recent Score Item Component
function RecentScoreItem({ score, index }: { score: RecentScore; index: number }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Inconnu";
    
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return dateObj.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
      "hover:bg-muted/50 hover:border-primary/20",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
    )}>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {score.group.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {score.game.name}
          {score.round > 1 && ` (Tour ${score.round})`}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatTimeAgo(score.updatedAt)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold text-lg text-green-600 dark:text-green-400">
            {score.score}
          </div>
          <div className="text-xs text-muted-foreground">pts</div>
        </div>
        <TrendingUp className="h-4 w-4 text-green-500" />
      </div>
    </div>
  );
}

// Recent Scores Sidebar
function RecentScoresSidebar() {
  const { data: recentScores, isLoading } = api.score.getRecent.useQuery(
    { limit: 15 },
    { refetchInterval: 5000 } // Refresh every 5 seconds for live updates
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Scores récents</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Scores récents</h3>
      </div>
      
      {recentScores && recentScores.length > 0 ? (
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {recentScores.map((score, index) => (
            <RecentScoreItem 
              key={`${score.id}-${score.updatedAt?.getTime() ?? score.createdAt.getTime()}`} 
              score={score} 
              index={index} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucun score récent</p>
        </div>
      )}
    </div>
  );
}

// Animated Ranking Row Component
function RankingRow({ groupData, rank, rankingsUpdateId, isNew = false }: { 
  groupData: GroupScore; 
  rank: number; 
  rankingsUpdateId: string;
  isNew?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [animationState, setAnimationState] = useState<{
    isActive: boolean;
    type: 'improvement' | 'decline' | null;
    updateId: string;
  }>({
    isActive: false,
    type: null,
    updateId: '',
  });
  const rowRef = useRef<HTMLTableRowElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), rank * 50);
    return () => clearTimeout(timer);
  }, [rank]);

  // Animation trigger - only when rankings update ID changes AND there's a rank change
  useEffect(() => {
    // Only proceed if mounted and we have previous rank data and actual rank change
    if (!mounted || 
        groupData.previousRank === undefined || 
        groupData.previousRank === rank || 
        rankingsUpdateId === animationState.updateId ||
        !rankingsUpdateId) {
      return;
    }

    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Determine animation type
    const isImprovement = groupData.previousRank > rank;
    const animationType: 'improvement' | 'decline' = isImprovement ? 'improvement' : 'decline';
    
    // Start new animation
    setAnimationState({
      isActive: true,
      type: animationType,
      updateId: rankingsUpdateId,
    });
    
    // Stop animation after 3 seconds
    animationTimeoutRef.current = setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        isActive: false,
      }));
      animationTimeoutRef.current = null;
    }, 3000);

  }, [mounted, groupData.previousRank, rank, rankingsUpdateId, animationState.updateId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyling = (rank: number) => {
    // Base styling for rank-based appearance
    let baseStyle = "";
    switch (rank) {
      case 1:
        baseStyle = "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
        break;
      case 2:
        baseStyle = "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800";
        break;
      case 3:
        baseStyle = "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
        break;
      default:
        baseStyle = "";
    }

    // Animation overlay styling
    if (animationState.isActive) {
      const animationStyle = animationState.type === 'improvement' 
        ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" 
        : "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
      return animationStyle;
    }

    return baseStyle;
  };

  const getRankChangeIcon = () => {
    if (!groupData.previousRank || !mounted) return null;
    
    if (groupData.previousRank > rank) {
      return <ArrowUp className="h-4 w-4 text-green-500 ml-1" />;
    } else if (groupData.previousRank < rank) {
      return <ArrowDown className="h-4 w-4 text-red-500 ml-1" />;
    }
    return null;
  };

  return (
    <TableRow 
      ref={rowRef}
      className={cn(
        "transition-colors duration-300",
        getRankStyling(rank),
        mounted ? "opacity-100" : "opacity-0",
        animationState.isActive && "animate-pulse"
      )}
    >
      <TableCell className="font-medium">
        <div className="flex items-center justify-center">
          {getRankIcon(rank)}
          {getRankChangeIcon()}
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <Link 
          href={`/teams/${createSlug(groupData.group.name)}`}
          className="hover:text-blue-600 hover:underline transition-colors"
        >
          {groupData.group.name}
        </Link>
      </TableCell>
      <TableCell className="text-center">
        {groupData.gamesPlayed}
      </TableCell>
      <TableCell className="text-center font-bold">
        <div className="flex items-center justify-center gap-1">
          <span className="transition-colors duration-300">
            {groupData.totalScore} pts
          </span>
          {groupData.scoreChange && (
            <span className="text-xs text-green-600 dark:text-green-400 font-normal">
              (+{groupData.scoreChange})
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function RankingsView() {
  const [previousRankings, setPreviousRankings] = useState<Record<number, { rank: number; score: number }>>({});
  const [rankingsUpdateId, setRankingsUpdateId] = useState<string>('');
  
  // Fetch all scores and groups with more frequent updates for live display
  const { data: scores, isLoading: isLoadingScores } = api.score.getAll.useQuery(undefined, {
    refetchInterval: 3000, // Refresh every 3 seconds for live updates
  });
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();

  // Calculate total scores for each group
  const groupScores: GroupScore[] = groups?.map((group) => {
    const groupScoreEntries = scores?.filter((score) => score.groupId === group.id) ?? [];
    const totalScore = groupScoreEntries.reduce((sum, score) => sum + score.score, 0);
    const gamesPlayed = groupScoreEntries.length;
    
    const previousData = previousRankings[group.id];
    const scoreChange = previousData ? totalScore - previousData.score : undefined;
    
    return {
      group,
      totalScore,
      gamesPlayed,
      previousRank: previousData?.rank,
      scoreChange: scoreChange && scoreChange > 0 ? scoreChange : undefined,
    };
  }) ?? [];

  // Sort by total score (descending), then by games played (descending for tiebreaker)
  const rankedGroups = groupScores.sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.gamesPlayed - a.gamesPlayed;
  });

  // Update previous rankings and create update ID when rankings actually change
  useEffect(() => {
    if (scores && groups && rankedGroups.length > 0) {
      const newRankings: Record<number, { rank: number; score: number }> = {};
      let hasRankingChanged = false;
      
      rankedGroups.forEach((groupData, index) => {
        const newRank = index + 1;
        const oldData = previousRankings[groupData.group.id];
        
        newRankings[groupData.group.id] = {
          rank: newRank,
          score: groupData.totalScore,
        };
        
        // Check if any rank actually changed
        if (!oldData || oldData.rank !== newRank) {
          hasRankingChanged = true;
        }
      });
      
      // Only update if rankings actually changed
      if (hasRankingChanged) {
        setPreviousRankings(newRankings);
        setRankingsUpdateId(Date.now().toString());
      }
    }
  }, [scores, groups, rankedGroups]);
  
  if (isLoadingScores || isLoadingGroups) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="text-center p-4">Chargement des classements...</div>
        </div>
        <div className="lg:col-span-1">
          <RecentScoresSidebar />
        </div>
      </div>
    );
  }

  if (!scores || !groups) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Alert>
            <AlertDescription>Impossible de charger les données de classement.</AlertDescription>
          </Alert>
        </div>
        <div className="lg:col-span-1">
          <RecentScoresSidebar />
        </div>
      </div>
    );
  }

  if (rankedGroups.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Alert>
            <AlertDescription>Aucune donnée de score n&apos;est disponible pour le moment.</AlertDescription>
          </Alert>
        </div>
        <div className="lg:col-span-1">
          <RecentScoresSidebar />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Rankings Table */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-semibold">Classement en direct</h2>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
        </div>
        
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rang</TableHead>
                <TableHead>Jeunesse</TableHead>
                <TableHead className="text-center">Jeux joués</TableHead>
                <TableHead className="text-center">Score total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedGroups.map((groupData, index) => (
                <RankingRow
                  key={groupData.group.id}
                  groupData={groupData}
                  rank={index + 1}
                  rankingsUpdateId={rankingsUpdateId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Classement mis à jour en temps réel - basé sur le score total, puis sur le nombre de jeux joués
        </div>
      </div>

      {/* Recent Scores Sidebar */}
      <div className="lg:col-span-1">
        <RecentScoresSidebar />
      </div>
    </div>
  );
} 