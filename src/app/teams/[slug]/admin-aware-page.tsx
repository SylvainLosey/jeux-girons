"use client";

import { Users } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { useAdmin } from "~/app/_components/navbar";
import { Group } from "~/app/_types/schedule-types";

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
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Users className="mr-3 h-8 w-8 text-gray-600" />
            {group.name}
          </h1>
          <p className="text-muted-foreground">
            Horaire détaillé pour cette jeunesse
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
            entity={group}
            viewType="team"
            showAdmin={isAdmin}
          />
        )}
      </div>
    </main>
  );
} 