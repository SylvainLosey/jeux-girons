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
        <div className="flex items-center gap-1 text-muted-foreground">
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
        <CheckCircle className="h-3 w-3 text-gray-600" />
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
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
  const utils = api.useUtils();
  
  const handleScoreUpdated = () => {
    utils.score.invalidate();
  };

  const timeRange = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{timeRange}</span>
          </div>
          <Badge variant="outline" className="text-xs">
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
                  <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
                    <Gamepad2 className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold group-hover:underline">
                      {entry.game.name}
                    </span>
                  </div>
                </Link>
                {entry.game.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
                  <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold group-hover:underline">
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
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                      className="text-xs hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
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