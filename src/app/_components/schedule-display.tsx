"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

import { Schedule, TimeRange } from "../_types/schedule-types";
import { formatDateTime } from "../_utils/date-utils";
import { generateSchedule } from "../_utils/schedule-generator";
import { TimeRangeEditor } from "./time-range-editor";
import { ScheduleResults } from "./schedule-results";
import { GroupSchedule } from "./group-schedule";

export function ScheduleDisplay() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Parameter state variables with defaults
  const [gameDuration, setGameDuration] = useState(12);
  const [transitionTime, setTransitionTime] = useState(8);
  
  
  // Time ranges state (now with full datetime support)
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    {
      id: "plage-1",
      startTime: new Date(2025, 7, 9, 8, 40, 0), // 9 août 2025 à 08:40
      endTime: new Date(2025, 7, 9, 12, 0, 0),   // 9 août 2025 à 12:00
    },
    {
      id: "plage-2",
      startTime: new Date(2025, 7, 9, 13, 0, 0), // 9 août 2025 à 13:00
      endTime: new Date(2025, 7, 9, 18, 0, 0),   // 9 août 2025 à 18:00
    },
    {
      id: "plage-3",
      startTime: new Date(2025, 7, 10, 9, 0, 0), // 10 août 2025 à 09:00
      endTime: new Date(2025, 7, 10, 13, 0, 0),  // 10 août 2025 à 13:00
    }
  ]);

  // Fetch games and groups data using tRPC hooks
  const { data: games, isLoading: isLoadingGames, error: errorGames } = api.game.getAll.useQuery();
  const { data: groups, isLoading: isLoadingGroups, error: errorGroups } = api.group.getAll.useQuery();

  // Calculate the total time slot interval
  const timeSlotInterval = gameDuration + transitionTime;

  // Derive loading and error states
  const isLoading = isLoadingGames || isLoadingGroups;
  const fetchError = errorGames || errorGroups;

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
          formatDateTime,
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
      } catch (err) {
        console.error("Schedule generation error:", err);
        setScheduleError(`Erreur inattendue lors de la génération: ${err instanceof Error ? err.message : String(err)}`);
        setSchedule(null);
      } finally {
        setIsGenerating(false);
      }
    }, 100); // Short delay to allow UI updates
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Générateur d&apos;Horaire de Jeux</h1>
      
      {/* Config Section */}
      <div className="mb-6 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="game-duration" className="block text-sm font-medium mb-2">
              Durée du Jeu (minutes)
            </label>
            <input
              id="game-duration"
              type="number"
              min="1"
              value={gameDuration}
              onChange={handleGameDurationChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="transition-time" className="block text-sm font-medium mb-2">
              Temps de Transition (minutes)
            </label>
            <input
              id="transition-time"
              type="number"
              min="0"
              value={transitionTime}
              onChange={handleTransitionTimeChange}
              className="w-full p-2 border rounded-md"
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

        <TimeRangeEditor timeRanges={timeRanges} onUpdateTimeRanges={setTimeRanges} />
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
                {timeRanges.map((range) => (
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

      {/* Display states */}
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

      {/* Schedule Results Section */}
      {schedule && schedule.length > 0 && games && groups && (
        <>
          <ScheduleResults schedule={schedule} groups={groups} />
          <GroupSchedule schedule={schedule} groups={groups} />
        </>
      )}
    </div>
  );
} 