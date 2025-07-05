"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Gamepad2, Users, Sparkles } from "lucide-react";
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

export function GamesPreview() {
  // Fetch all games
  const { data: games, isLoading, error } = api.game.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Jeux</h2>
        </div>
        <div className="text-center p-8 text-muted-foreground">
          Chargement des jeux...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Jeux</h2>
        </div>
        <Alert>
          <AlertDescription>Impossible de charger les jeux: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="h-5 w-5 text-oriental-accent" />
          <h2 className="text-xl font-semibold oriental-subtitle">Les Jeux</h2>
        </div>
        <Alert>
          <AlertDescription>Aucun jeu disponible pour le moment.</AlertDescription>
        </Alert>
      </div>
    );
  }

      return (
      <div className="space-y-4">
        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-oriental-accent" />
            <h2 className="text-2xl font-semibold oriental-subtitle">Les Jeux</h2>
          </div>
          <div className="text-base text-oriental-dark-brown">
            <span>
              <span className="font-semibold text-oriental-dark-brown">{games.length}</span> joutes variées et surprenantes
            </span>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
        {games.map((game) => {
          const gameSlug = createSlug(game.name);
          
          return (
            <Link key={game.id} href={`/games/${gameSlug}`}>
              <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] h-full overflow-hidden !p-0">
                <div className="flex h-full min-h-[120px]">
                  {/* Game Image - Square, full width */}
                  <div className="flex-shrink-0 w-32 h-32">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Gamepad2 className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Game Details */}
                  <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-oriental-accent transition-colors line-clamp-2">
                        {game.name}
                      </h3>
                      
                      {game.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {game.description}
                        </p>
                      )}
                      
                      {!game.description && (
                        <p className="text-xs text-muted-foreground italic">
                          Aucune description disponible
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 