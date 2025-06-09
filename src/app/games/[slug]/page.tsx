import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Gamepad2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { AdminAwareGamePage } from "./admin-aware-page";

// Helper function to create URL-friendly slugs (same as in unified-search)
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

interface GamePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  
  // Fetch all games to find the one matching the slug
  const games = await api.game.getAll();
  const game = games.find(g => createSlug(g.name) === slug);
  
  if (!game) {
    notFound();
  }

  // Fetch the live schedule
  const liveSchedule = await api.schedule.getLive();

  return <AdminAwareGamePage game={game} liveSchedule={liveSchedule} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: GamePageProps) {
  const { slug } = await params;
  const games = await api.game.getAll();
  const game = games.find(g => createSlug(g.name) === slug);
  
  if (!game) {
    return {
      title: "Jeu non trouvé",
    };
  }

  return {
    title: `${game.name} - Horaire`,
    description: `Consultez l'horaire détaillé du jeu ${game.name} pour les Jeux Murist 25.`,
  };
} 