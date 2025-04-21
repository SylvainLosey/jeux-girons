"use client";

import { useState } from "react";
import { format, addHours } from 'date-fns';
import { fr } from 'date-fns/locale'; // For French formatting
import { Plus, Trash2, Clock } from "lucide-react";

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
// Assuming Alert components are available from your UI library (like shadcn/ui)
// If not, replace with simple <p> tags for errors.
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

// Define types based on your tRPC router outputs
type Group = RouterOutputs["group"]["getAll"][number];
type Game = RouterOutputs["game"]["getAll"][number];

// Define the structure for a single entry in the schedule
interface ScheduleEntry {
  group: Group;
  game: Game;
}

// Define the structure for a timeslot
interface TimeSlot {
  slotIndex: number;
  startTime: Date;
  endTime: Date;
  entries: ScheduleEntry[]; // Pairings for this timeslot
}

// Define the overall schedule structure
type Schedule = TimeSlot[];

// Define the structure for a time range with full datetime support
interface TimeRange {
  id: string;
  startTime: Date;
  endTime: Date;
}

// Helper function to shuffle an array (simplified Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i] as T;
        shuffled[i] = shuffled[j] as T;
        shuffled[j] = temp;
    }
    return shuffled;
}

// Helper function to format a datetime
const formatDateTime = (date: Date) => {
  return format(date, 'EEEE d MMMM yyyy HH:mm', { locale: fr });
};

// Helper function to format just the time
const formatTime = (date: Date) => format(date, 'HH:mm', { locale: fr });

/**
 * Generates a schedule based on groups, games, and time constraints.
 */
