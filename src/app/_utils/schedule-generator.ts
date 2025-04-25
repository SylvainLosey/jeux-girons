import { Schedule, Game, Group, TimeRange, ScheduleEntry } from "../_types/schedule-types";
import { shuffleArray } from "./array-utils";

// Define a type for our game-round combination key
type GameRoundKey = string; // Format: "gameId-round"

// Helper function to create a game-round key
function createGameRoundKey(gameId: number, round: number): GameRoundKey {
  return `${gameId}-${round}`;
}

// Helper function to parse a game-round key
function parseGameRoundKey(key: GameRoundKey): { gameId: number, round: number } {
  const [gameIdStr, roundStr] = key.split("-");
  return {
    gameId: parseInt(gameIdStr),
    round: parseInt(roundStr)
  };
}

/**
 * Generates a schedule based on groups, games, and time constraints.
 */
export function generateSchedule(
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
  let validatedTimeRanges = [...timeRanges]; // Create a mutable copy
  if (validatedTimeRanges.length === 0) {
    // Use a default range from 9 AM to 5 PM
    const defaultStart = new Date(startDate);
    defaultStart.setHours(9, 0, 0, 0);
    
    const defaultEnd = new Date(startDate);
    defaultEnd.setHours(17, 0, 0, 0);
    
    validatedTimeRanges = [{ // Assign to the new variable
      id: 'default',
      startTime: defaultStart,
      endTime: defaultEnd
    }];
  }

  const schedule: Schedule = [];
  const timeslotIntervalMs = gameDurationMs + transitionTimeMs;

  // State: Which games (and rounds) each group still needs to play
  const needsToPlay = new Map<number, Set<GameRoundKey>>();
  const gameRoundMap = new Map<GameRoundKey, { game: Game, round: number }>();
  
  // Initialize needsToPlay with all game-round combinations
  groups.forEach(group => {
    const gameRoundSet = new Set<GameRoundKey>();
    games.forEach(game => {
      // Add one entry for each round of the game
      const rounds = game.rounds ?? 1;
      for (let round = 1; round <= rounds; round++) {
        const key = createGameRoundKey(game.id, round);
        gameRoundSet.add(key);
        gameRoundMap.set(key, { game, round });
      }
    });
    needsToPlay.set(group.id, gameRoundSet);
  });

  // Lookup maps
  const groupMap = new Map(groups.map(g => [g.id, g]));
  const gameMap = new Map(games.map(g => [g.id, g]));

  // Get the first time range safely. We know validatedTimeRanges has at least one element here.
  const firstRange = validatedTimeRanges[0];
  if (!firstRange) {
    return { error: "Erreur interne: Impossible de déterminer la plage horaire initiale." };
  }
  
  // Start with the first time range's start time
  let currentStartTimeMs = firstRange.startTime.getTime();
  let currentRangeIndex = 0;
  let slotIndex = 0;
  
  // Calculate a more generous MAX_SLOTS since we now have rounds
  const totalGameRounds = games.reduce((sum, game) => sum + (game.rounds ?? 1), 0);
  const MAX_SLOTS = (N * totalGameRounds) + N; // Safety break

  // Loop until all groups have played all games/rounds OR max slots reached
  while (Array.from(needsToPlay.values()).some(gameRoundSet => gameRoundSet.size > 0)) {
    slotIndex++;
    if (slotIndex > MAX_SLOTS) {
      const remainingNeedsSummary = Array.from(needsToPlay.entries())
        .filter(([_, gameRoundSet]) => gameRoundSet.size > 0)
        .map(([groupId, gameRoundSet]) => {
          const groupName = groupMap.get(groupId)?.name ?? `ID ${groupId}`;
          const remainingGames = Array.from(gameRoundSet).map(key => {
            const { gameId, round } = parseGameRoundKey(key);
            const game = gameMap.get(gameId);
            return game ? `${game.name} (tour ${round})` : `GameID ${gameId}-${round}`;
          }).join(', ');
          return `${groupName}: ${gameRoundSet.size} jeux/tours restants (${remainingGames})`;
        })
        .join('; ');
      return { error: `La génération de l'horaire a dépassé ${MAX_SLOTS} créneaux sans que tous les groupes aient joué à tous les jeux. Vérifiez la configuration ou augmentez MAX_SLOTS. Besoins restants: ${remainingNeedsSummary}` };
    }

    // Time range management logic (unchanged)
    let currentTimeInRange = false;
    let currentRange = validatedTimeRanges[currentRangeIndex];
    
    while (!currentTimeInRange && currentRangeIndex < validatedTimeRanges.length) {
      currentRange = validatedTimeRanges[currentRangeIndex];
      
      if (!currentRange) { 
        return { error: "Erreur interne: Plage horaire inattendue non définie." };
      }

      if (currentStartTimeMs < currentRange.startTime.getTime()) {
        currentStartTimeMs = currentRange.startTime.getTime();
      }
      
      if (currentStartTimeMs <= currentRange.endTime.getTime() - gameDurationMs) {
        currentTimeInRange = true;
      } else {
        currentRangeIndex++;
        if (currentRangeIndex < validatedTimeRanges.length) {
          const nextRange = validatedTimeRanges[currentRangeIndex];
          if (!nextRange) {
            return { error: "Erreur interne: Plage horaire suivante non définie." };
          }
          currentStartTimeMs = nextRange.startTime.getTime();
        }
      }
    }

    // If we couldn't find a valid time range, we're done
    if (!currentTimeInRange) {
      return { error: "Plus de plages horaires disponibles, mais tous les groupes n'ont pas joué à tous les jeux." };
    }

    // Create timeslot with current time
    const startTime = new Date(currentStartTimeMs);
    const endTime = new Date(currentStartTimeMs + gameDurationMs);
    
    // Update currentStartTimeMs for next iteration
    currentStartTimeMs += timeslotIntervalMs;

    // State for this timeslot
    const timeslotEntries: ScheduleEntry[] = [];
    const groupScheduledInSlot = new Set<number>();
    const gameScheduledInSlot = new Set<number>();

    // Shuffle groups to ensure fairness
    const shuffledGroups = [...groups];
    shuffleArray(shuffledGroups);

    // Track unscheduled groups for this timeslot
    const unscheduledGroups = [...shuffledGroups];

    // Sort groups by most needs first
    shuffledGroups.sort((a, b) => {
      const aNeedsCount = needsToPlay.get(a.id)?.size ?? 0;
      const bNeedsCount = needsToPlay.get(b.id)?.size ?? 0;
      return bNeedsCount - aNeedsCount;
    });

    // Iterate through prioritized groups
    for (const currentGroup of shuffledGroups) {
      const currentGroupId = currentGroup.id;

      // Skip if group already scheduled in this slot or has no needs left
      if (groupScheduledInSlot.has(currentGroupId) || (needsToPlay.get(currentGroupId)?.size ?? 0) === 0) {
        continue;
      }

      // Try to find a game for this group
      let groupHasBeenScheduled = false;
      
      // Get game-round combinations this group needs, but order by game numberOfGroups (highest first)
      const neededGameRoundKeys = Array.from(needsToPlay.get(currentGroupId) ?? []);
      
      // Sort by higher number of required groups first
      neededGameRoundKeys.sort((keyA, keyB) => {
        const infoA = gameRoundMap.get(keyA);
        const infoB = gameRoundMap.get(keyB);
        
        if (!infoA || !infoB) return 0; // Shouldn't happen
        
        const requiredA = infoA.game.numberOfGroups;
        const requiredB = infoB.game.numberOfGroups;
        
        // Sort by numberOfGroups first, then by round number (ascending)
        if (requiredA !== requiredB) {
          return requiredB - requiredA; // Descending order of required groups
        }
        
        // If same number of groups, sort by round
        return infoA.round - infoB.round; // Ascending order of rounds
      });

      // Try each needed game-round combo
      for (const gameRoundKey of neededGameRoundKeys) {
        const info = gameRoundMap.get(gameRoundKey);
        if (!info) continue;
        
        const { game, round } = info;
        
        // Skip if game already scheduled in this slot
        if (gameScheduledInSlot.has(game.id)) continue;
        
        // If it's a solo game (1 group required), schedule it immediately
        if (game.numberOfGroups === 1) {
          timeslotEntries.push({ 
            group: currentGroup, 
            game,
            round, // Include round information 
          });
          groupScheduledInSlot.add(currentGroupId);
          gameScheduledInSlot.add(game.id);
          groupHasBeenScheduled = true;
          
          // Update the needsToPlay
          needsToPlay.get(currentGroupId)?.delete(gameRoundKey);
          
          // Remove from unscheduled groups
          const groupIndex = unscheduledGroups.findIndex(g => g.id === currentGroupId);
          if (groupIndex >= 0) {
            unscheduledGroups.splice(groupIndex, 1);
          }
          
          break;
        }
        
        // For multi-group games, find partner groups
        else if (game.numberOfGroups > 1) {
          const partnersNeeded = game.numberOfGroups - 1;
          
          // Find groups that also need to play this game
          const potentialPartners = groups.filter(g => 
            g.id !== currentGroupId && // Not the current group 
            !groupScheduledInSlot.has(g.id) && // Not already scheduled this slot
            Array.from(needsToPlay.get(g.id) ?? []).some(key => {
              const keyInfo = parseGameRoundKey(key);
              return keyInfo.gameId === game.id && keyInfo.round === round;
            })
          );
          
          // If enough partners found, schedule them!
          if (potentialPartners.length >= partnersNeeded) {
            const selectedPartners = potentialPartners.slice(0, partnersNeeded);
            const allParticipants = [currentGroup, ...selectedPartners];
            
            // Add entries for all participating groups
            allParticipants.forEach(group => {
              const entry: ScheduleEntry = { 
                group, 
                game,
                round, // Include round information
              };
              timeslotEntries.push(entry);
              groupScheduledInSlot.add(group.id);
              
              // Find and remove this group's need for this game-round
              const thisGroupGameRoundKey = Array.from(needsToPlay.get(group.id) ?? []).find(key => {
                const keyInfo = parseGameRoundKey(key);
                return keyInfo.gameId === game.id && keyInfo.round === round;
              });
              
              if (thisGroupGameRoundKey) {
                needsToPlay.get(group.id)?.delete(thisGroupGameRoundKey);
              }
              
              // Remove from unscheduled groups
              const groupIndex = unscheduledGroups.findIndex(g => g.id === group.id);
              if (groupIndex >= 0) {
                unscheduledGroups.splice(groupIndex, 1);
              }
            });
            
            gameScheduledInSlot.add(game.id);
            groupHasBeenScheduled = true;
            break;
          }
        }
      }

      // If we scheduled this group, continue to the next one
      if (groupHasBeenScheduled) {
        continue;
      }
    }

    // Try one more time to schedule unscheduled groups
    for (const group of unscheduledGroups) {
      // Skip if somehow just got scheduled
      if (groupScheduledInSlot.has(group.id)) continue;
      
      // Get all game-round combinations this group needs
      const neededGameRounds = Array.from(needsToPlay.get(group.id) ?? [])
        .map(key => {
          const info = gameRoundMap.get(key);
          if (!info) return null;
          return { key, game: info.game, round: info.round };
        })
        .filter((item): item is { key: string, game: Game, round: number } => 
          item !== null && !gameScheduledInSlot.has(item.game.id)
        )
        // Sort by lower number of required participants first (easier to fit)
        .sort((a, b) => a.game.numberOfGroups - b.game.numberOfGroups);
      
      // Try each game-round combo
      for (const { key, game, round } of neededGameRounds) {
        const partnersNeeded = game.numberOfGroups - 1;
        
        // Check if we have enough unscheduled groups to play this game
        const availablePartners = groups
          .filter(g => 
            !groupScheduledInSlot.has(g.id) && // Not scheduled yet
            g.id !== group.id // Not the current group
          )
          .slice(0, partnersNeeded); // Take just what we need
        
        if (availablePartners.length >= partnersNeeded) {
          // We can schedule this game!
          const participants = [group, ...availablePartners];
          
          participants.forEach(g => {
            timeslotEntries.push({ group: g, game, round });
            groupScheduledInSlot.add(g.id);
            
            // Update needs - remove this specific game-round combination for the primary group
            if (g.id === group.id) {
              needsToPlay.get(g.id)?.delete(key);
            } else {
              // For partner groups, we need to find their matching game-round key
              const partnerGameRoundKey = Array.from(needsToPlay.get(g.id) ?? []).find(k => {
                const keyInfo = parseGameRoundKey(k);
                return keyInfo.gameId === game.id && keyInfo.round === round;
              });
              
              if (partnerGameRoundKey) {
                needsToPlay.get(g.id)?.delete(partnerGameRoundKey);
              }
            }
          });
          
          gameScheduledInSlot.add(game.id);
          break; // This group is now scheduled
        }
      }
    }

    // Add the completed timeslot to the schedule if any games were played
    if (timeslotEntries.length > 0) {
      // Sort entries for consistent display
      timeslotEntries.sort((a, b) => {
        const gameCompare = a.game.name.localeCompare(b.game.name);
        if (gameCompare !== 0) return gameCompare;
        
        // If same game, sort by round
        const roundCompare = (a.round ?? 1) - (b.round ?? 1);
        if (roundCompare !== 0) return roundCompare;
        
        return a.group.name.localeCompare(b.group.name);
      });

      schedule.push({ slotIndex, startTime, endTime, entries: timeslotEntries });
    }
  }

  return schedule;
} 