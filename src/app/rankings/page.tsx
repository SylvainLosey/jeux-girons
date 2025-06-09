import { RankingsView } from "~/app/_components/rankings-view";

export default function RankingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-6xl">
        <RankingsView />
      </div>
    </main>
  );
} 