function generateSchedule(
    groups: Group[],
    games: Game[],
    startDate: Date,
    formatTimeFn: (date: Date) => string,
    gameDurationMs: number = 12 * 60 * 1000,
    transitionTimeMs: number = 8 * 60 * 1000,
    timeRanges: TimeRange[] = []
): Schedule | { error: string } {
    const N = groups.length;
    const M = games.length;

    // Basic validation
    if (N === 0 || M === 0) {
        return { error: "Il faut au moins un groupe et un jeu pour générer un horaire." };
    }
    const maxRequiredGroups = Math.max(...games.map(g => g.numberOfGroups), 0);
    if (maxRequiredGroups > N) {
        const problematicGames = games.filter(g => g.numberOfGroups > N).map(g => g.name);
        return { error: `Impossible de générer l'horaire. Les jeux suivants nécessitent plus de groupes (${maxRequiredGroups}) que le total disponible (${N}): ${problematicGames.join(', ')}` };
    }
    
    // Validate time ranges, use default if none provided
    if (timeRanges.length === 0) {
        // Use a default range from 9 AM to 5 PM
        const defaultStart = new Date(startDate);
        defaultStart.setHours(9, 0, 0, 0);
        
        const defaultEnd = new Date(startDate);
        defaultEnd.setHours(17, 0, 0, 0);
        
        timeRanges = [{
            id: 'default',
            startTime: defaultStart,
            endTime: defaultEnd
        }];
    }

    const schedule: Schedule = [];
    const timeslotIntervalMs = gameDurationMs + transitionTimeMs;

    // State: Which games each group still needs to play
    const needsToPlay = new Map<number, Set<number>>();
    const allGameIds = new Set(games.map(g => g.id));
    groups.forEach(group => {
        needsToPlay.set(group.id, new Set(allGameIds));
    });

    // Lookup maps
    const groupMap = new Map(groups.map(g => [g.id, g]));
    const gameMap = new Map(games.map(g => [g.id, g]));

    // Start with the first time range's start time
    let currentStartTimeMs = timeRanges[0].startTime.getTime();
    let currentRangeIndex = 0;
    let slotIndex = 0;
    const MAX_SLOTS = (N * M) + N; // Safety break

    // Loop until all groups have played all games OR max slots reached
    while (Array.from(needsToPlay.values()).some(gamesSet => gamesSet.size > 0)) {
        slotIndex++;
        if (slotIndex > MAX_SLOTS) {
            const remainingNeedsSummary = Array.from(needsToPlay.entries())
                .filter(([_, gameSet]) => gameSet.size > 0)
                .map(([groupId, gameSet]) => {
                    const groupName = groupMap.get(groupId)?.name ?? `ID ${groupId}`;
                    const remainingGameNames = Array.from(gameSet).map(gameId => gameMap.get(gameId)?.name ?? `GameID ${gameId}`).join(', ');
                    return `${groupName}: ${gameSet.size} jeux restants (${remainingGameNames})`;
                })
                .join('; ');
            return { error: `La génération de l'horaire a dépassé ${MAX_SLOTS} créneaux sans que tous les groupes aient joué à tous les jeux. Vérifiez la configuration ou augmentez MAX_SLOTS. Besoins restants: ${remainingNeedsSummary}` };
        }

        // Check if current time is outside the current range
        let currentTimeInRange = false;
        let currentRange = timeRanges[currentRangeIndex];
        
        // Try to find a valid time range
        while (!currentTimeInRange && currentRangeIndex < timeRanges.length) {
            currentRange = timeRanges[currentRangeIndex];
            
            // If current time is before the range starts, move to range start
            if (currentStartTimeMs < currentRange.startTime.getTime()) {
                currentStartTimeMs = currentRange.startTime.getTime();
            }
            
            // Check if we're still within the current range
            if (currentStartTimeMs <= currentRange.endTime.getTime() - gameDurationMs) {
                currentTimeInRange = true;
            } else {
                // Try the next range
                currentRangeIndex++;
                if (currentRangeIndex < timeRanges.length) {
                    currentStartTimeMs = timeRanges[currentRangeIndex].startTime.getTime();
                }
            }
        }
        
        // If we couldn't find a valid time range, we're done
        if (!currentTimeInRange) {
            const remainingGamesCount = Array.from(needsToPlay.values())
                .reduce((total, gameSet) => total + gameSet.size, 0);
                
            if (remainingGamesCount > 0) {
                return { 
                    error: `Impossible de compléter l'horaire dans les plages horaires définies. Il reste ${remainingGamesCount} jeux à programmer.` 
                };
            }
            
            break; // No more games to schedule
        }

        const startTime = new Date(currentStartTimeMs);
        const endTime = new Date(currentStartTimeMs + gameDurationMs);
        const timeslotEntries: ScheduleEntry[] = [];
        const groupScheduledInSlot = new Set<number>();
        const gameScheduledInSlot = new Set<number>();

        const shuffledGroups = shuffleArray(groups);

        // Iterate through groups (shuffled to avoid bias)
        for (const currentGroup of shuffledGroups) {
            const currentGroupId = currentGroup.id;

            // Skip if group already scheduled in this slot or has no needs left
            if (groupScheduledInSlot.has(currentGroupId) || (needsToPlay.get(currentGroupId)?.size ?? 0) === 0) {
                continue;
            }

            // Try to find a game for this group
            let groupHasBeenScheduled = false;
            const neededGameIds = Array.from(needsToPlay.get(currentGroupId) ?? []); // Games this group needs

            for (const gameId of neededGameIds) {
                const game = gameMap.get(gameId);
                if (!game) continue; // Should not happen

                // Skip if game already running this slot
                if (gameScheduledInSlot.has(game.id)) {
                    continue;
                }

                const requiredParticipants = game.numberOfGroups;
                const partnersNeeded = requiredParticipants - 1;

                // Find potential partners for this game
                const potentialPartnerIds: number[] = [];
                for (const otherGroup of groups) {
                    const otherGroupId = otherGroup.id;
                    if (otherGroupId === currentGroupId) continue; // Not self
                    if (groupScheduledInSlot.has(otherGroupId)) continue; // Already busy this slot
                    if (needsToPlay.get(otherGroupId)?.has(game.id)) { // Needs this game
                        potentialPartnerIds.push(otherGroupId);
                    }
                }

                // Check if enough partners are available
                if (potentialPartnerIds.length >= partnersNeeded) {
                    // Select partners (prioritize those with fewer needs overall)
                    potentialPartnerIds.sort((aId, bId) => {
                        const needsA = needsToPlay.get(aId)?.size ?? Infinity;
                        const needsB = needsToPlay.get(bId)?.size ?? Infinity;
                        return needsA - needsB;
                    });
                    const selectedPartnerIds = potentialPartnerIds.slice(0, partnersNeeded);

                    // Schedule the game!
                    const participatingGroupIds = [currentGroupId, ...selectedPartnerIds];

                    participatingGroupIds.forEach(groupId => {
                        const group = groupMap.get(groupId);
                        if (group) {
                            timeslotEntries.push({ group, game });
                            groupScheduledInSlot.add(groupId); // Mark group as busy this slot
                        }
                    });
                    gameScheduledInSlot.add(game.id); // Mark game as running this slot
                    groupHasBeenScheduled = true;
                    break; // Move to the next group, as this one is now scheduled
                }
            } // End loop through needed games for currentGroup
        } // End loop through shuffledGroups

        // Add the completed timeslot to the schedule if any games were played
        if (timeslotEntries.length > 0) {
            // Sort entries for consistent display
            timeslotEntries.sort((a, b) => {
                const gameCompare = a.game.name.localeCompare(b.game.name);
                if (gameCompare !== 0) return gameCompare;
                return a.group.name.localeCompare(b.group.name);
            });

            schedule.push({ slotIndex, startTime, endTime, entries: timeslotEntries });

            // Update the master needsToPlay list
            timeslotEntries.forEach(entry => {
                needsToPlay.get(entry.group.id)?.delete(entry.game.id);
            });
        }

        // Handle potential deadlock with two groups each needing one last game
        const remainingNeedsEntries = Array.from(needsToPlay.entries())
            .filter(([_, gameSet]) => gameSet.size > 0);

        if (
            remainingNeedsEntries.length === 2 && // Exactly two groups left
            remainingNeedsEntries.every(([_, gameSet]) => gameSet.size === 1) // Each needs exactly one game
        ) {
            // Get the two entries
            const [entryA, entryB] = remainingNeedsEntries;
            
            const [groupAId, gameAIdSet] = entryA;
            const [groupBId, gameBIdSet] = entryB;
            
            // Get the game IDs (we already confirmed there's exactly one per set)
            const gameAId = Array.from(gameAIdSet)[0];
            const gameBId = Array.from(gameBIdSet)[0];
            
            const gameA = gameMap.get(gameAId);
            const gameB = gameMap.get(gameBId);
            
            // Check if the games are different and both require 2 participants
            if (gameA && gameB && gameAId !== gameBId && gameA.numberOfGroups === 2 && gameB.numberOfGroups === 2) {
                // Find two distinct groups that have finished all games
                const finishedGroupIds = groups
                    .map(g => g.id)
                    .filter(id => (needsToPlay.get(id)?.size ?? 0) === 0 && id !== groupAId && id !== groupBId);
                
                if (finishedGroupIds.length >= 2) {
                    const fillerPartnerAId = finishedGroupIds[0];
                    const fillerPartnerBId = finishedGroupIds[1];
                    
                    const fillerPartnerA = groupMap.get(fillerPartnerAId);
                    const fillerPartnerB = groupMap.get(fillerPartnerBId);
                    const groupA = groupMap.get(groupAId);
                    const groupB = groupMap.get(groupBId);
                    
                    if (groupA && groupB && fillerPartnerA && fillerPartnerB) {
                        // Advance time for the filler slot
                        currentStartTimeMs += timeslotIntervalMs;
                        slotIndex++;
                        const fillerStartTime = new Date(currentStartTimeMs);
                        const fillerEndTime = new Date(currentStartTimeMs + gameDurationMs);

                        const fillerEntries: ScheduleEntry[] = [
                            { group: groupA, game: gameA },
                            { group: fillerPartnerA, game: gameA }, // Filler partner A plays game A again
                            { group: groupB, game: gameB },
                            { group: fillerPartnerB, game: gameB }  // Filler partner B plays game B again
                        ];

                        fillerEntries.sort((a, b) => { // Sort for consistency
                            const gameCompare = a.game.name.localeCompare(b.game.name);
                            if (gameCompare !== 0) return gameCompare;
                            return a.group.name.localeCompare(b.group.name);
                        });

                        schedule.push({ slotIndex, startTime: fillerStartTime, endTime: fillerEndTime, entries: fillerEntries });

                        // Update needs
                        needsToPlay.get(groupAId)?.delete(gameAId);
                        needsToPlay.get(groupBId)?.delete(gameBId);
                    }
                }
            }
        }

        // Advance time for the next timeslot
        currentStartTimeMs += timeslotIntervalMs;
    } // End of main while loop

    // Final checks
    const remainingNeeds = Array.from(needsToPlay.entries())
        .filter(([_, gameSet]) => gameSet.size > 0);

    if (remainingNeeds.length > 0) {
        return { error: `Algorithme terminé mais besoins subsistent (état inattendu).` };
    }
    
    if (schedule.length === 0 && N > 0 && M > 0) {
        return { error: "Aucun créneau généré malgré données valides." };
    }

    return schedule;
}


