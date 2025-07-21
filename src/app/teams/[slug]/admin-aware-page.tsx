"use client";

import { Users, Share } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { useAdmin } from "~/app/_components/navbar";
import { Group } from "~/app/_types/schedule-types";
import { ScoreProvider } from "~/components/ui/score-display";
import { TotalPointsBadge } from "~/components/ui/total-points-badge";
import { createSlug } from "~/app/_utils/slug-utils";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { track } from "@vercel/analytics";

interface LiveSchedule {
  schedule: unknown;
}

interface AdminAwareTeamPageProps {
  group: Group;
  liveSchedule: LiveSchedule | null;
}

export function AdminAwareTeamPage({ group, liveSchedule }: AdminAwareTeamPageProps) {
  const { isAdmin } = useAdmin();
  const pathname = usePathname();

  // Track team page view
  useEffect(() => {
    const teamSlug = createSlug(group.name);
  }, [group.name]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.origin + pathname : pathname;
    const shareData = {
      title: group.name + " - Horaire",
      text: `Consultez l'horaire détaillé de la jeunesse ${group.name}`,
      url,
    };
    if (navigator.share) {
      try {
        // Add analytics event for share button
        track("share_clicked", { context: "team", name: group.name });
        await navigator.share(shareData);
        toast.success("Lien partagé !");
      } catch (err) {
        // User cancelled or error
      }
    } else {
      try {
        // Add analytics event for share button
        track("share_clicked", { context: "team", name: group.name });
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papier !");
      } catch (err) {
        toast.error("Impossible de copier le lien");
      }
    }
  };

  return (
    <ScoreProvider>
      <main className="flex min-h-screen flex-col items-center pt-8">
        <div className="container mx-auto px-4 pb-4 max-w-4xl">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-between">
              <h1 className="text-3xl font-bold oriental-title flex items-center gap-4">
                <Users className="h-8 w-8 text-oriental-accent" />
                {group.name}
                <TotalPointsBadge groupId={group.id} showRankingAward={true} />
              </h1>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="border-oriental-accent text-oriental-accent bg-transparent hover:bg-oriental-accent/10 hover:border-oriental-accent focus-visible:ring-oriental-accent md:mt-0 mt-2 w-full md:w-auto"
              >
                <Share className="h-4 w-4" />
                Partager
              </Button>
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