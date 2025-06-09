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
  const parts = key.split("-");
  if (parts.length !== 2) {
    throw new Error(`Invalid game-round key format: ${key}`);
  }
  const [gameIdStr, roundStr] = parts;
  return {
    gameId: parseInt(gameIdStr),
    round: parseInt(roundStr)
  };
}

// Types for our initialized state
interface ValidationResult {
  validatedTimeRanges: TimeRange[];
  needsToPlay: Map<number, Set<GameRoundKey>>;
  gameRoundMap: Map<GameRoundKey, { game: Game, round: number }>;
  groupMap: Map<number, Group>;
  gameMap: Map<number, Game>;
}

/**
 * Validates inputs and initializes necessary data structures for scheduling
 */
function validateInputs(
  groups: Group[],
  games: Game[],
  timeRanges: TimeRange[],
  startDate: Date
): ValidationResult | { error: string } {
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
    
    validatedTimeRanges = [{
      id: 'default',
      startTime: defaultStart,
      endTime: defaultEnd
    }];
  }

  // Initialize needsToPlay with all game-round combinations
  const needsToPlay = new Map<number, Set<GameRoundKey>>();
  const gameRoundMap = new Map<GameRoundKey, { game: Game, round: number }>();
  
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

  return {
    validatedTimeRanges,
    needsToPlay,
    gameRoundMap,
    groupMap,
    gameMap
  };
}

/**
 * Advances the time to the next valid time slot within available time ranges
 */
function advanceToNextValidTimeSlot(
  currentStartTimeMs: number,
  currentRangeIndex: number,
  validatedTimeRanges: TimeRange[],
  gameDurationMs: number
): { 
  isValid: boolean;
  currentStartTimeMs: number;
  currentRangeIndex: number;
  currentRange: TimeRange | undefined;
} {
  let currentTimeInRange = false;
  let currentRange = validatedTimeRanges[currentRangeIndex];
  
  while (!currentTimeInRange && currentRangeIndex < validatedTimeRanges.length) {
    currentRange = validatedTimeRanges[currentRangeIndex];
    
    if (!currentRange) { 
      return { 
        isValid: false, 
        currentStartTimeMs, 
        currentRangeIndex, 
        currentRange: undefined 
      };
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
          return { 
            isValid: false, 
            currentStartTimeMs, 
            currentRangeIndex, 
            currentRange: undefined 
          };
        }
        currentStartTimeMs = nextRange.startTime.getTime();
      }
    }
  }

  return {
    isValid: currentTimeInRange,
    currentStartTimeMs,
    currentRangeIndex,
    currentRange
  };
}

/**
 * Schedules solo games (1 group required)
 */
function scheduleSoloGame(
  gameRoundKey: GameRoundKey,
  game: Game,
  round: number,
  currentGroup: Group,
  timeslotEntries: ScheduleEntry[],
  groupScheduledInSlot: Set<number>,
  gameScheduledInSlot: Set<number>,
  needsToPlay: Map<number, Set<GameRoundKey>>,
  unscheduledGroups: Group[]
): boolean {
  // Mark the group as scheduled
  markGroupAsScheduled(
    currentGroup,
    game,
    round,
    gameRoundKey,
    timeslotEntries,
    groupScheduledInSlot,
    needsToPlay,
    unscheduledGroups
  );
  
  // Mark the game as scheduled
  gameScheduledInSlot.add(game.id);
  
  return true;
}

/**
 * Tries to schedule a multi-player game
 */
