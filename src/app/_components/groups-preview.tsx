"use client";

import Link from "next/link";
import { Users, Users2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { createSlug } from "~/app/_utils/slug-utils";

export function GroupsPreview() {
  // Fetch all groups
  const { data: groups, isLoading, error } = api.group.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-oriental-accent" />
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
          <Users className="h-5 w-5 text-oriental-accent" />
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
          <Users className="h-5 w-5 text-oriental-accent" />
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
      <div className="space-y-1 mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-2xl font-semibold oriental-subtitle">Les Horaires par Jeunesse</h2>
        </div>
        <div className="text-base text-oriental-dark-brown">
          <span>
            <span className="font-semibold text-oriental-dark-brown">{groups.length}</span> jeunesses s'affronteront
          </span>
        </div>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sortedGroups.map((group) => {
          const groupSlug = createSlug(group.name);
          
          return (
            <Link 
              key={group.id} 
              href={`/teams/${groupSlug}`}
              className="block px-3 py-2.5 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-oriental-accent hover:bg-oriental-accent/5 transition-colors rounded-lg border border-border/30 hover:border-oriental-accent/30 bg-white shadow-sm truncate"
            >
              {group.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
} 