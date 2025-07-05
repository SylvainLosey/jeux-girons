"use client";

// src/app/_components/schedule-display.tsx
import { useState, useEffect } from "react";
import { Plus, Save, Calendar, CheckCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { TimeRange, Schedule } from "~/app/_types/schedule-types";
import { TimeRangeEditor } from "~/app/_components/time-range-editor";
import { ScheduleResults } from "~/app/_components/schedule-results";
import { ScheduleValidation } from "~/app/_components/schedule-validation";
import { generateSchedule } from "~/app/_utils/schedule-generator";
import { formatTime } from "~/app/_utils/date-utils";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

// Fixed parameters
const GAME_DURATION_MINUTES = 12;
const TRANSITION_TIME_MINUTES = 8;

export function ScheduleDisplay() {
  // Default start date for August 9, 2025
  const defaultStartDate = new Date(2025, 7, 9); // Month is 0-indexed
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("manage");
  
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
  
  // Dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editScheduleId, setEditScheduleId] = useState<number | null>(null);
  const [editScheduleName, setEditScheduleName] = useState("");
  const [editScheduleDescription, setEditScheduleDescription] = useState("");
  
  // Queries for data
  const { data: groups } = api.group.getAll.useQuery();
  const { data: games } = api.game.getAll.useQuery();
  const { data: savedSchedulesList, isLoading: isLoadingSchedules } = api.schedule.getAll.useQuery();
  const { data: liveSchedule } = api.schedule.getLive.useQuery();
  
  // Get the query client for invalidations
  const utils = api.useUtils();
  
  // Invalidate queries helper
  const refreshData = async () => {
    try {
      await utils.schedule.getAll.invalidate();
      await utils.schedule.getLive.invalidate();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Échec de l'actualisation des données");
    }
  };
  
  // Mutations
  const [isSaving, setIsSaving] = useState(false);
  
  const saveScheduleMutation = api.schedule.save.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast.success("Planning enregistré avec succès !");
      setSaveDialogOpen(false);
      
      // Reset state and switch tabs
      setSchedule(null);
      setScheduleName("");
      setScheduleDescription("");
      void refreshData();
      setActiveTab("manage");
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error(`Erreur lors de l'enregistrement du planning : ${error.message}`);
    }
  });
  
  const setLiveMutation = api.schedule.setLive.useMutation({
    onSuccess: () => {
      toast.success("Planning défini comme actif avec succès !");
      void refreshData();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la définition du planning comme actif : ${error.message}`);
    }
  });
  
  const deleteScheduleMutation = api.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Planning supprimé avec succès !");
      void refreshData();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression du planning : ${error.message}`);
    }
  });
  
  const updateScheduleMutation = api.schedule.update.useMutation({
    onSuccess: () => {
      toast.success("Planning mis à jour avec succès !");
      setEditDialogOpen(false);
      void refreshData();
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour du planning : ${error.message}`);
    }
  });
  
  // Schedule operations
  const addTimeRange = () => {
    const lastRange = timeRanges[timeRanges.length - 1];
    if (!lastRange) {
      // If no existing ranges, create a default one
      const defaultStart = new Date(defaultStartDate);
      defaultStart.setHours(9, 0, 0, 0);
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(13, 0, 0, 0);
      
      setTimeRanges([...timeRanges, {
        id: uuidv4(),
        startTime: defaultStart,
        endTime: defaultEnd
      }]);
      return;
    }
    
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
  
  const handleGenerateSchedule = () => {
    setGenerationError(null);
    
    if (!groups || !games) {
      setGenerationError("Impossible de générer le planning : données des groupes ou jeux manquantes");
      return;
    }
    
    // Convert duration to milliseconds
    const gameDurationMs = GAME_DURATION_MINUTES * 60 * 1000;
    const transitionTimeMs = TRANSITION_TIME_MINUTES * 60 * 1000;
    
    // Generate the schedule
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
  
  const handleSaveSchedule = () => {
    if (!schedule || !scheduleName || isSaving) return;
    
    setIsSaving(true);
    
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
          round: entry.round ?? 1,
          isSecondChance: entry.isSecondChance ?? false,
        }))
      }))
    });
  };
  
  const handleDeleteSchedule = (scheduleId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce planning ? Cette action est irréversible.")) {
      deleteScheduleMutation.mutate({ id: scheduleId });
    }
  };

  const handleEditSchedule = (schedule: NonNullable<typeof savedSchedulesList>[0]) => {
    setEditScheduleId(schedule.id);
    setEditScheduleName(schedule.name);
    setEditScheduleDescription(schedule.description ?? "");
    setEditDialogOpen(true);
  };
  
  const handleSaveEdits = () => {
    if (!editScheduleId || !editScheduleName) return;
    
    updateScheduleMutation.mutate({
      id: editScheduleId,
      name: editScheduleName,
      description: editScheduleDescription
    });
  };
  
  const handleSetLive = (scheduleId: number) => {
    setLiveMutation.mutate({ id: scheduleId });
  };
  
  // Reset schedule when switching to New Schedule tab
  useEffect(() => {
    if (activeTab === "new") {
      setSchedule(null);
      setGenerationError(null);
      setScheduleName("");
      setScheduleDescription("");
    }
  }, [activeTab]);

  // In the ScheduleDisplay function, add new state
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<typeof liveSchedule | null>(null);
  const [isLoadingScheduleDetails, setIsLoadingScheduleDetails] = useState(false);

  // After fetching the live schedule, set it as the default selection
  useEffect(() => {
    if (liveSchedule && !selectedScheduleId) {
      setSelectedScheduleId(liveSchedule.id);
      setSelectedSchedule(liveSchedule);
    }
  }, [liveSchedule, selectedScheduleId]);

  // Add a function to handle schedule selection
  const handleSelectSchedule = async (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    
    // If the selected schedule is the live one, use it directly
    if (liveSchedule && liveSchedule.id === scheduleId) {
      setSelectedSchedule(liveSchedule);
      return;
    }
    
    // Otherwise, fetch the selected schedule details
    setIsLoadingScheduleDetails(true);
    try {
      const result = await utils.schedule.getById.fetch({ id: scheduleId });
      setSelectedSchedule(result);
    } catch (error) {
      console.error("Error fetching schedule details:", error);
      toast.error("Échec du chargement des détails du planning");
    } finally {
      setIsLoadingScheduleDetails(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 oriental-title">Gestion des Plannings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="manage">Gérer les Plannings</TabsTrigger>
          <TabsTrigger value="new">Nouveau Planning</TabsTrigger>
        </TabsList>
        
        {/* Manage Schedules Tab */}
        <TabsContent value="manage" className="space-y-8">
          {/* Saved Schedules List */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Plannings Enregistrés</h2>
            
            {isLoadingSchedules ? (
              <div className="flex justify-center">
                <p>Chargement des plannings enregistrés...</p>
              </div>
            ) : !savedSchedulesList || savedSchedulesList.length === 0 ? (
              <Alert className="mb-6">
                <AlertDescription>
                  Aucun planning enregistré trouvé. Créez un nouveau planning en utilisant l'onglet "Nouveau Planning".
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedSchedulesList.map(schedule => (
                  <Card 
                    key={schedule.id} 
                    className={cn(
                      "cursor-pointer transition-all",
                      schedule.isLive ? "border-primary" : "",
                      selectedScheduleId === schedule.id ? "ring-2 ring-primary shadow-lg" : ""
                    )}
                    onClick={() => handleSelectSchedule(schedule.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{schedule.name}</CardTitle>
                          <CardDescription>{schedule.description ?? "Aucune description"}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          {schedule.isLive && (
                            <Badge variant="default" className="bg-primary">
                              <CheckCircle className="h-3 w-3 mr-1" /> Actif
                            </Badge>
                          )}
                          {selectedScheduleId === schedule.id && schedule.id !== liveSchedule?.id && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Sélectionné
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-500">
                        Créé le : {new Date(schedule.createdAt).toLocaleString()}
                      </p>
                      <div className="flex justify-between mt-2">
                        <div className="text-sm text-slate-500">
                          <span className="font-medium">{schedule.slotCount ?? 0}</span> créneaux
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSchedule(schedule);
                        }}
                      >
                        Modifier
                      </Button>
                      
                      {!schedule.isLive && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSchedule(schedule.id);
                          }}
                        >
                          Supprimer
                        </Button>
                      )}
                      
                      {!schedule.isLive && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetLive(schedule.id);
                          }}
                        >
                          Définir comme actif
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="divider my-8 border-t"></div>
          
          {/* Selected Schedule Display */}
          {selectedSchedule ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                {selectedSchedule.isLive ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                ) : null}
                Planning {selectedSchedule.isLive ? "Actif" : "Sélectionné"} : {selectedSchedule.name}
              </h2>
              <p className="mb-4 text-slate-500">{selectedSchedule.description}</p>
              
              {/* Schedule Validation */}
              <ScheduleValidation 
                schedule={selectedSchedule.schedule}
                groups={groups || []}
                games={games || []}
              />
              
              <ScheduleResults 
                schedule={selectedSchedule.schedule} 
                groups={groups || []}
              />
            </div>
          ) : isLoadingScheduleDetails ? (
            <div className="text-center py-8">
              <p>Chargement des détails du planning...</p>
            </div>
          ) : null}
        </TabsContent>
        
        {/* New Schedule Tab */}
        <TabsContent value="new" className="space-y-8">
          {/* Schedule Parameters */}
          <div className="space-y-6 p-6 border rounded-lg bg-card">
            <h2 className="text-2xl font-semibold mb-4">Paramètres du Planning</h2>
            
            {/* Time Ranges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Plages Horaires Disponibles</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTimeRange}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Ajouter une Plage
                </Button>
              </div>
              <TimeRangeEditor 
                timeRanges={timeRanges} 
                onUpdateTimeRanges={setTimeRanges}
              />
            </div>
            
            {/* Generate Button */}
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleGenerateSchedule}
                size="lg"
                className="w-full sm:w-1/2 flex items-center justify-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                Générer le Planning
              </Button>
            </div>
            
            {/* Generation Error */}
            {generationError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{generationError}</AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Generated Schedule Results */}
          {schedule && schedule.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Planning Généré</h2>
              
              {/* Schedule Validation */}
              <ScheduleValidation 
                schedule={schedule}
                groups={groups || []}
                games={games || []}
              />
              
              <ScheduleResults 
                schedule={schedule} 
                groups={groups || []}
              />
              
              {/* Save button for newly generated schedule */}
              <div className="flex justify-center mt-8">
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="flex items-center gap-2 w-full sm:w-1/2">
                      <Save className="h-4 w-4" />
                      Enregistrer le Planning
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enregistrer le Planning</DialogTitle>
                      <DialogDescription>
                        Entrez un nom et une description optionnelle pour votre planning.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nom du Planning</Label>
                        <Input
                          id="name"
                          value={scheduleName}
                          onChange={(e) => setScheduleName(e.target.value)}
                          placeholder="Entrez un nom pour ce planning"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description (optionnelle)</Label>
                        <Textarea
                          id="description"
                          value={scheduleDescription}
                          onChange={(e) => setScheduleDescription(e.target.value)}
                          placeholder="Ajoutez des notes sur ce planning"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleSaveSchedule}
                      disabled={!scheduleName || isSaving}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Enregistrement..." : "Enregistrer le Planning"}
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Planning</DialogTitle>
            <DialogDescription>
              Mettez à jour le nom et la description de ce planning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom du Planning</Label>
              <Input
                id="edit-name"
                value={editScheduleName}
                onChange={(e) => setEditScheduleName(e.target.value)}
                placeholder="Entrez un nom pour ce planning"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (optionnelle)</Label>
              <Textarea
                id="edit-description"
                value={editScheduleDescription}
                onChange={(e) => setEditScheduleDescription(e.target.value)}
                placeholder="Ajoutez des notes sur ce planning"
              />
            </div>
          </div>
          <Button 
            onClick={handleSaveEdits}
            disabled={!editScheduleName}
            className="w-full flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Enregistrer les Modifications
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}