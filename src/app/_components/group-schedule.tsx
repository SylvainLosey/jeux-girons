import { Group, Schedule } from "../_types/schedule-types";
import { formatTime } from "../_utils/date-utils";

interface GroupScheduleProps {
  schedule: Schedule;
  groups: Group[];
}

export function GroupSchedule({ schedule, groups }: GroupScheduleProps) {
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Planning par Jeunesse ({groups.length} groupes)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map(group => {
          // Get all entries for this group, sorted by time
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
                        <span className="font-medium">
                          {entry.game.name}
                          {entry.round && entry.round > 1 ? ` (Tour ${entry.round})` : ''}
                        </span>
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
  );
} 