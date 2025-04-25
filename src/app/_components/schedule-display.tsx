"use client";

// src/app/_components/schedule-display.tsx
import { useState, useEffect } from "react";
import { Plus, Save, FileDown, FileUp, Calendar, CheckCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { TimeRange, SavedScheduleMetadata } from "~/app/_types/schedule-types";
import { TimeRangeEditor } from "~/app/_components/time-range-editor";
import { ScheduleResults } from "~/app/_components/schedule-results";
import { GroupSchedule } from "~/app/_components/group-schedule";
import { generateSchedule } from "~/app/_utils/schedule-generator";
import { formatTime } from "~/app/_utils/date-utils";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

// Fixed parameters
const GAME_DURATION_MINUTES = 12;
const TRANSITION_TIME_MINUTES = 8;

export function ScheduleDisplay() {
  // Default start date for August 9, 2025
  const defaultStartDate = new Date(2025, 7, 9); // Month is 0-indexed
  
  // Set up time ranges for August 9-10, 2025
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(() => {
    // Plage 1: Saturday August 9, 2025 08:40 - 12:00
    const range1Start = new Date(2025, 7, 9);
    range1Start.setHours(8, 40, 0, 0);
    const range1End = new Date(2025, 7, 9);
    range1End.setHours(12, 0, 0, 0);
    
    // Plage 2: Saturday August 9, 2025 13:00 - 18:00
    const range2Start = new Date(2025, 7, 9);
    range2Start.setHours(13, 0, 0, 0);
    const range2End = new Date(2025, 7, 9);
    range2End.setHours(18, 0, 0, 0);
    
    // Plage 3: Sunday August 10, 2025 09:00 - 12:00
    const range3Start = new Date(2025, 7, 10);
    range3Start.setHours(9, 0, 0, 0);
    const range3End = new Date(2025, 7, 10);
    range3End.setHours(12, 0, 0, 0);
    
    return [
      {
        id: uuidv4(),
        startTime: range1Start,
        endTime: range1End
      },
      {
        id: uuidv4(),
        startTime: range2Start,
        endTime: range2End
      },
      {
        id: uuidv4(),
        startTime: range3Start,
        endTime: range3End
      }
    ];
  });
  
  // Generated schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  
  // Queries for data
  const { data: groups } = api.group.getAll.useQuery();
  const { data: games } = api.game.getAll.useQuery();
  
  // Query for saved schedules - always enabled now
  const { data: savedSchedulesList, isLoading: isLoadingSchedules } = api.schedule.getAll.useQuery();
  
  // Query for the live schedule
  const { data: liveSchedule, isLoading: isLoadingLive } = api.schedule.getLive.useQuery();
  
  // Mutations
  const [isSaving, setIsSaving] = useState(false);
  const saveScheduleMutation = api.schedule.save.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast.success("Schedule saved successfully!");
      setSaveDialogOpen(false);
      // Refresh saved schedules list
      void fetchSavedSchedules();
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error(`Error saving schedule: ${error.message}`);
    }
  });
  
  const setLiveMutation = api.schedule.setLive.useMutation({
    onSuccess: () => {
      toast.success("Schedule set as live successfully!");
      // Refresh the schedules list
      void fetchSavedSchedules();
    },
    onError: (error) => {
      toast.error(`Error setting schedule as live: ${error.message}`);
    }
  });
  
  const deleteScheduleMutation = api.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted successfully!");
      // Refresh the schedules list
      void fetchSavedSchedules();
    },
    onError: (error) => {
      toast.error(`Error deleting schedule: ${error.message}`);
    }
  });
  
  // Get the query client once, at component initialization
  const utils = api.useUtils();
  
  // Update the fetchSavedSchedules function
  const fetchSavedSchedules = async () => {
    try {
      // Properly invalidate the queries
      await utils.schedule.getAll.invalidate();
      await utils.schedule.getLive.invalidate();
    } catch (error) {
      console.error("Error fetching saved schedules:", error);
      toast.error("Failed to refresh saved schedules");
    }
  };
  
  // Fetch a specific schedule by ID
  const fetchScheduleById = api.schedule.getById.useQuery;
  
  // Add a new time range
  const addTimeRange = () => {
    // Create a new time range 1 hour after the last one
    const lastRange = timeRanges[timeRanges.length - 1];
    const newStartTime = new Date(lastRange.endTime);
    newStartTime.setHours(newStartTime.getHours() + 1);
    
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + 4); // Default 4-hour window
    
    setTimeRanges([...timeRanges, {
      id: uuidv4(),
      startTime: newStartTime,
      endTime: newEndTime
    }]);
  };
  
  // Generate the schedule
  const handleGenerateSchedule = () => {
    setGenerationError(null);
    
    if (!groups || !games) {
      setGenerationError("Unable to generate schedule: missing groups or games data");
      return;
    }
    
    // Convert duration to milliseconds
    const gameDurationMs = GAME_DURATION_MINUTES * 60 * 1000;
    const transitionTimeMs = TRANSITION_TIME_MINUTES * 60 * 1000;
    
    // Generate the schedule with all groups and all games
    const result = generateSchedule(
      groups,
      games,
      defaultStartDate,
      formatTime,
      gameDurationMs,
      transitionTimeMs,
      timeRanges
    );
    
    if ('error' in result) {
      setGenerationError(result.error);
      setSchedule(null);
    } else {
      setSchedule(result);
      setGenerationError(null);
    }
  };
  
  // Handle saving the current schedule
  const handleSaveSchedule = () => {
    if (!schedule || !scheduleName || isSaving) return;
    
    // Set the local loading state
    setIsSaving(true);
    
    // Prepare the data for saving
    saveScheduleMutation.mutate({
      name: scheduleName,
      description: scheduleDescription,
      gameDurationMs: GAME_DURATION_MINUTES * 60 * 1000,
      transitionTimeMs: TRANSITION_TIME_MINUTES * 60 * 1000,
      timeRanges: timeRanges.map(range => ({
        startTime: range.startTime,
        endTime: range.endTime,
      })),
      schedule: schedule.map(slot => ({
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        entries: slot.entries.map(entry => ({
          groupId: entry.group.id,
          gameId: entry.game.id,
          round: entry.round || 1,
        }))
      }))
    });
  };
  
  // Load a saved schedule
  const handleLoadSchedule = async (scheduleId: number) => {
    try {
      const savedSchedule = await fetchScheduleById({ id: scheduleId });
      
      // Set the time ranges from the saved schedule
      setTimeRanges(savedSchedule.timeRanges);
      setSchedule(savedSchedule.schedule);
      
      // Close the dialog
      setLoadDialogOpen(false);
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  };
  
  // Set a schedule as live
  const handleSetLive = (scheduleId: number) => {
    setLiveMutation.mutate({ id: scheduleId });
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) {
      deleteScheduleMutation.mutate({ id: scheduleId });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Schedule Manager</h1>
      
      {/* Saved Schedules List */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Saved Schedules</h2>
        
        {isLoadingSchedules ? (
          <div className="flex justify-center">
            <p>Loading saved schedules...</p>
          </div>
        ) : !savedSchedulesList || savedSchedulesList.length === 0 ? (
          <Alert className="mb-6">
            <AlertDescription>No saved schedules found. Generate and save a schedule below.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedSchedulesList.map(schedule => (
              <Card key={schedule.id} className={schedule.isLive ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{schedule.name}</CardTitle>
                      <CardDescription>{schedule.description || "No description"}</CardDescription>
                    </div>
                    {schedule.isLive && (
                      <Badge variant="default" className="bg-primary">
                        <CheckCircle className="h-3 w-3 mr-1" /> Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(schedule.createdAt).toLocaleString()}
                  </p>
                  <div className="flex justify-between mt-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{schedule.slotCount || 0}</span> slots
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 justify-end">
                  {!schedule.isLive && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      Delete
                    </Button>
                  )}
                  
                  {!schedule.isLive && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleSetLive(schedule.id)}
                    >
                      Set as Live
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <div className="divider my-8 border-t"></div>
      
      {/* Live Schedule Display - If there is one */}
      {liveSchedule && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-primary" />
            Live Schedule: {liveSchedule.name}
          </h2>
          <p className="mb-4 text-muted-foreground">{liveSchedule.description}</p>
          
          <ScheduleResults 
            schedule={liveSchedule.schedule} 
            groups={groups || []}
          />
          
          <GroupSchedule 
            schedule={liveSchedule.schedule} 
            groups={groups || []}
          />
        </div>
      )}
      
      <div className="divider my-8 border-t"></div>
      
      {/* Schedule Generator Section */}
      <h2 className="text-2xl font-semibold mb-6">Generate New Schedule</h2>
      
      {/* Schedule Time Ranges */}
      <div className="space-y-6 mb-8 p-6 border rounded-lg bg-card">
        <h3 className="text-xl font-semibold mb-4">Schedule Parameters</h3>
        
        {/* Time Ranges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Available Time Ranges</Label>
            <Button
              type="button"
              variant="outline"
              onClick={addTimeRange}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Range
            </Button>
          </div>
          <TimeRangeEditor 
            timeRanges={timeRanges} 
            onUpdateTimeRanges={setTimeRanges}
          />
        </div>
      </div>
      
      {/* Generate Button */}
      <div className="flex justify-center mb-8">
        <Button 
          onClick={handleGenerateSchedule}
          size="lg"
          className="w-full md:w-1/2 flex items-center justify-center gap-2"
        >
          <Calendar className="h-5 w-5" />
          Generate Schedule
        </Button>
      </div>
      
      {/* Generation Error */}
      {generationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}
      
      {/* Schedule Results */}
      {schedule && schedule.length > 0 && (
        <>
          <ScheduleResults 
            schedule={schedule} 
            groups={groups || []}
          />
          
          <GroupSchedule 
            schedule={schedule} 
            groups={groups || []}
          />
          
          {/* Save button only for newly generated schedule */}
          <div className="mt-6 flex justify-center">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex items-center gap-2 w-full md:w-1/2">
                  <Save className="h-4 w-4" />
                  Save Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Schedule</DialogTitle>
                  <DialogDescription>
                    Enter a name and optional description for your schedule.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Schedule Name</Label>
                    <Input
                      id="name"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      placeholder="Enter a name for this schedule"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={scheduleDescription}
                      onChange={(e) => setScheduleDescription(e.target.value)}
                      placeholder="Add any notes about this schedule"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveSchedule}
                  disabled={isSaving || !scheduleName}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin mr-2">◌</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Export Button */}
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 w-full md:w-1/2"
              onClick={() => {
                const json = JSON.stringify(schedule, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = `schedule-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
              }}
            >
              <FileDown className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </>
      )}
    </div>
  );
}