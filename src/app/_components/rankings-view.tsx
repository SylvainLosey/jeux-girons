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
  actualRank: number;
  isTied: boolean;
  tiedWith?: number; // Number of teams tied at this rank
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
        <div className="font-medium text-sm truncate text-slate-700">
          {score.group.name}
        </div>
        <div className="text-xs text-slate-500">
          {score.game.name}
          {score.round > 1 && ` (Tour ${score.round})`}
        </div>
        <div className="text-xs text-slate-500">
          {formatTimeAgo(score.updatedAt)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold text-lg text-slate-700 dark:text-slate-300">
            {score.score}
          </div>
          <div className="text-xs text-slate-500">pts</div>
        </div>
        <TrendingUp className="h-4 w-4 text-slate-600" />
      </div>
    </div>
  );
}

  // Recent Scores Sidebar
function RecentScoresSidebar() {
  const { data: recentScores, isLoading } = api.score.getRecent.useQuery(
    { limit: 15 },
    { 
      refetchInterval: 30000, // Refresh every 30 seconds instead of 5 seconds
      refetchOnWindowFocus: false, // Don&apos;t refetch when window regains focus
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-oriental-accent" />
          <h3 className="text-lg font-semibold text-oriental-accent">Scores récents</h3>
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
        <Clock className="h-5 w-5 text-oriental-accent" />
        <h3 className="text-lg font-semibold text-oriental-accent">Scores récents</h3>
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
function RankingRow({ groupData, rankingsUpdateId, isNew = false }: { 
  groupData: GroupScore; 
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
    const timer = setTimeout(() => setMounted(true), groupData.actualRank * 50);
    return () => clearTimeout(timer);
  }, [groupData.actualRank]);

  // Animation trigger - only when rankings update ID changes AND there's a rank change
  useEffect(() => {
    // Only proceed if mounted and we have previous rank data and actual rank change
    if (!mounted || 
        groupData.previousRank === undefined || 
        groupData.previousRank === groupData.actualRank || 
        rankingsUpdateId === animationState.updateId ||
        !rankingsUpdateId) {
      return;
    }

    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Determine animation type
    const isImprovement = groupData.previousRank > groupData.actualRank;
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

  }, [mounted, groupData.previousRank, groupData.actualRank, rankingsUpdateId, animationState.updateId]);

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
        return <Trophy className="h-5 w-5 text-oriental-accent" />;
      case 2:
        return <Medal className="h-5 w-5 text-oriental-accent" />;
      case 3:
        return <Award className="h-5 w-5 text-oriental-accent" />;
      default:
        return null;
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
        baseStyle = "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700";
        break;
      default:
        baseStyle = "";
    }

    // Animation overlay styling
    if (animationState.isActive) {
      const animationStyle = animationState.type === 'improvement' 
        ? "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-700" 
        : "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-700";
      return animationStyle;
    }

    return baseStyle;
  };

  const getRankChangeIcon = () => {
    if (!groupData.previousRank || !mounted) return null;
    
    if (groupData.previousRank > groupData.actualRank) {
      return <ArrowUp className="h-4 w-4 text-gray-600 ml-1" />;
    } else if (groupData.previousRank < groupData.actualRank) {
      return <ArrowDown className="h-4 w-4 text-gray-600 ml-1" />;
    }
    return null;
  };

  const getRankDisplay = () => {
    if (groupData.isTied && groupData.tiedWith && groupData.tiedWith > 1) {
      return (
        <div className="flex flex-col items-center justify-center h-12">
          <div className="flex items-center">
            <span className="text-sm font-bold">
              {groupData.actualRank}
            </span>
            {getRankChangeIcon()}
          </div>
          <span className="text-xs text-muted-foreground">ex æquo</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-12">
        <span className="text-sm font-bold">
          {groupData.actualRank}
        </span>
        {getRankChangeIcon()}
      </div>
    );
  };

  const getTeamNameWithIcon = () => {
    const icon = getRankIcon(groupData.actualRank);
    return (
      <div className="flex items-center gap-2">
        {icon}
        <Link 
          href={`/teams/${createSlug(groupData.group.name)}`}
          className="hover:text-gray-700 hover:underline transition-colors"
        >
          {groupData.group.name}
        </Link>
      </div>
    );
  };

  return (
    <TableRow 
      ref={rowRef}
      className={cn(
        "transition-colors duration-300",
        getRankStyling(groupData.actualRank),
        mounted ? "opacity-100" : "opacity-0",
        animationState.isActive && "animate-pulse"
      )}
    >
      <TableCell className="font-medium">
        {getRankDisplay()}
      </TableCell>
      <TableCell className="font-medium">
        {getTeamNameWithIcon()}
      </TableCell>
      <TableCell className="text-center font-bold">
        <div className="flex items-center justify-center gap-1">
          <span className="transition-colors duration-300">
            <div className="font-bold text-lg text-gray-700 dark:text-gray-300">
              {groupData.totalScore} pts
            </div>
          </span>
          {groupData.scoreChange && (
            <span className="text-xs text-gray-600 dark:text-gray-400 font-normal">
              (+{groupData.scoreChange})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {groupData.gamesPlayed}
      </TableCell>
    </TableRow>
  );
}

export function RankingsView() {
  const [previousRankings, setPreviousRankings] = useState<Record<number, { rank: number; score: number }>>({});
  const [rankingsUpdateId, setRankingsUpdateId] = useState<string>('');
  
  // Fetch all scores and groups with more frequent updates for live display
  const { data: scores, isLoading: isLoadingScores } = api.score.getAll.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchOnWindowFocus: false, // Don&apos;t refetch when window regains focus
  });
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  
  // Fetch live schedule to get the first timeslot for empty state
  const { data: liveSchedule } = api.schedule.getLive.useQuery();

  // Check if any scores have been entered
  const hasAnyScores = scores && scores.length > 0;

  // Get first timeslot from live schedule for empty state
  const getFirstTimeslot = () => {
    if (!liveSchedule?.schedule || liveSchedule.schedule.length === 0) {
      return null;
    }
    
    const sortedSlots = [...liveSchedule.schedule].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    return sortedSlots[0];
  };

  const firstTimeslot = getFirstTimeslot();

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
      actualRank: 0, // Will be calculated later
      isTied: false, // Will be calculated later
    };
  }) ?? [];

  // Sort by total score (descending), then by games played (ascending for tiebreaker - fewer games = better efficiency)
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
      const previousGroup = rankedGroups[rankedGroups.length - 1]; // Get the last added group
      
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

  // Calculate how many teams are tied at each rank
  rankedGroups.forEach(group => {
    if (group.isTied) {
      const tiedTeams = rankedGroups.filter(g => g.actualRank === group.actualRank);
      group.tiedWith = tiedTeams.length;
    }
  });

  // Update previous rankings and create update ID when rankings actually change
  useEffect(() => {
    if (scores && groups && rankedGroups.length > 0) {
      const newRankings: Record<number, { rank: number; score: number }> = {};
      let hasRankingChanged = false;
      
      rankedGroups.forEach((groupData) => {
        const oldData = previousRankings[groupData.group.id];
        
        newRankings[groupData.group.id] = {
          rank: groupData.actualRank,
          score: groupData.totalScore,
        };
        
        // Check if any rank actually changed
        if (!oldData || oldData.rank !== groupData.actualRank) {
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

  // Show empty state if no scores have been entered yet
  if (!hasAnyScores) {
    const formatDateTime = (date: Date) => {
      return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric', 
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-6 w-6 text-oriental-accent" />
            <h2 className="text-2xl font-semibold oriental-title">Classement en direct</h2>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
          </div>
          
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold mb-2">Les jeux n&apos;ont pas encore commencé</h3>
            {firstTimeslot ? (
              <p className="text-slate-500 mb-4">
                Les jeux commencent le {formatDateTime(new Date(firstTimeslot.startTime))}
              </p>
            ) : (
              <p className="text-slate-500 mb-4">
                En attente du planning des jeux
              </p>
            )}
            <p className="text-sm text-slate-500">
              Le classement apparaîtra dès qu'un premier score sera enregistré.
            </p>
          </div>
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
          <Trophy className="h-6 w-6 text-oriental-accent" />
          <h2 className="text-2xl font-semibold oriental-title">Classement en direct</h2>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
        </div>
        
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rang</TableHead>
                <TableHead>Jeunesse</TableHead>
                <TableHead className="text-center">Score total</TableHead>
                <TableHead className="text-center">Jeux joués</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedGroups.map((groupData, index) => (
                <RankingRow
                  key={groupData.group.id}
                  groupData={groupData}
                  rankingsUpdateId={rankingsUpdateId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Classement mis à jour en temps réel - basé sur le score total, puis sur le nombre de jeux joués. Équipes avec le même score classées ex æquo.
        </div>
      </div>

      {/* Recent Scores Sidebar */}
      <div className="lg:col-span-1">
        <RecentScoresSidebar />
      </div>
    </div>
  );
} 