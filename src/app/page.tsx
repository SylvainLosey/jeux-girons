"use client";

import { RankingsPreview } from "./_components/rankings-preview";
import { UnifiedSearch } from "./_components/unified-search";
import { api } from "~/trpc/react";

export default function HomePage() {
  // Check if any scores exist to conditionally show divider
  const { data: scores } = api.score.getAll.useQuery();
  const hasAnyScores = scores && scores.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="space-y-8">
          {/* Top 5 Rankings Preview */}
          <RankingsPreview />
          
          {/* Conditional Divider - only show if rankings are displayed */}
          {hasAnyScores && (
            <div className="border-t border-border/50"></div>
          )}
          
          {/* Unified Search */}
          <UnifiedSearch />
        </div>
      </div>
    </main>
  );
}