export function ScheduleDisplay() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Parameter state variables with defaults
  const [gameDuration, setGameDuration] = useState(12);
  const [transitionTime, setTransitionTime] = useState(8);
  
  // Default start date for initial time range
  const defaultStartDate = new Date(2025, 7, 9, 9, 0, 0);

  // Time ranges state (now with full datetime support)
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    {
      id: "default-range",
      startTime: defaultStartDate,
      endTime: addHours(defaultStartDate, 8), // 9:00 AM to 5:00 PM
    }
  ]);

  // Fetch games and groups data using tRPC hooks
  const { data: games, isLoading: isLoadingGames, error: errorGames } = api.game.getAll.useQuery();
  const { data: groups, isLoading: isLoadingGroups, error: errorGroups } = api.group.getAll.useQuery();

  // Calculate the total time slot interval
  const timeSlotInterval = gameDuration + transitionTime;

  // Time range management functions
  const addTimeRange = () => {
    // Create a new time range starting 1 hour after the last range ends
    const lastRange = timeRanges[timeRanges.length - 1];
    const newStartTime = new Date(lastRange.endTime.getTime() + 60 * 60 * 1000); // 1 hour after last end
    const newEndTime = new Date(newStartTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours duration
    
    const newRange: TimeRange = {
      id: crypto.randomUUID(),
      startTime: newStartTime,
      endTime: newEndTime,
    };
    
    setTimeRanges([...timeRanges, newRange]);
  };

  const removeTimeRange = (id: string) => {
    // Don't allow removing the last range
    if (timeRanges.length <= 1) return;
    setTimeRanges(timeRanges.filter(range => range.id !== id));
  };

  // Update time range with new date or time
  const updateTimeRange = (
    id: string, 
    field: 'startTime' | 'endTime', 
    type: 'date' | 'time',
    value: string
  ) => {
    setTimeRanges(prevRanges => 
      prevRanges.map(range => {
        if (range.id !== id) return range;
        
        const currentDate = new Date(range[field]);
        
        if (type === 'date') {
          // Update the date component
          const newDate = new Date(value);
          if (isNaN(newDate.getTime())) return range;
          
          const updatedDate = new Date(currentDate);
          updatedDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
          
          return {
            ...range,
            [field]: updatedDate
          };
        } else {
          // Update the time component
          const [hours, minutes] = value.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) return range;
          
          const updatedDate = new Date(currentDate);
          updatedDate.setHours(hours, minutes);
          
          return {
            ...range,
            [field]: updatedDate
          };
        }
      })
    );
  };

  // Handle duration change
  const handleGameDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setGameDuration(value);
    }
  };

  // Handle transition time change
  const handleTransitionTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setTransitionTime(value);
    }
  };

  const handleGenerateSchedule = () => {
    // Ensure data is loaded
    if (!games || !groups) {
      setScheduleError("Les données des jeux ou des groupes ne sont pas encore chargées.");
      return;
    }

    // Validate time ranges
    const invalidRanges = timeRanges.filter(
      range => range.endTime <= range.startTime
    );
    
    if (invalidRanges.length > 0) {
      setScheduleError("Certaines plages horaires ont une heure de fin antérieure ou égale à l'heure de début.");
      return;
    }

    setIsGenerating(true);
    setSchedule(null);
    setScheduleError(null);

    // Use setTimeout to allow the UI to update to "Generating..." state
    setTimeout(() => {
      try {
        // Use the current parameter values from state
        const gameDurationMs = gameDuration * 60 * 1000;
        const transitionTimeMs = transitionTime * 60 * 1000;
        
        // Sort time ranges chronologically
        const sortedRanges = [...timeRanges].sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        );
        
        // Generate the schedule using the form parameters
        const result = generateSchedule(
          groups, 
          games, 
          sortedRanges[0].startTime, // First range start as reference
          formatTime,
          gameDurationMs,
          transitionTimeMs,
          sortedRanges
        );

        // Check if the generation function returned an error message
        if ('error' in result) {
          setScheduleError(result.error);
          setSchedule(null);
        } else {
          // Success: store the generated schedule
          setSchedule(result);
          setScheduleError(null);
        }
      } catch (e) {
        // Catch any unexpected errors during generation
        console.error("Erreur inattendue lors de la génération de l'horaire:", e);
        setScheduleError(e instanceof Error ? e.message : "Une erreur inconnue est survenue.");
        setSchedule(null);
      } finally {
        // Ensure the generating state is reset
        setIsGenerating(false);
      }
    }, 50); // A small delay is sufficient
  };

  // Combine loading and error states
  const isLoading = isLoadingGames || isLoadingGroups;
  const fetchError = errorGames ?? errorGroups;

  return (
    <div className="container mx-auto p-4 w-full max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Générateur d&apos;Horaire</h1>

      {/* Basic parameters */}
      <div className="mb-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
        <p className="font-semibold text-lg mb-4">Paramètres Généraux :</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label htmlFor="game-duration" className="block text-sm font-medium">
              Durée d&apos;un jeu (minutes)
            </label>
            <Input
              id="game-duration"
              type="number"
              min="1"
              value={gameDuration}
              onChange={handleGameDurationChange}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="transition-time" className="block text-sm font-medium">
              Temps entre les jeux (minutes)
            </label>
            <Input
              id="transition-time"
              type="number"
              min="0"
              value={transitionTime}
              onChange={handleTransitionTimeChange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Time Ranges Section */}
      <div className="mb-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <p className="font-semibold text-lg">Plages Horaires :</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={addTimeRange}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Ajouter une plage
          </Button>
        </div>

        <div className="space-y-3">
          {timeRanges.map((range, index) => {
            // Format dates for inputs
            const startDateValue = format(range.startTime, 'yyyy-MM-dd');
            const startTimeValue = format(range.startTime, 'HH:mm');
            const endDateValue = format(range.endTime, 'yyyy-MM-dd');
            const endTimeValue = format(range.endTime, 'HH:mm');
            
            return (
              <Card key={range.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                    <Badge variant="outline" className="mr-2">
                      Plage {index + 1}
                    </Badge>
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatDateTime(range.startTime)} - {formatDateTime(range.endTime)}
                    </span>
                    
                    {timeRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8"
                        onClick={() => removeTimeRange(range.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium mb-2">Début</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label htmlFor={`range-start-date-${range.id}`} className="block text-sm">
                            Date
                          </label>
                          <Input
                            id={`range-start-date-${range.id}`}
                            type="date"
                            value={startDateValue}
                            onChange={(e) => updateTimeRange(range.id, 'startTime', 'date', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor={`range-start-time-${range.id}`} className="block text-sm">
                            Heure
                          </label>
                          <Input
                            id={`range-start-time-${range.id}`}
                            type="time"
                            value={startTimeValue}
                            onChange={(e) => updateTimeRange(range.id, 'startTime', 'time', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Fin</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label htmlFor={`range-end-date-${range.id}`} className="block text-sm">
                            Date
                          </label>
                          <Input
                            id={`range-end-date-${range.id}`}
                            type="date"
                            value={endDateValue}
                            onChange={(e) => updateTimeRange(range.id, 'endTime', 'date', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor={`range-end-time-${range.id}`} className="block text-sm">
                            Heure
                          </label>
                          <Input
                            id={`range-end-time-${range.id}`}
                            type="time"
                            value={endTimeValue}
                            onChange={(e) => updateTimeRange(range.id, 'endTime', 'time', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {range.endTime <= range.startTime && (
                    <p className="text-sm text-destructive mt-2">
                      L&apos;heure de fin doit être postérieure à l&apos;heure de début
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary Section */}
      <div className="mt-4 mb-6 p-3 bg-muted/50 rounded-md">
        <p className="text-sm">
          <span className="font-medium">Résumé :</span> Chaque jeu durera {gameDuration} minutes avec {transitionTime} minutes de transition.
          L&apos;intervalle total par créneau sera de {timeSlotInterval} minutes.
          {timeRanges.length > 0 && (
            <>
              <br />
              <span className="font-medium">Plages horaires :</span>
              <ul className="mt-1 list-disc list-inside">
                {timeRanges.map((range, i) => (
                  <li key={range.id}>
                    {formatDateTime(range.startTime)} - {formatDateTime(range.endTime)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateSchedule}
        disabled={isLoading || isGenerating || !!fetchError}
        className="mb-6"
        size="lg"
      >
        {isGenerating ? "Génération en cours..." : "Générer l'Horaire"}
      </Button>

      {/* Display states remain the same */}
      {isLoading && <p className="text-muted-foreground">Chargement des groupes et des jeux...</p>}

      {fetchError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur de Chargement des Données</AlertTitle>
          <AlertDescription>Impossible de charger les données nécessaires : {fetchError.message}</AlertDescription>
        </Alert>
      )}

      {isGenerating && <p className="text-center text-lg font-semibold text-blue-600">Génération de l&apos;horaire en cours...</p>}

      {scheduleError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Erreur de Génération de l&apos;Horaire</AlertTitle>
          <AlertDescription>{scheduleError}</AlertDescription>
        </Alert>
      )}

      {schedule && schedule.length > 0 && (
        <div className="mt-6 space-y-8"> {/* Add spacing between timeslot sections */}
          <h2 className="text-2xl font-bold mb-4 text-center">Horaire Généré</h2>
          {schedule.map((slot) => {
            // Group entries by game for this timeslot
            const gamesInSlot = new Map<number, { game: Game; groups: Group[] }>();
            slot.entries.forEach(entry => {
              if (!gamesInSlot.has(entry.game.id)) {
                gamesInSlot.set(entry.game.id, { game: entry.game, groups: [] });
              }
              const gameData = gamesInSlot.get(entry.game.id);
              if (gameData) {
                gameData.groups.push(entry.group);
              }
            });

            // Sort groups alphabetically within each game for consistent display
            gamesInSlot.forEach(gameData => {
              gameData.groups.sort((a, b) => a.name.localeCompare(b.name));
            });

            // Convert map to array and sort games alphabetically for consistent display
            const sortedGamesData = Array.from(gamesInSlot.values()).sort((a, b) =>
              a.game.name.localeCompare(b.game.name)
            );

            return (
              <div key={slot.slotIndex} className="p-4 border rounded-lg shadow-md bg-card">
                <h3 className="text-xl font-semibold mb-3 text-center">
                  Créneau {slot.slotIndex} ({formatTime(slot.startTime)} - {formatTime(slot.endTime)})
                </h3>
                <div className="rounded-md border"> {/* Optional: border around inner table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Jeu</TableHead> {/* Adjust width as needed */}
                        <TableHead>Participants</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedGamesData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                            Aucune affectation pour ce créneau. {/* Should not happen if slot exists */}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedGamesData.map(({ game, groups }) => (
                          <TableRow key={game.id}>
                            <TableCell className="font-medium">{game.name}</TableCell>
                            <TableCell>{groups.map(g => g.name).join(', ')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {schedule && schedule.length > 0 && groups && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-center">Planning par Jeunesse</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Use the full groups array instead of extracting from schedule */}
            {groups.map(group => {
              // Get all entries for this group, sorted by time
              const groupEntries = schedule
                .flatMap(slot => slot.entries
                  .filter(entry => entry.group.id === group.id)
                  .map(entry => ({
                    slotIndex: slot.slotIndex,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    game: entry.game
                  }))
                )
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                
              return (
                <div key={group.id} className="p-4 border rounded-lg shadow-md bg-card">
                  <h3 className="text-xl font-semibold mb-3 border-b pb-2">
                    {group.name}
                  </h3>
                  
                  {groupEntries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-2">
                      Aucun jeu programmé
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {groupEntries.map((entry, index) => (
                        <li key={index} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{entry.game.name}</span>
                            <div className="text-sm text-muted-foreground">
                              Créneau {entry.slotIndex}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 