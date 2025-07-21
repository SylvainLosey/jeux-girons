"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Search, Users, Gamepad2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UnifiedScheduleView } from "./unified-schedule-view";
import { useAdmin } from "./navbar";
import { TotalPointsBadge } from "~/components/ui/total-points-badge";

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

  // Get admin status
  const { isAdmin } = useAdmin();

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
      {isAdmin && (
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
                  className="flex h-11 w-full py-3 bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
              
              {groupSearchFocused && (
                <div className="absolute w-full z-10 border border-t-0 rounded-b-lg shadow-md bg-popover">
                  <ul className="max-h-[300px] overflow-y-auto py-1">
                    {isLoadingGroups ? (
                      <li className="px-2 py-3 text-sm text-center text-slate-500">
                        Chargement des jeunesses...
                      </li>
                    ) : !groups?.length ? (
                      <li className="px-2 py-3 text-sm text-center text-slate-500">
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
                  className="flex h-11 w-full py-3 bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
              
              {gameSearchFocused && (
                <div className="absolute w-full z-10 border border-t-0 rounded-b-lg shadow-md bg-popover">
                  <ul className="max-h-[300px] overflow-y-auto py-1">
                    {isLoadingGames ? (
                      <li className="px-2 py-3 text-sm text-center text-slate-500">
                        Chargement des jeux...
                      </li>
                    ) : !games?.length ? (
                      <li className="px-2 py-3 text-sm text-center text-slate-500">
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
      )}
      
      {/* Selected Group Schedule */}
      {selectedGroup && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-3 oriental-title">
            <Users className="h-5 w-5 text-oriental-accent" />
            {selectedGroup.name}
            <TotalPointsBadge groupId={selectedGroup.id} showRankingAward={true} />
          </h2>
          
          {isLoadingLive ? (
            <div className="text-center p-4">Chargement de l&apos;horaire...</div>
          ) : !liveSchedule ? (
            <Alert className="mb-6">
              <AlertDescription>Aucun horaire actif n&apos;est disponible actuellement.</AlertDescription>
            </Alert>
          ) : (
            <div className="mt-4">
              <UnifiedScheduleView 
                schedule={liveSchedule.schedule}
                entity={selectedGroup}
                viewType="team"
                showAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Selected Game Schedule */}
      {selectedGame && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center oriental-title">
            <Gamepad2 className="mr-2 h-5 w-5 text-oriental-accent" />
            {selectedGame.name}
          </h2>
          
          {/* Add game description if available */}
          {selectedGame.description && (
            <p className="mb-4 text-slate-500">{selectedGame.description}</p>
          )}
          
          {isLoadingLive ? (
            <div className="text-center p-4">Chargement de l&apos;horaire...</div>
          ) : !liveSchedule ? (
            <Alert className="mb-6">
              <AlertDescription>Aucun horaire actif n&apos;est disponible actuellement.</AlertDescription>
            </Alert>
          ) : (
            <div className="mt-4">
              <UnifiedScheduleView 
                schedule={liveSchedule.schedule}
                entity={selectedGame}
                viewType="game"
                showAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      )}
      
      {/* No selection state for admins */}
      {!selectedGroup && !selectedGame && isAdmin && (
        <div className="text-center p-5 bg-muted rounded-lg border">
          <div className="flex justify-center space-x-3 mb-3">
            <Users className="h-8 w-8 text-slate-500" />
            <Gamepad2 className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">Sélectionnez une Jeunesse ou un Jeu</h3>
          <p className="text-slate-500 text-sm">
            Utilisez la recherche ci-dessus pour consulter l&apos;horaire par jeunesse ou par jeu
          </p>
        </div>
      )}
    </div>
  );
} 