"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import React from "react";
import { analytics } from "~/lib/analytics";

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
  const [scoreInput, setScoreInput] = useState<string>("");
  const [scoreError, setScoreError] = useState<string>("");
  const utils = api.useUtils();
  
  // Fetch current score
  const { data: currentScore, isLoading } = api.score.getScore.useQuery({
    groupId,
    gameId,
    round,
  });

  // Set score mutation
  const setScoreMutation = api.score.setScore.useMutation({
    onSuccess: async () => {
      // Track score update
      analytics.trackInteraction("score_updated", {
        group_name: groupName,
        game_name: gameName,
        round: round,
        score: score,
      });
      
      // Invalidate all score-related queries to ensure live updates
      await utils.score.invalidate();
      
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
      setScoreInput(currentScore.score.toString());
    }
  }, [currentScore]);

  const validateScore = (value: string): boolean => {
    // Check if it's a valid integer (zero or positive)
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      setScoreError("Le score doit être un nombre entier positif ou zéro");
      return false;
    }
    setScoreError("");
    return true;
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScoreInput(value);
    
    // Clear error when user starts typing
    if (scoreError) {
      setScoreError("");
    }
    
    // Only update score if it's a valid number
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0 && Number.isInteger(num)) {
      setScore(num);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateScore(scoreInput)) {
      return;
    }
    
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
          type="text"
          value={scoreInput}
          onChange={handleScoreChange}
          placeholder="Entrez le score..."
          autoFocus
        />
        {scoreError && (
          <div className="text-sm text-red-600 mt-1">
            {scoreError}
          </div>
        )}
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