"use client";

import { RankingsPreview } from "./_components/rankings-preview";
import { GamesPreview } from "./_components/games-preview";
import { GroupsPreview } from "./_components/groups-preview";

export default function HomePage() {

  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-16 max-w-4xl">
        <div className="space-y-8">
          {/* Top 5 Rankings Preview */}
          <RankingsPreview />
          
          {/* Games Preview */}
          <GamesPreview />
          
          {/* Groups Preview */}
          <GroupsPreview />
        </div>
      </div>
    </main>
  );
}
