"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Clock, Users, CheckCircle, Clock3, Pencil, Loader2 } from "lucide-react";
import { formatTime } from "~/app/_utils/date-utils";
import { createSlug } from "~/app/_utils/slug-utils";
import { ScheduleCard } from "./schedule-card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { DirectScoreEditor } from "./score-editor";
import { ScoreDisplay } from "~/components/ui/score-display";
import { InteractiveLink } from "~/components/ui/interactive-link";

interface ScheduleEntry {
  startTime: Date;
  endTime: Date;
  game: Game;
  group: Group;
  round: number;
  opponents?: Group[];
  slotIndex: number;
  isSecondChance?: boolean;
}

interface GameTimeSlot {
  startTime: Date;
  endTime: Date;
  game: Game;
  round: number;
  groups: Group[];
  slotIndex: number;
  hasSecondChance?: boolean;
  secondChanceGroups?: Group[];
}

interface UnifiedScheduleViewProps {
  schedule: any; // TODO: Add proper typing for schedule
  entity: Game | Group;
  viewType: "team" | "game";
  showAdmin?: boolean;
}

function GameTimeSlotCard({ slot, showAdmin = false }: { slot: GameTimeSlot; showAdmin?: boolean }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const timeRange = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
  
  const handleLinkClick = () => {
    setIsNavigating(true);
  };
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-oriental-gold-light" />
            <span className="text-base font-semibold text-oriental-accent">{formatTime(slot.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            {slot.round > 1 && (
              <Badge variant="outline" className="text-xs text-slate-600">
                Tour {slot.round}
              </Badge>
            )}
            {slot.hasSecondChance && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                PARTIE BONUS
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Groups participating - one per line with score display */}
          <div className="space-y-1">
            {slot.groups.map((group) => {
              const isSecondChance = slot.secondChanceGroups?.some(g => g.id === group.id) ?? false;
              return (
                <div key={group.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-oriental-gold/10 transition-colors">
                  <InteractiveLink 
                    href={`/teams/${createSlug(group.name)}`}
                    className="text-sm font-medium text-slate-700 hover:text-oriental-accent transition-colors flex items-center gap-2"
                    onClick={handleLinkClick}
                  >
                    {group.name}
                    {isSecondChance && " ⭐"}
                    {isNavigating && (
                      <Loader2 className="h-3 w-3 animate-spin text-oriental-accent" />
                    )}
                  </InteractiveLink>
                  <div className="flex-shrink-0">
                    <ScoreDisplay
                      groupId={group.id}
                      gameId={slot.game.id}
                      round={slot.round}
                      groupName={group.name}
                      gameName={slot.game.name}
                      showAdmin={showAdmin}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
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
              isSecondChance: entry.isSecondChance,
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
            <div className="grid gap-4 md:grid-cols-2">
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
          const roundNumber = entry.round;
          if (!acc[roundNumber]) {
            acc[roundNumber] = [];
          }
          acc[roundNumber]!.push(entry);
          return acc;
        }, {});

        return Object.entries(slotsByRound).map(([round, entries]) => {
          const allGroups = (entries as any[]).map((entry: any) => entry.group);
          const secondChanceGroups = (entries as any[])
            .filter((entry: any) => entry.isSecondChance)
            .map((entry: any) => entry.group);
          const hasSecondChance = secondChanceGroups.length > 0;
          
          return {
            slotIndex: slot.slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            game: entity as Game,
            round: parseInt(round),
            groups: allGroups,
            hasSecondChance,
            secondChanceGroups,
          };
        });
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
            <div className="grid gap-4 md:grid-cols-2">
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