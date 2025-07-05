"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Pencil } from "lucide-react";
import { DirectScoreEditor } from "~/app/_components/score-editor";

interface ScoreRequest {
  groupId: number;
  gameId: number;
  round: number;
}

type ScoreData = {
  id: number;
  groupId: number;
  gameId: number;
  round: number;
  score: number;
  createdAt: Date;
  updatedAt: Date | null;
};

interface ScoreContextType {
  addScoreRequest: (req: ScoreRequest) => void;
  getScore: (req: ScoreRequest) => ScoreData | null;
  invalidateScores: () => void;
}

const ScoreContext = createContext<ScoreContextType | null>(null);

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const [scoreRequests, setScoreRequests] = useState<ScoreRequest[]>([]);
  const [scores, setScores] = useState<Map<string, ScoreData | null>>(new Map());
  const utils = api.useUtils();

  // Create a stable key for score requests
  const createScoreKey = (req: ScoreRequest) => `${req.groupId}-${req.gameId}-${req.round}`;

  // Batch fetch scores when requests change
  const { data: fetchedScores } = api.score.getScores.useQuery(
    scoreRequests,
    {
      enabled: scoreRequests.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  // Update scores map when data is fetched
  useEffect(() => {
    if (fetchedScores) {
      const newScores = new Map(scores);
      fetchedScores.forEach((score, index) => {
        const request = scoreRequests[index];
        if (request) {
          newScores.set(createScoreKey(request), score);
        }
      });
      setScores(newScores);
    }
  }, [fetchedScores, scoreRequests]);

  const addScoreRequest = (req: ScoreRequest) => {
    const key = createScoreKey(req);
    if (!scores.has(key)) {
      setScoreRequests(prev => {
        const exists = prev.some(r => createScoreKey(r) === key);
        if (!exists) {
          return [...prev, req];
        }
        return prev;
      });
    }
  };

  const getScore = (req: ScoreRequest) => {
    const key = createScoreKey(req);
    return scores.get(key) ?? null;
  };

  const invalidateScores = () => {
    utils.score.invalidate();
    setScores(new Map());
    setScoreRequests([]);
  };

  return (
    <ScoreContext.Provider value={{ addScoreRequest, getScore, invalidateScores }}>
      {children}
    </ScoreContext.Provider>
  );
}

function useScoreContext() {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error("useScoreContext must be used within a ScoreProvider");
  }
  return context;
}

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
  const { addScoreRequest, getScore, invalidateScores } = useScoreContext();
  const [isEditing, setIsEditing] = useState(false);
  
  const scoreRequest = { groupId, gameId, round };
  
  // Add this score request to the batch
  useEffect(() => {
    addScoreRequest(scoreRequest);
  }, [groupId, gameId, round, addScoreRequest]);

  const score = getScore(scoreRequest);
  
  const handleScoreUpdated = () => {
    invalidateScores();
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