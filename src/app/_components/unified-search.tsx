"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Game, Group } from "~/app/_types/schedule-types";
import { Search, Users, Gamepad2, Calendar } from "lucide-react";
import { cn } from "~/lib/utils";

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

type SearchItem = {
  id: number;
  name: string;
  type: "team" | "game";
  slug: string;
  description?: string;
};

export function UnifiedSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();
  
  // Fetch all groups and games
  const { data: groups, isLoading: isLoadingGroups } = api.group.getAll.useQuery();
  const { data: games, isLoading: isLoadingGames } = api.game.getAll.useQuery();

  // Combine groups and games into a unified search list
  const searchItems: SearchItem[] = [
    ...(groups?.map(group => ({
      id: group.id,
      name: group.name,
      type: "team" as const,
      slug: createSlug(group.name),
    })) ?? []),
    ...(games?.map(game => ({
      id: game.id,
      name: game.name,
      type: "game" as const,
      slug: createSlug(game.name),
      description: game.description ?? undefined,
    })) ?? [])
  ];

  // Filter items based on search value
  const filteredItems = searchItems.filter(item =>
    searchValue.trim() === "" || 
    item.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Sort items: teams first, then games, both alphabetically
  const sortedItems = filteredItems.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "team" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const handleSelectItem = (item: SearchItem) => {
    setSearchFocused(false);
    setSearchValue("");
    
    if (item.type === "team") {
      router.push(`/teams/${item.slug}`);
    } else {
      router.push(`/games/${item.slug}`);
    }
  };

  const getItemIcon = (type: "team" | "game") => {
    return type === "team" ? 
      <Users className="mr-2 h-4 w-4 text-blue-500" /> : 
      <Gamepad2 className="mr-2 h-4 w-4 text-green-500" />;
  };

  const getItemBadge = (type: "team" | "game") => {
    return type === "team" ? (
      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
        Jeunesse
      </span>
    ) : (
      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded">
        Jeu
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Rechercher un horaire</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Cherchez une jeunesse ou un jeu pour consulter son horaire détaillé
        </p>
      </div>

      {/* Unified Search */}
      <div className="w-full relative">
        <div className="flex items-center border rounded-lg px-3 bg-background shadow-sm">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            type="text"
            placeholder="Rechercher une jeunesse ou un jeu..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="flex h-12 w-full py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        
        {searchFocused && (
          <div className="absolute w-full z-20 border border-t-0 rounded-b-lg shadow-lg bg-popover max-h-[400px] overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {(isLoadingGroups || isLoadingGames) ? (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                  {searchValue.trim() === "" ? "Tapez pour rechercher..." : "Aucun résultat trouvé"}
                </div>
              ) : (
                <ul className="py-1">
                  {sortedItems.slice(0, 10).map((item) => (
                    <li 
                      key={`${item.type}-${item.id}`}
                      className="px-3 py-2.5 flex items-center justify-between hover:bg-accent cursor-pointer group"
                      onMouseDown={() => handleSelectItem(item)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        {getItemIcon(item.type)}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {getItemBadge(item.type)}
                      </div>
                    </li>
                  ))}
                  {sortedItems.length > 10 && (
                    <li className="px-3 py-2 text-xs text-center text-muted-foreground border-t">
                      +{sortedItems.length - 10} résultats supplémentaires
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 