"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Group } from "~/app/_types/schedule-types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Search, Users } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatTime } from "~/app/_utils/date-utils";

export function PlanningView() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Fetch all groups
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  
  // Fetch the live schedule
  const { data: liveSchedule, isLoading: isLoadingLive } = api.schedule.getLive.useQuery();

  // Handle selecting a group
  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSearchOpen(false);
  };

  return (
    <div className="container mx-auto px-4 pt-0 pb-4">
      {/* Search bar (simplified) */}
      <div className="relative max-w-md mx-auto mb-8">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="Rechercher une jeunesse..." 
              onFocus={() => setSearchOpen(true)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {searchOpen && (
            <CommandList className="absolute w-full bg-popover z-10 rounded-b-lg max-h-[300px] overflow-y-auto">
              <CommandEmpty>Aucune jeunesse trouvée</CommandEmpty>
              <CommandGroup>
                {isLoadingGroups ? (
                  <div className="p-2 text-sm text-center text-muted-foreground">
                    Chargement des jeunesses...
                  </div>
                ) : (
                  groups?.map((group) => (
                    <CommandItem 
                      key={group.id}
                      onSelect={() => handleSelectGroup(group)}
                      className="flex items-center"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>{group.name}</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </div>
      
      {/* Selected Group Schedule */}
      {selectedGroup ? (
        <div>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
            Horaire pour {selectedGroup.name}
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
      ) : (
        <div className="text-center p-6 bg-muted rounded-lg border">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Sélectionnez une Jeunesse</h3>
          <p className="text-muted-foreground">
            Utilisez la recherche ci-dessus pour trouver une jeunesse spécifique
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
            <Table>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow key={index} className={cn(
                    index % 2 === 0 ? "bg-muted/50" : ""
                  )}>
                    <TableCell className="py-2">
                      <div className="font-medium">
                        {entry.game.name}
                        {entry.round && entry.round > 1 ? ` (Tour ${entry.round})` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 whitespace-nowrap">
                      {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
} 