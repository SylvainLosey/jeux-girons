"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Trophy, Pencil } from "lucide-react";
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

// Original ScoreEditor component with dialog wrapper for backwards compatibility
export function ScoreEditor({ 
  groupId, 
  groupName, 
  gameId, 
  gameName, 
  round, 
  onScoreUpdated 
}: ScoreEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
      onScoreUpdated?.();
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour du score: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScoreMutation.mutate({
      groupId,
      gameId,
      round,
      score,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset score to current value when opening
      setScore(currentScore?.score ?? 0);
    }
  };

  const displayScore = currentScore?.score ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-xs"
          disabled={isLoading}
        >
          <Trophy className="h-3 w-3 mr-1" />
          {displayScore} pts
          <Pencil className="h-3 w-3 ml-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le score</DialogTitle>
        </DialogHeader>
        <DirectScoreEditor
          groupId={groupId}
          groupName={groupName}
          gameId={gameId}
          gameName={gameName}
          round={round}
          onScoreUpdated={() => {
            onScoreUpdated?.();
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
} 