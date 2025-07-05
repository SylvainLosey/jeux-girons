import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { AdminAwareGamePage } from "./admin-aware-page";

interface GamePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  
  try {
    // Fetch the game directly by slug
    const game = await api.game.getBySlug({ slug });
    
    // Fetch the live schedule
    const liveSchedule = await api.schedule.getLive();

    return <AdminAwareGamePage game={game} liveSchedule={liveSchedule} />;
  } catch (error) {
    notFound();
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: GamePageProps) {
  const { slug } = await params;
  
  try {
    const game = await api.game.getBySlug({ slug });
    
    return {
      title: `${game.name} - Horaire`,
      description: `Consultez l'horaire détaillé du jeu ${game.name} pour les Jeux Murist 25.`,
    };
  } catch (error) {
    return {
      title: "Jeu non trouvé",
    };
  }
} 