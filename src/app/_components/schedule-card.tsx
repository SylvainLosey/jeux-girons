"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Clock, Users, Gamepad2, CheckCircle, Clock3, Pencil } from "lucide-react";
import { formatTime } from "~/app/_utils/date-utils";
import { DirectScoreEditor } from "./score-editor";

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

interface ScheduleEntry {
  startTime: Date;
  endTime: Date;
  game: Game;
  group: Group;
  round: number;
  opponents?: Group[];
  slotIndex: number;
}

interface ScheduleCardProps {
  entry: ScheduleEntry;
  viewType: "team" | "game";
  showAdmin?: boolean;
}

function ScoreDisplay({ groupId, gameId, round, groupName, gameName, showAdmin = false, onScoreUpdated }: {
  groupId: number;
  gameId: number;
  round: number;
  groupName: string;
  gameName: string;
  showAdmin?: boolean;
  onScoreUpdated?: () => void;
}) {
  const { data: score } = api.score.getScore.useQuery({ groupId, gameId, round });
  const [isEditing, setIsEditing] = useState(false);
  
  if (!score) {
    // Unplayed state
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-slate-500">
          <Clock3 className="h-3 w-3" />
          <span className="text-xs font-medium">Non joué</span>
        </div>
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
                  onScoreUpdated?.();
                  setIsEditing(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-slate-600" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {score.score} pts
        </span>
      </div>
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
                onScoreUpdated?.();
                setIsEditing(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function ScheduleCard({ entry, viewType, showAdmin = false }: ScheduleCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scoreUpdated, setScoreUpdated] = useState(false);
  
  const timeRange = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
  
  const handleScoreUpdated = () => {
    setScoreUpdated(true);
    setTimeout(() => setScoreUpdated(false), 2000);
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-600" />
            <span className="font-mono text-sm font-medium text-slate-700">{timeRange}</span>
          </div>
          <Badge variant="outline" className="text-xs text-slate-600">
            {entry.round > 1 ? `Tour ${entry.round}` : 'Tour 1'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Game/Team Info */}
          <div className="space-y-1">
            {viewType === "team" ? (
              // Team view - show game info
              <div>
                <Link 
                  href={`/games/${createSlug(entry.game.name)}`}
                  className="group"
                >
                  <div className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                    <Gamepad2 className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold group-hover:underline text-slate-700">
                      {entry.game.name}
                    </span>
                  </div>
                </Link>
                {entry.game.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {entry.game.description}
                  </p>
                )}
              </div>
            ) : (
              // Game view - show team info
              <div>
                <Link 
                  href={`/teams/${createSlug(entry.group.name)}`}
                  className="group"
                >
                  <div className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                    <Users className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold group-hover:underline text-slate-700">
                      {entry.group.name}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Opponents (for team view) */}
          {viewType === "team" && entry.opponents && entry.opponents.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Contre
              </div>
              <div className="flex flex-wrap gap-1">
                {entry.opponents.map((opponent) => (
                  <Link 
                    key={opponent.id}
                    href={`/teams/${createSlug(opponent.name)}`}
                  >
                    <Badge 
                      variant="secondary" 
                      className="text-xs hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer text-slate-700"
                    >
                      {opponent.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Score Display */}
          <div className="pt-2 border-t">
            <ScoreDisplay
              groupId={entry.group.id}
              gameId={entry.game.id}
              round={entry.round}
              groupName={entry.group.name}
              gameName={entry.game.name}
              showAdmin={showAdmin}
              onScoreUpdated={handleScoreUpdated}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 