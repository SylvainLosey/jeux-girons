"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Trophy, Medal, Award } from "lucide-react";
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

export function RankingsView() {
  // Fetch all scores and groups
  const { data: scores, isLoading: isLoadingScores } = api.score.getAll.useQuery();
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  
  if (isLoadingScores || isLoadingGroups) {
    return <div className="text-center p-4">Chargement des classements...</div>;
  }

  if (!scores || !groups) {
    return (
      <Alert>
        <AlertDescription>Impossible de charger les données de classement.</AlertDescription>
      </Alert>
    );
  }

  // Calculate total scores for each group
  const groupScores = groups.map((group) => {
    const groupScoreEntries = scores.filter((score) => score.groupId === group.id);
    const totalScore = groupScoreEntries.reduce((sum, score) => sum + score.score, 0);
    const gamesPlayed = groupScoreEntries.length;
    
    return {
      group,
      totalScore,
      gamesPlayed,
    };
  });

  // Sort by total score (descending), then by games played (descending for tiebreaker)
  const rankedGroups = groupScores.sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.gamesPlayed - a.gamesPlayed;
  });

  // Helper function to get rank icon
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

  // Helper function to get rank styling
  const getRankStyling = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
      case 2:
        return "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800";
      case 3:
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
      default:
        return "";
    }
  };

  if (rankedGroups.length === 0) {
    return (
      <Alert>
        <AlertDescription>Aucune donnée de score n&apos;est disponible pour le moment.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-semibold">Classement complet</h2>
      </div>
      
      <div className="rounded-md border">
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
            {rankedGroups.map((groupData, index) => {
              const rank = index + 1;
              return (
                <TableRow 
                  key={groupData.group.id} 
                  className={cn(
                    "transition-colors",
                    getRankStyling(rank)
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {getRankIcon(rank)}
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
                    {groupData.totalScore} pts
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground text-center mt-4">
        Classement basé sur le score total, puis sur le nombre de jeux joués en cas d&apos;égalité
      </div>
    </div>
  );
} 