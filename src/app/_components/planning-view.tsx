"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Search, Users, Gamepad2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatTime } from "~/app/_utils/date-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function PlanningView() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [groupSearchValue, setGroupSearchValue] = useState("");
  const [gameSearchValue, setGameSearchValue] = useState("");
  const [groupSearchFocused, setGroupSearchFocused] = useState(false);
  const [gameSearchFocused, setGameSearchFocused] = useState(false);
  
  // Fetch all groups and games
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  const { data: games, isLoading: isLoadingGames } = api.game.getAll.useQuery();
  
  // Fetch the live schedule
  const { data: liveSchedule, isLoading: isLoadingLive } = api.schedule.getLive.useQuery();

  // Handle selecting a group
  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSelectedGame(null); // Clear game selection when a group is selected
    setGroupSearchFocused(false); // Close dropdown after selection
  };

  // Handle selecting a game
  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setSelectedGroup(null); // Clear group selection when a game is selected
    setGameSearchFocused(false); // Close dropdown after selection
  };

  return (
    <div className="container mx-auto px-4 pt-0 pb-4 max-w-4xl">
      <Tabs defaultValue="groups" className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Jeunesses
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Jeux
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="groups" className="mt-4 w-full">
          {/* Group Search - focus-aware implementation */}
          <div className="w-full mb-8 relative">
            <div className="flex items-center border rounded-t-lg px-3 bg-background shadow-md">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder="Rechercher une jeunesse..."
                value={groupSearchValue}
                onChange={(e) => setGroupSearchValue(e.target.value)}
                onFocus={() => setGroupSearchFocused(true)}
                onBlur={() => setTimeout(() => setGroupSearchFocused(false), 100)}
                className="flex h-11 w-full py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            
            {groupSearchFocused && (
              <div className="absolute w-full z-10 border border-t-0 rounded-b-lg shadow-md bg-popover">
                <ul className="max-h-[300px] overflow-y-auto py-1">
                  {isLoadingGroups ? (
                    <li className="px-2 py-3 text-sm text-center text-muted-foreground">
                      Chargement des jeunesses...
                    </li>
                  ) : !groups?.length ? (
                    <li className="px-2 py-3 text-sm text-center text-muted-foreground">
                      Aucune jeunesse trouvée
                    </li>
                  ) : (
                    groups
                      .filter(group => 
                        groupSearchValue.trim() === "" || 
                        group.name.toLowerCase().includes(groupSearchValue.toLowerCase())
                      )
                      .map((group) => (
                        <li 
                          key={group.id}
                          className="px-2 py-1.5 flex items-center hover:bg-accent cursor-pointer"
                          onMouseDown={() => handleSelectGroup(group)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          <span>{group.name}</span>
                        </li>
                      ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="games" className="mt-4 w-full">
          {/* Game Search - focus-aware implementation */}
          <div className="w-full mb-8 relative">
            <div className="flex items-center border rounded-t-lg px-3 bg-background shadow-md">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder="Rechercher un jeu..."
                value={gameSearchValue}
                onChange={(e) => setGameSearchValue(e.target.value)}
                onFocus={() => setGameSearchFocused(true)}
                onBlur={() => setTimeout(() => setGameSearchFocused(false), 100)} 
                className="flex h-11 w-full py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            
            {gameSearchFocused && (
              <div className="absolute w-full z-10 border border-t-0 rounded-b-lg shadow-md bg-popover">
                <ul className="max-h-[300px] overflow-y-auto py-1">
                  {isLoadingGames ? (
                    <li className="px-2 py-3 text-sm text-center text-muted-foreground">
                      Chargement des jeux...
                    </li>
                  ) : !games?.length ? (
                    <li className="px-2 py-3 text-sm text-center text-muted-foreground">
                      Aucun jeu trouvé
                    </li>
                  ) : (
                    games
                      .filter(game => 
                        gameSearchValue.trim() === "" || 
                        game.name.toLowerCase().includes(gameSearchValue.toLowerCase())
                      )
                      .map((game) => (
                        <li 
                          key={game.id}
                          className="px-2 py-1.5 flex items-center hover:bg-accent cursor-pointer"
                          onMouseDown={() => handleSelectGame(game)}
                        >
                          <Gamepad2 className="mr-2 h-4 w-4" />
                          <span>{game.name}</span>
                        </li>
                      ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Selected Group Schedule */}
      {selectedGroup && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            {selectedGroup.name}
          </h2>
          
          {isLoadingLive ? (
            <div className="text-center p-4">Chargement de l'horaire...</div>
          ) : !liveSchedule ? (
            <Alert className="mb-6">
              <AlertDescription>Aucun horaire actif n'est disponible actuellement.</AlertDescription>
            </Alert>
          ) : (
            <div className="mt-4">
              <GroupScheduleView 
                schedule={liveSchedule.schedule}
                group={selectedGroup}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Selected Game Schedule */}
      {selectedGame && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center">
            <Gamepad2 className="mr-2 h-5 w-5" />
            {selectedGame.name}
          </h2>
          
          {/* Add game description if available */}
          {selectedGame.description && (
            <p className="mb-4 text-muted-foreground">{selectedGame.description}</p>
          )}
          
          {isLoadingLive ? (
            <div className="text-center p-4">Chargement de l'horaire...</div>
          ) : !liveSchedule ? (
            <Alert className="mb-6">
              <AlertDescription>Aucun horaire actif n'est disponible actuellement.</AlertDescription>
            </Alert>
          ) : (
            <div className="mt-4">
              <GameScheduleView 
                schedule={liveSchedule.schedule}
                game={selectedGame}
              />
            </div>
          )}
        </div>
      )}
      
      {/* No selection state */}
      {!selectedGroup && !selectedGame && (
        <div className="text-center p-5 bg-muted rounded-lg border">
          <div className="flex justify-center space-x-3 mb-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <Gamepad2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Sélectionnez une Jeunesse ou un Jeu</h3>
          <p className="text-muted-foreground text-sm">
            Utilisez la recherche ci-dessus pour consulter l'horaire par jeunesse ou par jeu
          </p>
        </div>
      )}
    </div>
  );
}

// Component to show schedule for a single group
function GroupScheduleView({ schedule, group }) {
  // Filter the schedule to only include entries for the selected group
  const groupEntries = schedule
    .flatMap(slot => slot.entries
      .filter(entry => entry.group.id === group.id)
      .map(entry => ({
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        game: entry.game,
        round: entry.round
      }))
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  if (groupEntries.length === 0) {
    return (
      <Alert>
        <AlertDescription>Aucun jeu programmé pour cette jeunesse.</AlertDescription>
      </Alert>
    );
  }

  // Group entries by day
  const entriesByDay = groupEntries.reduce((acc, entry) => {
    // Format the date as a header - e.g., "Samedi 9 Août"
    const day = new Date(entry.startTime).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(entriesByDay).map(([day, entries]) => (
        <div key={day}>
          <h3 className="text-lg font-medium mb-2 capitalize border-b pb-1">{day}</h3>
          <div className="rounded-md border">
            <div className="divide-y">
              {entries.map((entry, index) => {
                // Find potential opponents (other groups playing the same game at the same time)
                const opponents = schedule
                  .flatMap(slot => 
                    slot.entries.filter(e => 
                      // Same game, same start time, different group
                      e.game.id === entry.game.id && 
                      slot.startTime.getTime() === entry.startTime.getTime() &&
                      e.group.id !== group.id
                    )
                  )
                  .map(e => e.group);

                return (
                  <div 
                    key={index} 
                    className={cn(
                      "flex p-2",
                      index % 2 === 0 ? "bg-muted/50" : ""
                    )}
                  >
                    <div className="py-2 w-16 text-muted-foreground shrink-0 font-medium text-right pr-3">
                      {formatTime(entry.startTime)}
                    </div>
                    <div className="py-2 min-w-0 flex-1">
                      <div>
                        <div className="font-medium">
                          {entry.game.name}
                          {entry.round && entry.round > 1 ? ` (Tour ${entry.round})` : ''}
                        </div>
                        {entry.game.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
                            {entry.game.description}
                          </p>
                        )}
                        {opponents.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {opponents.map(opponent => (
                              <div key={opponent.id} className="inline-flex items-center text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded px-2 py-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                </svg>
                                Contre: {opponent.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component to show schedule for a single game
function GameScheduleView({ schedule, game }) {
  // Filter the schedule to only include entries for the selected game
  const gameEntries = schedule
    .flatMap(slot => slot.entries
      .filter(entry => entry.game.id === game.id)
      .map(entry => ({
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        group: entry.group,
        round: entry.round
      }))
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  if (gameEntries.length === 0) {
    return (
      <Alert>
        <AlertDescription>Aucune jeunesse n'est programmée pour ce jeu.</AlertDescription>
      </Alert>
    );
  }

  // Group entries by day
  const entriesByDay = gameEntries.reduce((acc, entry) => {
    // Format the date as a header - e.g., "Samedi 9 Août"
    const day = new Date(entry.startTime).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(entry);
    return acc;
  }, {});

  // Further group entries by time slot
  const groupByTimeSlot = (entries) => {
    return entries.reduce((acc, entry) => {
      const timeKey = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
      if (!acc[timeKey]) {
        acc[timeKey] = {
          startTime: entry.startTime,
          endTime: entry.endTime,
          groups: [],
          round: entry.round
        };
      }
      acc[timeKey].groups.push(entry.group);
      return acc;
    }, {});
  };

  return (
    <div className="space-y-6">
      {Object.entries(entriesByDay).map(([day, entries]) => {
        const timeSlots = groupByTimeSlot(entries);
        
        return (
          <div key={day}>
            <h3 className="text-lg font-medium mb-2 capitalize border-b pb-1">{day}</h3>
            <div className="rounded-md border">
              <Table>
                <TableBody>
                  {Object.entries(timeSlots).map(([timeRange, slotData], index) => (
                    <TableRow key={index} className={cn(
                      index % 2 === 0 ? "bg-muted/50" : ""
                    )}>
                      <TableCell className="py-2">
                        <div className="font-medium">
                          {slotData.groups.map(g => g.name).join(', ')}
                          {slotData.round && slotData.round > 1 ? ` (Tour ${slotData.round})` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 whitespace-nowrap">
                        {timeRange}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
} 