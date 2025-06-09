import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Users } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { UnifiedScheduleView } from "~/app/_components/unified-schedule-view";
import { AdminAwareTeamPage } from "./admin-aware-page";

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

interface TeamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  
  // Fetch all groups to find the one matching the slug
  const groups = await api.group.getAll();
  const group = groups.find(g => createSlug(g.name) === slug);
  
  if (!group) {
    notFound();
  }

  // Fetch the live schedule
  const liveSchedule = await api.schedule.getLive();

  return <AdminAwareTeamPage group={group} liveSchedule={liveSchedule} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: TeamPageProps) {
  const { slug } = await params;
  const groups = await api.group.getAll();
  const group = groups.find(g => createSlug(g.name) === slug);
  
  if (!group) {
    return {
      title: "Jeunesse non trouvée",
    };
  }

  return {
    title: `${group.name} - Horaire`,
    description: `Consultez l'horaire détaillé de la jeunesse ${group.name} pour les Jeux Murist 25.`,
  };
} 