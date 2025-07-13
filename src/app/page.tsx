"use client";

import { useEffect } from "react";
import { RankingsPreview } from "./_components/rankings-preview";
import { GamesPreview } from "./_components/games-preview";
import { GroupsPreview } from "./_components/groups-preview";
import { analytics } from "~/lib/analytics";

export default function HomePage() {
  // Track home page view
  useEffect(() => {
    analytics.trackPageView("home");
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-16 max-w-4xl">
        <div className="space-y-8">
          {/* Top 5 Rankings Preview */}
          <RankingsPreview />

          {/* Groups Preview */}
          <div className="pt-4 md:pt-8">
            <GroupsPreview />
          </div>

            {/* Games Preview */}
          <div className="pt-4 md:pt-8">
            <GamesPreview />
          </div>
        </div>
      </div>
    </main>
  );
}