function scheduleMultiPlayerGame(
  gameRoundKey: GameRoundKey,
  game: Game,
  round: number,
  currentGroup: Group,
  groups: Group[],
  timeslotEntries: ScheduleEntry[],
  groupScheduledInSlot: Set<number>,
  gameScheduledInSlot: Set<number>,
  needsToPlay: Map<number, Set<GameRoundKey>>,
  unscheduledGroups: Group[]
): boolean {
  const currentGroupId = currentGroup.id;
  const partnersNeeded = game.numberOfGroups - 1;
  
  // Find suitable partner groups
  const potentialPartners = groups.filter(g => 
    g.id !== currentGroupId && 
    !groupScheduledInSlot.has(g.id) && 
    Array.from(needsToPlay.get(g.id) ?? []).some(key => {
      const keyInfo = parseGameRoundKey(key);
      return keyInfo.gameId === game.id && keyInfo.round === round;
    })
  );
  
  // If enough partners found, schedule them
  if (potentialPartners.length >= partnersNeeded) {
    const selectedPartners = shuffleArray([...potentialPartners]).slice(0, partnersNeeded);
    const allParticipants = [currentGroup, ...selectedPartners];
    
    // Schedule all participants
    allParticipants.forEach(group => {
      // The primary group uses the provided key, partners need to find their own
      const usingKey = group.id === currentGroupId ? gameRoundKey : undefined;
      
      markGroupAsScheduled(
        group,
        game,
        round,
        usingKey,
        timeslotEntries,
        groupScheduledInSlot,
        needsToPlay,
        unscheduledGroups
      );
    });
    
    gameScheduledInSlot.add(game.id);
    return true;
  }
  
  return false;
}

/**
 * Attempts to schedule unscheduled groups with any available games
 */
function scheduleRemainingGroups(
  unscheduledGroups: Group[],
  groups: Group[],
  needsToPlay: Map<number, Set<GameRoundKey>>,
  gameRoundMap: Map<GameRoundKey, { game: Game, round: number }>,
  groupScheduledInSlot: Set<number>,
  gameScheduledInSlot: Set<number>,
  timeslotEntries: ScheduleEntry[]
): void {
  // Create a copy of the array to iterate, as we'll modify unscheduledGroups
  const groupsToTry = [...unscheduledGroups];
  
  for (const group of groupsToTry) {
    // Skip if somehow just got scheduled
    if (groupScheduledInSlot.has(group.id)) continue;
    
    // Get all game-round combinations this group needs
    const neededGameRounds = [];
    
    // Find valid game-rounds this group needs
    for (const key of needsToPlay.get(group.id) ?? []) {
      const info = gameRoundMap.get(key);
      if (!info || gameScheduledInSlot.has(info.game.id)) continue;
      
      neededGameRounds.push({
        key,
        game: info.game,
        round: info.round
      });
    }
    
    // Sort by fewer required participants first (easier to schedule)
    neededGameRounds.sort((a, b) => a.game.numberOfGroups - b.game.numberOfGroups);
    
    // Try to schedule this group with any of these games
    for (const { key, game, round } of neededGameRounds) {
      // Skip if game was just scheduled
      if (gameScheduledInSlot.has(game.id)) continue;
      
      const partnersNeeded = game.numberOfGroups - 1;
      
      // Find available partners for this game
      const availablePartners = groups.filter(g => 
        !groupScheduledInSlot.has(g.id) && 
        g.id !== group.id
      );
      
      // If we have enough partners, schedule the game
      if (availablePartners.length >= partnersNeeded) {
        const selectedPartners = shuffleArray([...availablePartners]).slice(0, partnersNeeded);
        const participants = [group, ...selectedPartners];
        
        // Schedule all participants
        participants.forEach(g => {
          const usingKey = g.id === group.id ? key : undefined;
          
          markGroupAsScheduled(
            g,
            game,
            round,
            usingKey,
            timeslotEntries,
            groupScheduledInSlot,
            needsToPlay,
            unscheduledGroups
          );
        });
        
        gameScheduledInSlot.add(game.id);
        break; // This group is now scheduled
      }
    }
  }
}

/**
 * Attempts to schedule groups for a single time slot
 */
