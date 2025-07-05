"use client";

import { Users } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { useAdmin } from "~/app/_components/navbar";
import { Group } from "~/app/_types/schedule-types";
import { ScoreProvider } from "~/components/ui/score-display";
import { TotalPointsBadge } from "~/components/ui/total-points-badge";

interface LiveSchedule {
  schedule: unknown;
}

interface AdminAwareTeamPageProps {
  group: Group;
  liveSchedule: LiveSchedule | null;
}

export function AdminAwareTeamPage({ group, liveSchedule }: AdminAwareTeamPageProps) {
  const { isAdmin } = useAdmin();

  return (
    <ScoreProvider>
      <main className="flex min-h-screen flex-col items-center pt-8">
        <div className="container mx-auto px-4 pb-4 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-4 oriental-title">
              <Users className="h-8 w-8 text-oriental-accent" />
              {group.name}
              <TotalPointsBadge groupId={group.id} showRankingAward={true} />
            </h1>
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
              entity={group}
              viewType="team"
              showAdmin={isAdmin}
            />
          )}
        </div>
      </main>
    </ScoreProvider>
  );
} 