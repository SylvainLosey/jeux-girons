"use client";

import { useState } from "react";
import { Settings, Eye, EyeOff } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { useSettings } from "./navbar";
import { useAdmin } from "./navbar";

export function AdminSettings() {
  const { showScoresPublicly, updateShowScoresPublicly } = useSettings();
  const { isAdmin } = useAdmin();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const handleToggleScores = async () => {
    setIsUpdating(true);
    try {
      updateShowScoresPublicly(!showScoresPublicly);
    } catch (error) {
      console.error("Failed to update setting:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Paramètres</h3>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-scores" className="text-base">
              Afficher les scores publiquement
            </Label>
            <p className="text-sm text-muted-foreground">
              {showScoresPublicly 
                ? "Les scores et classements sont visibles par tous les utilisateurs" 
                : "Les scores et classements sont cachés pour les utilisateurs publics"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showScoresPublicly ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-red-600" />
            )}
            <Switch
              id="show-scores"
              checked={showScoresPublicly}
              onCheckedChange={handleToggleScores}
              disabled={isUpdating}
            />
          </div>
        </div>
        
        {isUpdating && (
          <div className="text-sm text-muted-foreground">
            Mise à jour en cours...
          </div>
        )}
      </div>
    </div>
  );
} 