function scheduleTimeSlot(
  groups: Group[],
  needsToPlay: Map<number, Set<GameRoundKey>>,
  gameRoundMap: Map<GameRoundKey, { game: Game, round: number }>,
  startTime: Date,
  endTime: Date
): {
  entries: ScheduleEntry[];
  hasScheduledGames: boolean;
} {
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
        groupHasBeenScheduled = scheduleSoloGame(
          gameRoundKey,
          game,
          round,
          currentGroup,
          timeslotEntries,
          groupScheduledInSlot,
          gameScheduledInSlot,
          needsToPlay,
          unscheduledGroups
        );
        break;
      }
      // For multi-group games, find partner groups
      else if (game.numberOfGroups > 1) {
        groupHasBeenScheduled = scheduleMultiPlayerGame(
          gameRoundKey,
          game,
          round,
          currentGroup,
          groups,
          timeslotEntries,
          groupScheduledInSlot,
          gameScheduledInSlot,
          needsToPlay,
          unscheduledGroups
        );
        if (groupHasBeenScheduled) break;
      }
    }

    // If we scheduled this group, continue to the next one
    if (groupHasBeenScheduled) {
      continue;
    }
  }

  // Try one more time to schedule unscheduled groups
  scheduleRemainingGroups(
    unscheduledGroups,
    groups,
    needsToPlay,
    gameRoundMap,
    groupScheduledInSlot,
    gameScheduledInSlot,
    timeslotEntries
  );

  // Sort entries for consistent display
  timeslotEntries.sort((a, b) => {
    const gameCompare = a.game.name.localeCompare(b.game.name);
    if (gameCompare !== 0) return gameCompare;
    
    // If same game, sort by round
    const roundCompare = (a.round ?? 1) - (b.round ?? 1);
    if (roundCompare !== 0) return roundCompare;
    
    return a.group.name.localeCompare(b.group.name);
  });

  return {
    entries: timeslotEntries,
    hasScheduledGames: timeslotEntries.length > 0
  };
}

function markGroupAsScheduled(
  group: Group,
  game: Game,
  round: number,
  gameRoundKey: GameRoundKey | undefined,
  timeslotEntries: ScheduleEntry[],
  groupScheduledInSlot: Set<number>,
  needsToPlay: Map<number, Set<GameRoundKey>>,
  unscheduledGroups: Group[]
): void {
  // Add the schedule entry
  timeslotEntries.push({ 
    group, 
    game,
    round,
  });
  
  // Mark group as scheduled in this slot
  groupScheduledInSlot.add(group.id);
  
  // If we have a specific key, remove it from needs
  if (gameRoundKey) {
    needsToPlay.get(group.id)?.delete(gameRoundKey);
  } else {
    // Otherwise find and remove the matching game-round
    const matchingKey = Array.from(needsToPlay.get(group.id) ?? []).find(key => {
      const keyInfo = parseGameRoundKey(key);
      return keyInfo.gameId === game.id && keyInfo.round === round;
    });
    
    if (matchingKey) {
      needsToPlay.get(group.id)?.delete(matchingKey);
    }
  }
  
  // Remove from unscheduled groups
  const groupIndex = unscheduledGroups.findIndex(g => g.id === group.id);
  if (groupIndex >= 0) {
    unscheduledGroups.splice(groupIndex, 1);
  }
}

/**
 * Calculates all possible time slots within the given time ranges
 */
function calculateAllTimeSlots(
  validatedTimeRanges: TimeRange[],
  gameDurationMs: number,
  transitionTimeMs: number
): { startTime: Date, endTime: Date }[] {
  const timeslotIntervalMs = gameDurationMs + transitionTimeMs;
  const allSlots: { startTime: Date, endTime: Date }[] = [];

  for (const range of validatedTimeRanges) {
    let currentStartTimeMs = range.startTime.getTime();
    const rangeEndTimeMs = range.endTime.getTime();

    while (currentStartTimeMs <= rangeEndTimeMs - gameDurationMs) {
      const startTime = new Date(currentStartTimeMs);
      const endTime = new Date(currentStartTimeMs + gameDurationMs);
      
      allSlots.push({ startTime, endTime });
      currentStartTimeMs += timeslotIntervalMs;
    }
  }

  return allSlots;
}

