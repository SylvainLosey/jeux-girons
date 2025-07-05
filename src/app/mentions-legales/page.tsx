"use client";

import { useRouter } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function MentionsLegalesPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-oriental-warm p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg border-oriental-gold/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-oriental-gold/10 p-3">
                <FileText className="h-8 w-8 text-oriental-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold oriental-title">
              Mentions Légales
            </CardTitle>
            <CardDescription className="text-base">
              Informations légales concernant ce site web
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-oriental-gold mb-3">
                  1. Responsable du Site
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Nom :</strong> Sylvain Losey</p>
                  <div>
                    <p><strong>Adresse :</strong></p>
                    <p className="ml-4">Giron de la Broye fribourgeoise 2025</p>
                    <p className="ml-4">Bas du Ruz 24</p>
                    <p className="ml-4">1489 Murist</p>
                  </div>
                  <p><strong>Contact :</strong> slosey@pm.me</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-oriental-gold mb-3">
                  2. Objet du Site
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    Ce site a pour unique but le suivi informatif des horaires et des scores des groupes participant aux jeux des Girons de Murist 2025.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-oriental-gold mb-3">
                  3. Hébergement
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    Ce site est hébergé par Vercel Inc., USA.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-oriental-gold mb-3">
                  4. Données et Cookies
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    Ce site n'affiche aucune donnée personnelle nominative. Il utilise uniquement des cookies techniques nécessaires à son bon fonctionnement.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-oriental-gold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l&apos;accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 