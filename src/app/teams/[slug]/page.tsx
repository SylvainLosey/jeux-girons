import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { AdminAwareTeamPage } from "./admin-aware-page";

interface TeamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  
  try {
    // Fetch the group directly by slug
    const group = await api.group.getBySlug({ slug });
    
    // Fetch the live schedule
    const liveSchedule = await api.schedule.getLive();

    return <AdminAwareTeamPage group={group} liveSchedule={liveSchedule} />;
  } catch (error) {
    notFound();
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: TeamPageProps) {
  const { slug } = await params;
  
  try {
    const group = await api.group.getBySlug({ slug });
    
    return {
      title: `${group.name} - Horaire`,
      description: `Consultez l'horaire détaillé de la jeunesse ${group.name} pour les Jeux Murist 25.`,
    };
  } catch (error) {
    return {
      title: "Jeunesse non trouvée",
    };
  }
} 