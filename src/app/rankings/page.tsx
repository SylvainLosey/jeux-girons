"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RankingsView } from "~/app/_components/rankings-view";
import { useSettings } from "~/app/_components/navbar";
import { useAdmin } from "~/app/_components/navbar";

export default function RankingsPage() {
  const { showScoresPublicly } = useSettings();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if scores are hidden for public users and user is not admin
    if (!isAdmin && !showScoresPublicly) {
      router.push("/");
    }
  }, [isAdmin, showScoresPublicly, router]);

  // Don't render anything if redirecting
  if (!isAdmin && !showScoresPublicly) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center pt-8">
      <div className="container mx-auto px-4 pb-4 max-w-6xl">
        <RankingsView />
      </div>
    </main>
  );
} 