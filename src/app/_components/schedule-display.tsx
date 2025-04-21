"use client";

import { useState } from "react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale'; // For French formatting

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
// Assuming Alert components are available from your UI library (like shadcn/ui)
// If not, replace with simple <p> tags for errors.
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

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

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (shuffled[i] !== undefined && shuffled[j] !== undefined) {
            // Use a temporary variable instead of destructuring to avoid the type error
            const temp = shuffled[i] as T;
            shuffled[i] = shuffled[j] as T;
            shuffled[j] = temp;
        }
    }
    return shuffled;
}

// Helper function for formatting time (Moved Here)
const formatTime = (date: Date) => format(date, 'HH:mm', { locale: fr });

/**
 * Generates a schedule based on groups, games, and a start date.
 * Constraints:
 * - Each group plays each game exactly once.
 * - Games run concurrently based on their 'numberOfGroups' requirement.
 * - Fixed game duration (12 min) and transition time (8 min).
 */
function generateSchedule(
    groups: Group[],
    games: Game[],
    startDate: Date,
    formatTimeFn: (date: Date) => string
): Schedule | { error: string } {
    console.log("--- Starting Schedule Generation (New Approach) ---");
    console.log(`Groups: ${groups.length}, Games: ${games.length}`);

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

    const schedule: Schedule = [];
    const gameDurationMs = 12 * 60 * 1000;
    const transitionTimeMs = 8 * 60 * 1000;
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

    // --- DEBUG: Find ID for the problematic group ---
    const problematicGroupName = "Jeunesse de Sévaz"; // Adjust if name is different
    const problematicGroupId = groups.find(g => g.name === problematicGroupName)?.id;
    console.log(`Targeting problematic group: ${problematicGroupName} (ID: ${problematicGroupId ?? 'Not Found'})`);
    // --- END DEBUG ---

    let currentStartTimeMs = startDate.getTime();
    let slotIndex = 0;
    const MAX_SLOTS = (N * M) + N; // Adjusted safety break

    // Loop until all groups have played all games OR max slots reached
    while (Array.from(needsToPlay.values()).some(gamesSet => gamesSet.size > 0)) {
        slotIndex++;
        if (slotIndex > MAX_SLOTS) {
             console.error("Schedule generation exceeded MAX_SLOTS.", { needsToPlay });
             const remainingNeedsSummary = Array.from(needsToPlay.entries())
                .filter(([_, gameSet]) => gameSet.size > 0)
                .map(([groupId, gameSet]) => {
                    const groupName = groupMap.get(groupId)?.name ?? `ID ${groupId}`;
                    const remainingGameNames = Array.from(gameSet).map(gameId => gameMap.get(gameId)?.name ?? `GameID ${gameId}`).join(', ');
                    return `${groupName}: ${gameSet.size} jeux restants (${remainingGameNames})`; // Log remaining game names
                })
                .join('; ');
             return { error: `La génération de l'horaire a dépassé ${MAX_SLOTS} créneaux sans que tous les groupes aient joué à tous les jeux. Vérifiez la configuration ou augmentez MAX_SLOTS. Besoins restants: ${remainingNeedsSummary}` };
        }

        const startTime = new Date(currentStartTimeMs);
        const endTime = new Date(currentStartTimeMs + gameDurationMs);
        const timeslotEntries: ScheduleEntry[] = [];
        const groupScheduledInSlot = new Set<number>();
        const gameScheduledInSlot = new Set<number>();

        console.log(`\n--- Slot ${slotIndex} (${formatTimeFn(startTime)}) ---`);

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

                // Find potential partners for this game (excluding self, not already scheduled, and need this game)
                const potentialPartnerIds: number[] = [];
                for (const otherGroup of groups) {
                    const otherGroupId = otherGroup.id;
                    if (otherGroupId === currentGroupId) continue; // Not self
                    if (groupScheduledInSlot.has(otherGroupId)) continue; // Already busy this slot
                    if (needsToPlay.get(otherGroupId)?.has(game.id)) { // Needs this game
                        potentialPartnerIds.push(otherGroupId);
                    }
                }

                // Check if enough partners are available and need this game
                if (potentialPartnerIds.length >= partnersNeeded) {
                    console.log(`  Trying to schedule Game: ${game.name} (${requiredParticipants}) for Group: ${currentGroup.name}`);
                    console.log(`    Found ${potentialPartnerIds.length} potential partners: [${potentialPartnerIds.map(id => groupMap.get(id)?.name).join(', ')}]`);

                    // Select partners (prioritize those with fewer needs overall)
                    potentialPartnerIds.sort((aId, bId) => {
                        const needsA = needsToPlay.get(aId)?.size ?? Infinity;
                        const needsB = needsToPlay.get(bId)?.size ?? Infinity;
                        return needsA - needsB;
                    });
                    const selectedPartnerIds = potentialPartnerIds.slice(0, partnersNeeded);

                    // Schedule the game!
                    const participatingGroupIds = [currentGroupId, ...selectedPartnerIds];
                    console.log(`    --> Scheduling ${game.name} with: [${participatingGroupIds.map(id => groupMap.get(id)?.name).join(', ')}]`);

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

            if (!groupHasBeenScheduled) {
                 // Optional: Log if a group couldn't be scheduled this slot
                 // console.log(`  Group ${currentGroup.name} could not be scheduled this slot.`);
            }

        } // End loop through shuffledGroups

        // --- End of Timeslot Planning ---

        // Add the completed timeslot to the schedule if any games were played
        if (timeslotEntries.length > 0) {
            // Sort entries for consistent display (optional, but nice)
            timeslotEntries.sort((a, b) => {
                const gameCompare = a.game.name.localeCompare(b.game.name);
                if (gameCompare !== 0) return gameCompare;
                return a.group.name.localeCompare(b.group.name);
            });

            schedule.push({ slotIndex, startTime, endTime, entries: timeslotEntries });

            // Update the master needsToPlay list
            console.log(`  Updating needs after Slot ${slotIndex}:`);
            timeslotEntries.forEach(entry => {
                needsToPlay.get(entry.group.id)?.delete(entry.game.id);
            });
        } else {
            console.log(`  Slot ${slotIndex}: No games scheduled.`);
        }

        // --- Deadlock Check & Filler Logic ---
        const remainingNeedsEntries = Array.from(needsToPlay.entries())
            .filter(([_, gameSet]) => gameSet.size > 0);

        if (
            remainingNeedsEntries.length === 2 && // Exactly two groups left
            remainingNeedsEntries.every(([_, gameSet]) => gameSet.size === 1) // Each needs exactly one game
        ) {
            // Safe access with proper type checking
            if (remainingNeedsEntries[0] && remainingNeedsEntries[1]) {
                const entryA = remainingNeedsEntries[0];
                const entryB = remainingNeedsEntries[1];
                
                const groupAId = entryA[0];
                const gameAIdSet = entryA[1];
                const gameAId = gameAIdSet.size > 0 ? Array.from(gameAIdSet)[0] : undefined;
                
                const groupBId = entryB[0];
                const gameBIdSet = entryB[1];
                const gameBId = gameBIdSet.size > 0 ? Array.from(gameBIdSet)[0] : undefined;
                
                // Make sure all IDs are defined before proceeding
                if (groupAId !== undefined && gameAId !== undefined && 
                    groupBId !== undefined && gameBId !== undefined) {
                    
                    const gameA = gameMap.get(gameAId);
                    const gameB = gameMap.get(gameBId);
                    
                    // Check if the games are different and both require 2 participants
                    if (gameA && gameB && gameAId !== gameBId && gameA.numberOfGroups === 2 && gameB.numberOfGroups === 2) {
                        console.log(`  Detected potential deadlock: ${groupMap.get(groupAId)?.name} needs ${gameA.name}, ${groupMap.get(groupBId)?.name} needs ${gameB.name}. Attempting filler slot.`);
                        
                        // Find two distinct groups that have finished all games
                        const finishedGroupIds = groups
                            .map(g => g.id)
                            .filter(id => (needsToPlay.get(id)?.size ?? 0) === 0 && id !== groupAId && id !== groupBId);
                        
                        if (finishedGroupIds.length >= 2) {
                            const fillerPartnerAId = finishedGroupIds[0];
                            const fillerPartnerBId = finishedGroupIds[1];
                            
                            // Safe access with proper checking
                            if (fillerPartnerAId !== undefined && fillerPartnerBId !== undefined) {
                                const fillerPartnerA = groupMap.get(fillerPartnerAId);
                                const fillerPartnerB = groupMap.get(fillerPartnerBId);
                                const groupA = groupMap.get(groupAId);
                                const groupB = groupMap.get(groupBId);
                                
                                if (groupA && groupB && fillerPartnerA && fillerPartnerB) {
                                    console.log(`    Creating filler slot with partners: ${fillerPartnerA.name} (for ${gameA.name}) and ${fillerPartnerB.name} (for ${gameB.name})`);

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

                                    // Update needs properly with null checks
                                    const groupANeeds = needsToPlay.get(groupAId);
                                    if (groupANeeds) groupANeeds.delete(gameAId);
                                    
                                    const groupBNeeds = needsToPlay.get(groupBId);
                                    if (groupBNeeds) groupBNeeds.delete(gameBId);
                                }
                            }
                        }
                    }
                }
            }
        }
        // --- End Deadlock Check ---

        // Advance time for the next timeslot (if not broken by filler logic)
        currentStartTimeMs += timeslotIntervalMs;

    } // End of main while loop

    // Final check
    const remainingNeeds = Array.from(needsToPlay.entries())
        .filter(([_, gameSet]) => gameSet.size > 0);

    if (remainingNeeds.length > 0) {
        console.error("Loop finished, but needs remain (unexpected state):", remainingNeeds);
        return { error: `Algorithme terminé mais besoins subsistent (état inattendu).` };
    }
    if (schedule.length === 0 && N > 0 && M > 0) {
        return { error: "Aucun créneau généré malgré données valides." };
    }

    console.log("--- Schedule Generation Successful ---");
    return schedule;
}


