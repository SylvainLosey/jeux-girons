"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Clock, Users, CheckCircle, Clock3, Pencil } from "lucide-react";
import { formatTime } from "~/app/_utils/date-utils";
import { ScheduleCard } from "./schedule-card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
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

interface GameTimeSlot {
  startTime: Date;
  endTime: Date;
  game: Game;
  round: number;
  groups: Group[];
  slotIndex: number;
}

interface UnifiedScheduleViewProps {
  schedule: any; // TODO: Add proper typing for schedule
  entity: Game | Group;
  viewType: "team" | "game";
  showAdmin?: boolean;
}

function GameTimeSlotCard({ slot, showAdmin = false }: { slot: GameTimeSlot; showAdmin?: boolean }) {
  const timeRange = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{timeRange}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {slot.round > 1 ? `Tour ${slot.round}` : 'Tour 1'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Groups participating */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Jeunesses participantes
            </div>
            <div className="grid gap-2">
              {slot.groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <Link 
                    href={`/teams/${createSlug(group.name)}`}
                    className="group flex items-center gap-2 hover:text-gray-700 transition-colors"
                  >
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-medium group-hover:underline">
                      {group.name}
                    </span>
                  </Link>
                  
                  {/* Score for this group */}
                  <ScoreDisplayForGroup 
                    groupId={group.id}
                    gameId={slot.game.id}
                    round={slot.round}
                    groupName={group.name}
                    gameName={slot.game.name}
                    showAdmin={showAdmin}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreDisplayForGroup({ groupId, gameId, round, groupName, gameName, showAdmin = false }: {
  groupId: number;
  gameId: number;
  round: number;
  groupName: string;
  gameName: string;
  showAdmin?: boolean;
}) {
  const { data: score } = api.score.getScore.useQuery({ groupId, gameId, round });
  const [isEditing, setIsEditing] = useState(false);
  const utils = api.useUtils();
  
  const handleScoreUpdated = () => {
    utils.score.invalidate();
  };
  
  if (!score) {
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

export function UnifiedScheduleView({ schedule, entity, viewType, showAdmin = false }: UnifiedScheduleViewProps) {
  if (viewType === "team") {
    // For team view, use the existing ScheduleCard approach
    const entries: ScheduleEntry[] = schedule
      .flatMap((slot: any) => {
        return slot.entries
          .filter((entry: any) => entry.group?.id === entity.id)
          .map((entry: any) => {
            const scheduleEntry: ScheduleEntry = {
              slotIndex: slot.slotIndex,
              startTime: slot.startTime,
              endTime: slot.endTime,
              game: entry.game,
              group: entry.group,
              round: entry.round,
            };

            // Find opponents
            const opponents = schedule
              .flatMap((s: any) => 
                s.entries?.filter((e: any) => 
                  e.game?.id === entry.game?.id && 
                  s.startTime.getTime() === slot.startTime.getTime() &&
                  e.group?.id !== entity.id
                ) ?? []
              )
              .map((e: any) => e.group);
            
            scheduleEntry.opponents = opponents;
            return scheduleEntry;
          });
      })
      .sort((a: ScheduleEntry, b: ScheduleEntry) => a.startTime.getTime() - b.startTime.getTime());

    if (entries.length === 0) {
      return (
        <Alert>
          <AlertDescription>Aucun jeu programmé pour cette jeunesse.</AlertDescription>
        </Alert>
      );
    }

    // Group entries by day
    const entriesByDay = entries.reduce((acc: Record<string, ScheduleEntry[]>, entry) => {
      const day = new Date(entry.startTime).toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      
      acc[day] ??= [];
      acc[day].push(entry);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {Object.entries(entriesByDay).map(([day, dayEntries]) => (
          <div key={day} className="space-y-4">
            <h3 className="text-xl font-semibold capitalize border-b pb-2">
              {day}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {dayEntries.map((entry, _index) => (
                <ScheduleCard
                  key={`${entry.slotIndex}-${entry.group.id}-${entry.game.id}-${entry.round}`}
                  entry={entry}
                  viewType="team"
                  showAdmin={showAdmin}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    // For game view, group by time slots and show all participating groups
    const gameSlots: GameTimeSlot[] = schedule
      .flatMap((slot: any) => {
        const gameEntries = slot.entries?.filter((entry: any) => entry.game?.id === entity.id) ?? [];
        if (gameEntries.length === 0) return [];

        // Group by round within the same time slot
        const slotsByRound = gameEntries.reduce((acc: Record<number, any[]>, entry: any) => {
          acc[entry.round] ??= [];
          acc[entry.round].push(entry);
          return acc;
        }, {});

        return Object.entries(slotsByRound).map(([round, entries]) => ({
          slotIndex: slot.slotIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
          game: entity as Game,
          round: parseInt(round),
          groups: entries.map((entry: any) => entry.group),
        }));
      })
      .sort((a: GameTimeSlot, b: GameTimeSlot) => a.startTime.getTime() - b.startTime.getTime());

    if (gameSlots.length === 0) {
      return (
        <Alert>
          <AlertDescription>Aucune jeunesse n&apos;est programmée pour ce jeu.</AlertDescription>
        </Alert>
      );
    }

    // Group slots by day
    const slotsByDay = gameSlots.reduce((acc: Record<string, GameTimeSlot[]>, slot) => {
      const day = new Date(slot.startTime).toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      
      acc[day] ??= [];
      acc[day].push(slot);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {Object.entries(slotsByDay).map(([day, daySlots]) => (
          <div key={day} className="space-y-4">
            <h3 className="text-xl font-semibold capitalize border-b pb-2">
              {day}
            </h3>
            <div className="grid gap-4">
              {daySlots.map((slot, _index) => (
                <GameTimeSlotCard
                  key={`${slot.slotIndex}-${slot.round}`}
                  slot={slot}
                  showAdmin={showAdmin}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
} 