import React, { useState } from 'react';
import { Game, Group, Schedule } from "../_types/schedule-types";
import { formatTime, formatDate } from "../_utils/date-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Calendar, Clock, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface ScheduleResultsProps {
  schedule: Schedule;
  groups: Group[];
}

export function ScheduleResults({ schedule }: ScheduleResultsProps) {
  const [showAllTables, setShowAllTables] = useState(true);
  
  // Mutation for deleting all scores
  const deleteAllScoresMutation = api.score.deleteAllScores.useMutation({
    onSuccess: () => {
      toast.success("Tous les scores ont été remis à zéro !");
    },
    onError: (error) => {
      toast.error(`Erreur lors de la remise à zéro des scores : ${error.message}`);
    }
  });

  const handleResetAllScores = () => {
    const confirmReset = confirm(
      "Êtes-vous sûr de vouloir remettre à zéro TOUS les scores ? Cette action est irréversible."
    );
    
    if (confirmReset) {
      deleteAllScoresMutation.mutate();
    }
  };
  
  return (
    <>
      {/* Global buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleResetAllScores}
          disabled={deleteAllScoresMutation.isPending}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          {deleteAllScoresMutation.isPending ? "Remise à zéro..." : "Remettre à zéro tous les scores"}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowAllTables(!showAllTables)}
          className="flex items-center gap-1"
        >
          {showAllTables ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Masquer les détails
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Afficher les détails
            </>
          )}
        </Button>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.map((slot) => {
          // Group entries by game for this timeslot, storing the round number and second chance info
          const gamesInSlot = new Map<number, { 
            game: Game; 
            groups: { group: Group; isSecondChance: boolean }[]; 
            round: number | undefined; 
            hasSecondChance: boolean;
          }>();
          slot.entries.forEach(entry => {
            if (!gamesInSlot.has(entry.game.id)) {
              // Store the round from the *first* entry encountered for this game in this slot
              gamesInSlot.set(entry.game.id, { 
                game: entry.game, 
                groups: [], 
                round: entry.round, 
                hasSecondChance: false 
              });
            }
            const gameData = gamesInSlot.get(entry.game.id);
            if (gameData) {
              gameData.groups.push({ group: entry.group, isSecondChance: entry.isSecondChance ?? false });
              if (entry.isSecondChance) {
                gameData.hasSecondChance = true;
              }
              // Note: This assumes all entries for the same game in a slot have the same round number.
              // The generator logic should ensure this.
            }
          });

          // Sort groups alphabetically within each game for consistent display
          gamesInSlot.forEach(gameData => {
            gameData.groups.sort((a, b) => a.group.name.localeCompare(b.group.name));
          });

          // Convert map to array and sort games alphabetically for consistent display
          const sortedGamesData = Array.from(gamesInSlot.values()).sort((a, b) =>
            a.game.name.localeCompare(b.game.name)
          );

          return (
            <div key={slot.slotIndex} className="p-4 border rounded-lg shadow-md bg-card">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-left oriental-subtitle">
                  Créneau {slot.slotIndex}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(slot.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-oriental-gold-light" />
                    <span className="text-base font-semibold text-oriental-accent">{formatTime(slot.startTime)}</span>
                  </div>
                </div>
              </div>
              
              {sortedGamesData.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Aucune affectation pour ce créneau.
                </p>
              ) : (
                <>
                  {/* Counter showing number of games/groups */}
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    {sortedGamesData.length} jeu{sortedGamesData.length > 1 ? 'x' : ''}, 
                    {' '}
                    {sortedGamesData.reduce((sum, curr) => sum + curr.groups.length, 0)} groupe{sortedGamesData.reduce((sum, curr) => sum + curr.groups.length, 0) > 1 ? 's' : ''}
                  </div>
                  
                  {/* Show table only if showAllTables is true */}
                  {showAllTables && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/3 text-slate-600">Jeu</TableHead>
                          <TableHead className="w-2/3 text-slate-600">Participants</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedGamesData.map(({ game, groups, round, hasSecondChance }) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium text-slate-700">
                              <div className="flex items-center gap-2">
                                {game.name}
                                {round && round > 1 ? ` (Tour ${round})` : ''}
                                {hasSecondChance && (
                                  <Badge variant="secondary" className="text-xs">
                                    DEUXIEME CHANCE
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              <div className="flex flex-wrap gap-1">
                                {groups.map(({ group, isSecondChance }) => (
                                  <span key={group.id} className={isSecondChance ? "font-medium" : ""}>
                                    {group.name}
                                    {isSecondChance && " ⭐"}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
} 