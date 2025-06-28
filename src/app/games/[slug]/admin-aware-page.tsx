"use client";

import { Gamepad2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { useAdmin } from "~/app/_components/navbar";
import { Game } from "~/app/_types/schedule-types";

interface LiveSchedule {
  schedule: unknown;
}

interface AdminAwareGamePageProps {
  game: Game;
  liveSchedule: LiveSchedule | null;
}

export function AdminAwareGamePage({ game, liveSchedule }: AdminAwareGamePageProps) {
  const { isAdmin } = useAdmin();

  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Gamepad2 className="mr-3 h-8 w-8 text-gray-600" />
            {game.name}
          </h1>
          {game.description && (
            <p className="text-muted-foreground text-lg mb-2">
              {game.description}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Horaire détaillé pour ce jeu
          </p>
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
  );
} 