"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Clock, Users, Gamepad2, CheckCircle, Clock3, Pencil, Loader2 } from "lucide-react";
import { formatTime } from "~/app/_utils/date-utils";
import { createSlug } from "~/app/_utils/slug-utils";
import { DirectScoreEditor } from "./score-editor";
import { ScoreDisplay as ReusableScoreDisplay } from "~/components/ui/score-display";
import { InteractiveLink } from "~/components/ui/interactive-link";
import { cn } from "~/lib/utils";
import Image from "next/image";

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

interface ScheduleCardProps {
  entry: ScheduleEntry;
  viewType: "team" | "game";
  showAdmin?: boolean;
}



export function ScheduleCard({ entry, viewType, showAdmin = false }: ScheduleCardProps) {
  const [scoreUpdated, setScoreUpdated] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const handleScoreUpdated = () => {
    setScoreUpdated(true);
    setTimeout(() => setScoreUpdated(false), 2000);
  };

  const handleLinkClick = () => {
    setIsNavigating(true);
  };



  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] overflow-hidden !p-0 h-32",
      isNavigating && "opacity-80 scale-[0.98]"
    )}>
      <div className="flex h-full">
        {/* Game Image */}
        <div className="flex-shrink-0 w-32 h-32">
          {entry.game.imageUrl ? (
            <Image
              src={entry.game.imageUrl}
              alt={entry.game.name}
              width={86}
              height={86}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Gamepad2 className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Game Details */}
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div className="space-y-1">
            {/* First line: Clock + Time (left) and Score badge (right)  */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-oriental-gold-light flex-shrink-0" />
                <span className="text-base font-semibold text-oriental-accent whitespace-nowrap">
                  {formatTime(entry.startTime)}
                </span>
              </div>
              
              {/* Score right-aligned */}
              <div className="flex-shrink-0">
                <ReusableScoreDisplay
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
            
            {/* Second line: Game name + Tour badge + Second chance badge */}
            <div className="flex items-center gap-2">
              <InteractiveLink 
                href={`/games/${createSlug(entry.game.name)}`}
                className="hover:text-oriental-accent transition-colors flex items-center gap-2"
                onClick={handleLinkClick}
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {entry.game.name}
                </h3>
                {isNavigating && (
                  <Loader2 className="h-4 w-4 animate-spin text-oriental-accent" />
                )}
              </InteractiveLink>
              {entry.round > 1 && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Tour {entry.round}
                </Badge>
              )}
              {entry.isSecondChance && (
                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-yellow-100 text-yellow-800">
                  PARTIE BONUS
                </Badge>
              )}
            </div>
            
            {/* Third line: Description only */}
            <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {entry.game.description && (
                <span>{entry.game.description}</span>
              )}
            </div>
          </div>
          
          {/* Team info for game view (bottom) */}
          {viewType === "game" && (
            <div className="mt-auto">
              <InteractiveLink 
                href={`/teams/${createSlug(entry.group.name)}`}
                className="group"
                onClick={handleLinkClick}
              >
                <div className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                  <Users className="h-3 w-3 text-slate-600" />
                  <span className="text-xs font-medium group-hover:underline text-slate-700">
                    {entry.group.name}
                  </span>
                  {isNavigating && (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-600" />
                  )}
                </div>
              </InteractiveLink>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 