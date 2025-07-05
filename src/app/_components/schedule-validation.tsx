"use client";

import React from 'react';
import { Game, Group, Schedule } from "../_types/schedule-types";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CheckCircle, AlertTriangle, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface ScheduleValidationProps {
  schedule: Schedule | null;
  groups: Group[];
  games: Game[];
}

interface ValidationResult {
  theoreticalMinimum: number;
  actualTotal: number;
  isValid: boolean;
  breakdown: {
    game: Game;
    participationsNeeded: number;
    minimumSlots: number;
  }[];
  fillerGames: number;
}

function calculateValidation(schedule: Schedule | null, groups: Group[], games: Game[]): ValidationResult {
  const breakdown = games.map(game => {
    const rounds = game.rounds ?? 1;
    const participationsNeeded = groups.length * rounds;
    const minimumSlots = Math.ceil(participationsNeeded / game.numberOfGroups);
    
    return {
      game,
      participationsNeeded,
      minimumSlots
    };
  });

  const theoreticalMinimum = breakdown.reduce((sum, item) => sum + item.minimumSlots, 0);
  
  let actualTotal = 0;
  let fillerGames = 0;
  
  if (schedule) {
    // Count actual parties (game instances) instead of entries
    // Group entries by game, round, and timeslot to count unique parties
    const partiesMap = new Map<string, boolean>();
    
    schedule.forEach(slot => {
      slot.entries.forEach(entry => {
        // Create a unique key for each party
        const partyKey = `${slot.slotIndex}-${entry.game.id}-${entry.round ?? 1}`;
        partiesMap.set(partyKey, entry.isSecondChance ?? false);
      });
    });
    
    actualTotal = partiesMap.size;
    fillerGames = Array.from(partiesMap.values()).filter(isSecondChance => isSecondChance).length;
  }

  const isValid = actualTotal === theoreticalMinimum;

  return {
    theoreticalMinimum,
    actualTotal,
    isValid,
    breakdown,
    fillerGames
  };
}

export function ScheduleValidation({ schedule, groups, games }: ScheduleValidationProps) {
  if (!games?.length || !groups?.length) {
    return null;
  }

  const validation = calculateValidation(schedule, groups, games);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Validation du Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            {validation.isValid ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            )}
            <div>
              <p className="font-semibold">
                {validation.isValid ? "✅ Planning Optimal" : "⚠️ Planning Non-Optimal"}
              </p>
              <p className="text-sm text-muted-foreground">
                {validation.isValid 
                  ? "Le nombre de parties générées correspond exactement au minimum théorique"
                  : "Le nombre de parties générées diffère du minimum théorique"
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {schedule ? validation.actualTotal : "—"} / {validation.theoreticalMinimum}
            </p>
            <p className="text-sm text-muted-foreground">Parties jouées</p>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{groups.length}</p>
            <p className="text-sm text-muted-foreground">Jeunesses</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{games.length}</p>
            <p className="text-sm text-muted-foreground">Jeux</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-green-600">{validation.theoreticalMinimum}</p>
            <p className="text-sm text-muted-foreground">Min. Théorique</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              {schedule ? validation.actualTotal : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Parties Générées</p>
          </div>
        </div>

        {/* Filler games indicator */}
        {schedule && validation.fillerGames > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
                         <AlertDescription>
               <span className="font-medium">{validation.fillerGames} parties &quot;DEUXIEME CHANCE&quot;</span> détectées. 
               Cela peut indiquer un déséquilibre dans la répartition des jeux.
             </AlertDescription>
          </Alert>
        )}

        {/* Game breakdown (only show if there's a schedule) */}
        {schedule && (
          <details className="mt-4">
            <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
              Voir le détail par jeu
            </summary>
            <div className="mt-3 space-y-2">
              {validation.breakdown.map(({ game, participationsNeeded, minimumSlots }) => (
                <div key={game.id} className="flex items-center justify-between p-2 text-sm border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{game.name}</span>
                    {game.rounds && game.rounds > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {game.rounds} tours
                      </Badge>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{participationsNeeded} participations → {minimumSlots} créneaux min.</div>
                    <div>{game.numberOfGroups} groupes par partie</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
} 