"use client";

import { Gamepad2 } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { useAdmin } from "~/app/_components/navbar";
import { Game } from "~/app/_types/schedule-types";
import { ScoreProvider } from "~/components/ui/score-display";
import { analytics } from "~/lib/analytics";
import { createSlug } from "~/app/_utils/slug-utils";

interface LiveSchedule {
  schedule: unknown;
}

interface AdminAwareGamePageProps {
  game: Game;
  liveSchedule: LiveSchedule | null;
}

export function AdminAwareGamePage({ game, liveSchedule }: AdminAwareGamePageProps) {
  const { isAdmin } = useAdmin();

  // Track game page view
  useEffect(() => {
    const gameSlug = createSlug(game.name);
    analytics.trackGameView(gameSlug);
  }, [game.name]);

  return (
    <ScoreProvider>
      <main className="flex min-h-screen flex-col items-center pt-8">
        <div className="container mx-auto px-4 pb-4 max-w-4xl">
          <div className="mb-6">
            {/* Game Header - Responsive Layout */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
              {/* Game Image */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-48 h-48 object-cover rounded-lg border border-border shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 border border-border rounded-lg flex items-center justify-center shadow-sm">
                    <Gamepad2 className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Game Details */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <h1 className="text-3xl font-bold oriental-title flex items-center justify-center md:justify-start gap-3">
                  <Gamepad2 className="h-8 w-8 text-oriental-accent" />
                  <span className="text-oriental-accent">{game.name}</span>
                </h1>
                {game.description && (
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {game.description}
                  </p>
                )}
                
                {/* Number of Groups Badge */}
                <div className="flex justify-center md:justify-start">
                  <Badge 
                    variant="secondary" 
                    className={`font-semibold px-3 py-1 ${
                      game.numberOfGroups === 1 
                        ? "bg-yellow-600 text-yellow-100" 
                        : game.numberOfGroups === 2
                        ? "bg-yellow-400 text-yellow-900"
                        : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {game.numberOfGroups === 1 
                      ? "1 jeunesse" 
                      : `${game.numberOfGroups} jeunesses`}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {!liveSchedule ? (
            <Alert>
              <AlertDescription>
                Aucun horaire actif n&apos;est disponible actuellement.
              </AlertDescription>
            </Alert>
          ) : (
            <UnifiedScheduleView 
              schedule={liveSchedule.schedule}
              entity={game}
              viewType="game"
              showAdmin={isAdmin}
            />
          )}
        </div>
      </main>
    </ScoreProvider>
  );
} 