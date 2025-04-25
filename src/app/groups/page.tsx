import { GroupManager } from "~/app/_components/group-manager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jeunesses | Jeux-Girons",
  description: "Gestion des jeunesses"
};

export default function GroupsPage() {
  return (
    <main className="min-h-screen bg-background">
      <GroupManager />
    </main>
  );
}
