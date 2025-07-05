"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Users } from "lucide-react";

// Helper function to create URL-friendly slugs
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

export function GroupsPreview() {
  // Fetch all groups
  const { data: groups, isLoading, error } = api.group.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-oriental-gold" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Horaires par Jeunesse</h2>
        </div>
        <div className="text-center p-8 text-muted-foreground">
          Chargement des jeunesses...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-oriental-gold" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Horaires par Jeunesse</h2>
        </div>
        <Alert>
          <AlertDescription>Impossible de charger les jeunesses: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-oriental-gold" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Horaires par Jeunesse</h2>
        </div>
        <Alert>
          <AlertDescription>Aucune jeunesse disponible pour le moment.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Sort groups alphabetically (they should already be sorted from the API, but let's be sure)
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-oriental-gold" />
        <h2 className="text-xl font-semibold oriental-subtitle">Les Horaires par Jeunesse</h2>
      </div>
      
      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
        {sortedGroups.map((group) => {
          const groupSlug = createSlug(group.name);
          
          return (
            <Link 
              key={group.id} 
              href={`/teams/${groupSlug}`}
              className="block p-1 text-left font-medium text-slate-900 dark:text-slate-100 hover:text-oriental-gold hover:bg-oriental-gold/5 transition-colors rounded border border-border/30 hover:border-oriental-gold/30"
            >
              {group.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
} 