export function ScheduleDisplay() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Default start date: 2025-08-09 09:00
  // Note: Month is 0-indexed in JS Date (7 = August)
  const [startDate] = useState(new Date(2025, 7, 9, 9, 0, 0));

  // Fetch games and groups data using tRPC hooks
  const { data: games, isLoading: isLoadingGames, error: errorGames } = api.game.getAll.useQuery();
  const { data: groups, isLoading: isLoadingGroups, error: errorGroups } = api.group.getAll.useQuery();

  const handleGenerateSchedule = () => {
    // Ensure data is loaded
    if (!games || !groups) {
        setScheduleError("Les données des jeux ou des groupes ne sont pas encore chargées.");
        return;
    }

    setIsGenerating(true);
    setSchedule(null);
    setScheduleError(null);

    // Use setTimeout to allow the UI to update to "Generating..." state
    // before potentially blocking the thread with the generation logic (though it should be fast here)
    setTimeout(() => {
        try {
            // Generate the schedule using the fetched data and start date
            const result = generateSchedule(groups, games, startDate, formatTime);

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
  const fetchError = errorGames ?? errorGroups; // Using nullish coalescing

  // Helper functions for formatting dates and times using date-fns
  const formatDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <div className="container mx-auto p-4 w-full max-w-4xl"> {/* Added max-width */}
      <h1 className="text-3xl font-bold mb-4">Générateur d&apos;Horaire</h1>

      {/* Display current parameters */}
      {/* TODO: Add a Date Picker component here later to allow changing the start date */}
      <div className="mb-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
         <p className="font-semibold text-lg mb-2">Paramètres Actuels :</p>
         <ul className="list-disc list-inside space-y-1">
            <li>Date de début : <span className="font-medium">{formatDate(startDate)} à {formatTime(startDate)}</span></li>
            <li>Durée d&apos;un jeu : <span className="font-medium">12 minutes</span></li>
            <li>Temps entre les jeux : <span className="font-medium">8 minutes</span></li>
            <li>Intervalle par créneau : <span className="font-medium">20 minutes</span></li>
         </ul>
      </div>

      {/* Button to trigger schedule generation */}
      <Button
        onClick={handleGenerateSchedule}
        disabled={isLoading || isGenerating || !!fetchError}
        className="mb-6"
        size="lg" // Make button larger
      >
        {isGenerating ? "Génération en cours..." : "Générer l'Horaire"}
      </Button>

      {/* Display loading state */}
      {isLoading && <p className="text-muted-foreground">Chargement des groupes et des jeux...</p>}

      {/* Display data fetching errors */}
      {fetchError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur de Chargement des Données</AlertTitle>
          <AlertDescription>Impossible de charger les données nécessaires : {fetchError.message}</AlertDescription>
        </Alert>
      )}

      {/* Display Generated Schedule or Errors */}
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