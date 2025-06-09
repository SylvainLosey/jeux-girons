import { RankingsPreview } from "./_components/rankings-preview";
import { UnifiedSearch } from "./_components/unified-search";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-4xl">
        <div className="space-y-8">
          {/* Top 5 Rankings Preview */}
          <RankingsPreview />
          
          {/* Divider */}
          <div className="border-t border-border/50"></div>
          
          {/* Unified Search */}
          <UnifiedSearch />
        </div>
      </div>
    </main>
  );
}
