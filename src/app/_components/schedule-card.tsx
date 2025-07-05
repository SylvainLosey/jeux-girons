"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Clock, Users, Gamepad2, CheckCircle, Clock3, Pencil, Swords } from "lucide-react";
import { formatTime } from "~/app/_utils/date-utils";
import { DirectScoreEditor } from "./score-editor";
import { ScoreDisplay as ReusableScoreDisplay } from "~/components/ui/score-display";

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
  isSecondChance?: boolean;
}

interface ScheduleCardProps {
  entry: ScheduleEntry;
  viewType: "team" | "game";
  showAdmin?: boolean;
}



export function ScheduleCard({ entry, viewType, showAdmin = false }: ScheduleCardProps) {
  const [scoreUpdated, setScoreUpdated] = useState(false);
  
  const handleScoreUpdated = () => {
    setScoreUpdated(true);
    setTimeout(() => setScoreUpdated(false), 2000);
  };

  const hasOpponents = viewType === "team" && entry.opponents && entry.opponents.length > 0;

  return (
    <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] overflow-hidden !p-0 h-32">
      <div className="flex h-full">
        {/* Game Image */}
        <div className="flex-shrink-0 w-32 h-32">
          {entry.game.imageUrl ? (
            <img
              src={entry.game.imageUrl}
              alt={entry.game.name}
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
          <div className="space-y-2">
            {/* First line: Clock + Time (left) and Score badge (right) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
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
              <Link 
                href={`/games/${createSlug(entry.game.name)}`}
                className="hover:text-oriental-gold transition-colors"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {entry.game.name}
                </h3>
              </Link>
              {entry.round > 1 && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Tour {entry.round}
                </Badge>
              )}
              {entry.isSecondChance && (
                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-yellow-100 text-yellow-800">
                  DEUXIEME CHANCE
                </Badge>
              )}
            </div>
            
            {/* Third line: Opponents + Description or just Description */}
            <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {hasOpponents && (
                <div className="inline-flex items-center gap-1 mr-2">
                  {entry.opponents!.map((opponent, index) => (
                    <Link 
                      key={opponent.id}
                      href={`/teams/${createSlug(opponent.name)}`}
                    >
                      <Badge 
                        variant="secondary" 
                        className="bg-oriental-gold-light hover:bg-oriental-gold text-slate-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Swords className="h-2 w-2 flex-shrink-0" />
                        <span className="truncate">{opponent.name}</span>
                      </Badge>
                    </Link>
                  ))}
                  {entry.game.description && <span className="text-slate-400 mx-1">|</span>}
                </div>
              )}
              {entry.game.description && (
                <span>{entry.game.description}</span>
              )}
            </div>
          </div>
          
          {/* Team info for game view (bottom) */}
          {viewType === "game" && (
            <div className="mt-auto">
              <Link 
                href={`/teams/${createSlug(entry.group.name)}`}
                className="group"
              >
                <div className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                  <Users className="h-3 w-3 text-slate-600" />
                  <span className="text-xs font-medium group-hover:underline text-slate-700">
                    {entry.group.name}
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 