"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { useAdmin } from "~/app/_components/navbar";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setIsAdmin } = useAdmin();

  const authenticateMutation = api.admin.authenticate.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (data.success && data.token) {
        // Store JWT token in localStorage
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminAuthenticated", "true");
        setIsAdmin(true);
        router.push("/admin/creneaux");
      } else {
        setError("Mot de passe incorrect");
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      if (error.message === "Too many failed login attempts. Please try again later.") {
        setError("Trop de tentatives de connexion. Veuillez réessayer plus tard.");
      } else {
        setError("Mot de passe incorrect");
      }
      console.error("Authentication error:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Veuillez entrer un mot de passe");
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    try {
      await authenticateMutation.mutateAsync({ password });
    } catch (error) {
      // Error is handled in the mutation callbacks
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-oriental-warm p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-oriental-gold/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-oriental-gold/10 p-3">
                <Shield className="h-8 w-8 text-oriental-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold oriental-title">
              Accès Administrateur
            </CardTitle>
            <CardDescription className="text-base">
              Entrez le mot de passe pour accéder au mode administration
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez le mot de passe admin"
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-oriental-gold hover:bg-oriental-gold-dark text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-oriental-gold"
              >
                Retour à l&apos;accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 