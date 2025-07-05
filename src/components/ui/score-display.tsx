"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Pencil } from "lucide-react";
import { DirectScoreEditor } from "~/app/_components/score-editor";

interface ScoreDisplayProps {
  groupId: number;
  gameId: number;
  round: number;
  groupName: string;
  gameName: string;
  showAdmin?: boolean;
  onScoreUpdated?: () => void;
}

export function ScoreDisplay({ 
  groupId, 
  gameId, 
  round, 
  groupName, 
  gameName, 
  showAdmin = false, 
  onScoreUpdated 
}: ScoreDisplayProps) {
  const { data: score } = api.score.getScore.useQuery({ groupId, gameId, round });
  const [isEditing, setIsEditing] = useState(false);
  const utils = api.useUtils();
  
  const handleScoreUpdated = () => {
    utils.score.invalidate();
    onScoreUpdated?.();
  };
  
  if (!score) {
    // Unplayed state - show nothing unless admin
    return showAdmin ? (
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
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
                handleScoreUpdated();
                setIsEditing(false);
              }}
            />
        </DialogContent>
      </Dialog>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="default" className="bg-oriental-gold hover:bg-oriental-gold-dark text-white font-semibold">
        {score.score} pts
      </Badge>
      {showAdmin && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </DialogTrigger>
          <DialogContent>
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
                handleScoreUpdated();
                setIsEditing(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 