/**
 * Main schedule generation function (internal implementation)
 */
function generateScheduleInternal(
  groups: Group[],
  games: Game[],
  validatedTimeRanges: TimeRange[],
  needsToPlay: Map<number, Set<GameRoundKey>>,
  gameRoundMap: Map<GameRoundKey, { game: Game, round: number }>,
  groupMap: Map<number, Group>,
  gameMap: Map<number, Game>,
  gameDurationMs: number,
  transitionTimeMs: number
): Schedule | { error: string } {
  const N = groups.length;
  const schedule: Schedule = [];

  // Calculate all possible time slots
  const allTimeSlots = calculateAllTimeSlots(validatedTimeRanges, gameDurationMs, transitionTimeMs);
  
  if (allTimeSlots.length === 0) {
    return { error: "Aucun créneau horaire disponible dans les plages définies." };
  }

  // Calculate a more generous MAX_SLOTS since we now have rounds
  const totalGameRounds = games.reduce((sum, game) => sum + (game.rounds ?? 1), 0);
  const MAX_SLOTS = Math.min(allTimeSlots.length, (N * totalGameRounds) + N); // Safety break
  
  let slotsUsed = 0;

  // Iterate through time slots in REVERSE order (from end to beginning)
  for (let i = allTimeSlots.length - 1; i >= 0 && slotsUsed < MAX_SLOTS; i--) {
    // Check if we still have groups that need to play games
    const hasRemainingNeeds = Array.from(needsToPlay.values()).some(gameRoundSet => gameRoundSet.size > 0);
    if (!hasRemainingNeeds) {
      break; // All groups have played all games
    }

    slotsUsed++;
    const timeSlot = allTimeSlots[i];
    if (!timeSlot) continue; // Safety check
    
    // Schedule this time slot
    const { entries, hasScheduledGames } = scheduleTimeSlot(
      groups,
      needsToPlay,
      gameRoundMap,
      timeSlot.startTime,
      timeSlot.endTime
    );

    // Add the completed timeslot to the schedule if any games were played
    if (hasScheduledGames) {
      // Calculate the slot index based on the original order (not reversed)
      const slotIndex = i + 1; // 1-based indexing
      schedule.push({ 
        slotIndex, 
        startTime: timeSlot.startTime, 
        endTime: timeSlot.endTime, 
        entries 
      });
    }
  }

  // Check if all groups completed all games
  const remainingNeeds = Array.from(needsToPlay.values()).some(gameRoundSet => gameRoundSet.size > 0);
  if (remainingNeeds) {
    return { error: buildErrorMessage(needsToPlay, groupMap, gameMap) };
  }

  // Sort the schedule by start time for proper display (earliest first)
  schedule.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return schedule;
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
  // Step 1: Validate inputs and initialize data structures
  const validationResult = validateInputs(groups, games, timeRanges, startDate);
  if ('error' in validationResult) {
    return validationResult;
  }

  // Step 2: Generate the schedule using the validated data
  return generateScheduleInternal(
    groups,
    games,
    validationResult.validatedTimeRanges,
    validationResult.needsToPlay,
    validationResult.gameRoundMap,
    validationResult.groupMap,
    validationResult.gameMap,
    gameDurationMs,
    transitionTimeMs
  );
}

function buildErrorMessage(
  needsToPlay: Map<number, Set<GameRoundKey>>,
  groupMap: Map<number, Group>,
  gameMap: Map<number, Game>
): string {
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
    
  return `La génération de l'horaire a dépassé le nombre maximum de créneaux sans que tous les groupes aient joué à tous les jeux. Vérifiez la configuration. Besoins restants: ${remainingNeedsSummary}`;
}
