"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Trophy, Medal, Award, ChevronRight, BarChart3 } from "lucide-react";
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

// Helper function to calculate progress
function calculateGameProgress(
  scores: { id: number; score: number; groupId: number; gameId: number }[] | undefined, 
  groups: { id: number; name: string }[] | undefined, 
  games: { id: number; name: string; rounds?: number | null }[] | undefined
) {
  if (!scores || !groups || !games) {
    return { percentage: 0, playedGames: 0, totalGames: 0 };
  }

  const playedGames = scores.length;
  const totalGames = groups.length * games.reduce((sum, game) => sum + (game.rounds ?? 1), 0);
  const percentage = totalGames > 0 ? Math.round((playedGames / totalGames) * 100) : 0;

  return { percentage, playedGames, totalGames };
}

// Compact Progress Bar Component for preview - inline version
function CompactProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-gradient-to-r from-oriental-accent to-oriental-accent/80 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-oriental-accent">{percentage}%</span>
    </div>
  );
}

type GroupScore = {
  group: { id: number; name: string };
  totalScore: number;
  gamesPlayed: number;
  actualRank: number;
  isTied: boolean;
  tiedWith?: number;
};

export function RankingsPreview() {
  // Fetch all scores and groups
  const { data: scores, isLoading: isLoadingScores } = api.score.getAll.useQuery();
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  const { data: games, isLoading: isLoadingGames } = api.game.getAll.useQuery();
  
  if (isLoadingScores || isLoadingGroups || isLoadingGames) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Classement</h2>
        </div>
        <div className="text-center p-8 text-muted-foreground">
          Chargement des classements...
        </div>
      </div>
    );
  }

  if (!scores || !groups || !games) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Classement</h2>
        </div>
        <Alert>
          <AlertDescription>Impossible de charger les données de classement.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Don't show rankings preview if no scores have been entered
  const hasAnyScores = scores && scores.length > 0;
  if (!hasAnyScores) {
    return null; // Don't render anything if no scores
  }

  // Calculate progress
  const progress = calculateGameProgress(scores, groups, games);

  // Calculate total scores for each group
  const groupScores: GroupScore[] = groups.map((group) => {
    const groupScoreEntries = scores.filter((score) => score.groupId === group.id);
    const totalScore = groupScoreEntries.reduce((sum, score) => sum + score.score, 0);
    const gamesPlayed = groupScoreEntries.length;
    
    return {
      group,
      totalScore,
      gamesPlayed,
      actualRank: 0, // Will be calculated later
      isTied: false, // Will be calculated later
    };
  });

  // Sort by total score (descending), then by games played (ascending for tiebreaker - fewer games = better efficiency)
  const sortedGroups = groupScores.sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.gamesPlayed - b.gamesPlayed;
  });

  // Calculate actual ranks with proper tie handling (same logic as RankingsView)
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

  // Calculate how many teams are tied at each rank
  rankedGroups.forEach(group => {
    if (group.isTied) {
      const tiedTeams = rankedGroups.filter(g => g.actualRank === group.actualRank);
      group.tiedWith = tiedTeams.length;
    }
  });

  // Take only top 5 for preview
  const top5 = rankedGroups.slice(0, 5);

  // Helper functions (same as RankingsView)
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-600" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankStyling = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
      case 2:
        return "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800";
      case 3:
        return "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700";
      default:
        return "";
    }
  };

  const getRankDisplay = (groupData: GroupScore) => {
    return (
      <div className="flex flex-col items-center min-h-[2.5rem] justify-center">
        <div className="flex items-center">
          <span className="h-5 w-5 flex items-center justify-center text-sm font-bold">
            {groupData.actualRank}
          </span>
        </div>
        {groupData.isTied && groupData.tiedWith && groupData.tiedWith > 1 && (
          <span className="text-xs text-muted-foreground mt-1">ex æquo</span>
        )}
      </div>
    );
  };

  const getTeamNameWithIcon = (groupData: GroupScore) => {
    const icon = getRankIcon(groupData.actualRank);
    return (
      <div className="flex items-center gap-2">
        {icon}
        <Link 
          href={`/teams/${createSlug(groupData.group.name)}`}
          className="hover:text-slate-800 hover:underline transition-colors text-slate-700"
        >
          {groupData.group.name}
        </Link>
      </div>
    );
  };

  if (top5.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Classement</h2>
        </div>
        <Alert>
          <AlertDescription>Aucune donnée de score n&apos;est disponible pour le moment.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Classement</h2>
        </div>
        <CompactProgressBar percentage={progress.percentage} />
      </div>
      
      <div className="rounded-md border border-oriental-gold-light overflow-hidden bg-white">
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
            {top5.map((groupData) => (
              <TableRow 
                key={groupData.group.id} 
                className={cn(
                  "transition-colors",
                  getRankStyling(groupData.actualRank)
                )}
              >
                <TableCell className="font-medium">
                  {getRankDisplay(groupData)}
                </TableCell>
                <TableCell className="font-medium">
                  {getTeamNameWithIcon(groupData)}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {groupData.totalScore} pts
                </TableCell>
                <TableCell className="text-center">
                  {groupData.gamesPlayed}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {rankedGroups.length > 5 && (
        <div className="text-center">
          <Link href="/rankings">
            <Button 
              size="sm" 
              className="bg-oriental-accent hover:bg-oriental-accent/90 border border-oriental-accent hover:border-oriental-accent/90 text-white transition-all duration-200"
            >
              Voir le classement complet
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
} 