import { Game, Group, Schedule } from "../_types/schedule-types";
import { formatTime } from "../_utils/date-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

interface ScheduleResultsProps {
  schedule: Schedule;
  groups: Group[];
}

export function ScheduleResults({ schedule, groups }: ScheduleResultsProps) {
  return (
    <div className="mt-6 space-y-8">
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Jeu</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGamesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                        Aucune affectation pour ce créneau.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedGamesData.map(({ game, groups }) => (
                      <TableRow key={game.id}>
                        <TableCell className="font-medium">
                          {game.name}
                          {slot.entries.find(entry => entry.game.id === game.id && entry.group.id === groups[0].id)?.round > 1 
                            ? ` (Tour ${slot.entries.find(entry => entry.game.id === game.id && entry.group.id === groups[0].id)?.round})` 
                            : ''}
                        </TableCell>
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
  );
} 