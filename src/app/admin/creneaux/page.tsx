"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, ArrowLeft, ArrowRight, ClipboardList, Users, Gamepad2, Navigation } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { ScoreDisplay, ScoreProvider } from "~/components/ui/score-display";
import { api } from "~/trpc/react";
import { useAdmin } from "~/app/_components/navbar";
import { formatTime, formatDate } from "~/app/_utils/date-utils";

export default function AdminCreneauxPage() {
  const router = useRouter();
  const { isAdmin, isLoading } = useAdmin();
  const [currentCreneauIndex, setCurrentCreneauIndex] = useState<number>(0);
  
  // Redirect if not admin (but wait for loading to complete)
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isLoading, router]);

  const { data: creneauxData, isLoading: isLoadingCreneaux, error } = api.schedule.getCreneauxForAdmin.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  const utils = api.useUtils();
  
  const handleScoreUpdated = () => {
    // Invalidate the creneaux query to refresh completion status
    utils.schedule.getCreneauxForAdmin.invalidate();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oriental-gold mx-auto mb-4"></div>
          <p className="text-lg">Vérification de l'authentification...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (isLoadingCreneaux) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oriental-gold mx-auto mb-4"></div>
          <p className="text-lg">Chargement des créneaux...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Erreur lors du chargement des créneaux: {error.message}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!creneauxData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Aucun horaire actif trouvé. Veuillez créer et activer un horaire d'abord.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const { schedule, creneaux } = creneauxData;
  
  // Get the current créneau
  const currentCreneau = creneaux[currentCreneauIndex];
  
  // Group créneaux by date
  const groupCreneauxByDate = () => {
    const grouped = creneaux.reduce((acc, creneau, index) => {
      const date = new Date(creneau.startTime);
      const dateKey = date.toDateString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: date,
          creneaux: []
        };
      }
      
      acc[dateKey].creneaux.push({ ...creneau, originalIndex: index });
      return acc;
    }, {} as Record<string, { date: Date; creneaux: Array<typeof creneaux[0] & { originalIndex: number }> }>);
    
    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  
  const groupedCreneaux = groupCreneauxByDate();
  
  // Navigation functions
  const goToPreviousCreneau = () => {
    setCurrentCreneauIndex(prev => Math.max(0, prev - 1));
  };
  
  const goToNextCreneau = () => {
    setCurrentCreneauIndex(prev => Math.min(creneaux.length - 1, prev + 1));
  };
  
  if (!currentCreneau) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Aucun créneau disponible.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <ScoreProvider>
      <main className="flex min-h-screen flex-col bg-oriental-warm">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8 pt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="rounded-full bg-oriental-gold/10 p-3">
                <ClipboardList className="h-8 w-8 text-oriental-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-bold oriental-title">
                  Gestion des Scores
                </h1>
                <p className="text-lg text-muted-foreground">
                  Gérez les scores par tour
                </p>
              </div>
            </div>

            {/* Navigation créneaux */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={goToPreviousCreneau}
                disabled={currentCreneauIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Précédent
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {currentCreneauIndex + 1} / {creneaux.length}
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={goToNextCreneau}
                disabled={currentCreneauIndex === creneaux.length - 1}
                className="flex items-center gap-2"
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Créneau actuel */}
          <Card
            className={`border-2 mb-8 ${
              currentCreneau.isComplete 
                ? "border-green-500 bg-green-50" 
                : "border-oriental-gold/30"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${
                    currentCreneau.isComplete 
                      ? "bg-green-500 text-white" 
                      : "bg-oriental-gold/10 text-oriental-gold"
                  }`}>
                    {currentCreneau.isComplete ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Clock className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      Créneau {currentCreneau.slotIndex}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {formatTime(currentCreneau.startTime)} - {formatTime(currentCreneau.endTime)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={currentCreneau.isComplete ? "default" : "secondary"}
                    className={`text-sm ${
                      currentCreneau.isComplete 
                        ? "bg-green-600 text-white" 
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {currentCreneau.completedCount} / {currentCreneau.totalCount} complété
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {currentCreneau.games.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Aucun jeu programmé pour ce créneau.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {currentCreneau.games.map((gameEntry, gameIndex) => (
                    <div
                      key={gameIndex}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        gameEntry.hasScore 
                          ? "border-green-300 bg-green-50" 
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-5 w-5 text-oriental-accent" />
                          <span className="font-medium">{gameEntry.game.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{gameEntry.group.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <ScoreDisplay
                          groupId={gameEntry.groupId}
                          gameId={gameEntry.gameId}
                          round={gameEntry.round}
                          groupName={gameEntry.group.name}
                          gameName={gameEntry.game.name}
                          showAdmin={true}
                          onScoreUpdated={handleScoreUpdated}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-muted-foreground italic text-center">
                💡 Veuillez entrer également les scores de 0 points
              </p>
            </div>
          </Card>

          {/* Navigation rapide simplifiée */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Navigation rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                {groupedCreneaux.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                      {formatDate(group.date)}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {group.creneaux.map((creneau) => (
                        <Button
                          key={creneau.originalIndex}
                          variant={creneau.originalIndex === currentCreneauIndex ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentCreneauIndex(creneau.originalIndex)}
                          className={`flex items-center gap-2 relative ${
                            creneau.originalIndex === currentCreneauIndex
                              ? creneau.isComplete
                                ? "bg-green-600 hover:bg-green-700 text-white border-green-600 ring-2 ring-green-300 ring-offset-2"
                                : "bg-oriental-gold hover:bg-oriental-gold-dark text-white ring-2 ring-oriental-gold/50 ring-offset-2"
                              : creneau.isComplete 
                              ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                              : "border-oriental-gold/30 text-oriental-gold hover:bg-oriental-gold/10"
                          }`}
                        >
                          {creneau.isComplete && <CheckCircle2 className="h-4 w-4" />}
                          {formatTime(creneau.startTime)}
                          {creneau.originalIndex === currentCreneauIndex && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </ScoreProvider>
  );
} 