"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import React from "react";

interface ScoreEditorProps {
  groupId: number;
  groupName: string;
  gameId: number;
  gameName: string;
  round: number;
  onScoreUpdated?: () => void;
}

// Direct score editor without dialog wrapper - for embedding in other dialogs
export function DirectScoreEditor({ 
  groupId, 
  groupName, 
  gameId, 
  gameName, 
  round, 
  onScoreUpdated 
}: ScoreEditorProps) {
  const [score, setScore] = useState<number>(0);
  
  // Fetch current score
  const { data: currentScore, isLoading } = api.score.getScore.useQuery({
    groupId,
    gameId,
    round,
  });

  // Set score mutation
  const setScoreMutation = api.score.setScore.useMutation({
    onSuccess: () => {
      toast.success("Score mis à jour avec succès");
      onScoreUpdated?.();
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du score: " + error.message);
    },
  });

  // Initialize score when data loads
  React.useEffect(() => {
    if (currentScore) {
      setScore(currentScore.score);
    }
  }, [currentScore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScoreMutation.mutate({
      groupId,
      gameId,
      round,
      score,
    });
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group">Jeunesse</Label>
        <Input id="group" value={groupName} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="game">Jeu</Label>
        <Input 
          id="game" 
          value={`${gameName}${round > 1 ? ` (Tour ${round})` : ''}`} 
          disabled 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="score">Score</Label>
        <Input
          id="score"
          type="number"
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value) || 0)}
          placeholder="Entrez le score..."
          min="0"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button 
          type="submit" 
          disabled={setScoreMutation.isPending}
          className="w-full"
        >
          {setScoreMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
} 