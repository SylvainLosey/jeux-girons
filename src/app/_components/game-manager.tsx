"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const gameFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Nom du jeu est requis"),
  numberOfGroups: z.coerce.number().int().min(1).max(3),
  description: z.string().optional(),
  rounds: z.coerce.number().int().min(1).max(2).default(1),
});

type GameFormValues = z.infer<typeof gameFormSchema>;
type Game = RouterOutputs["game"]["getAll"][number];

export function GameManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<number | null>(null);

  const utils = api.useUtils();

  const { data: games, isLoading, error } = api.game.getAll.useQuery();

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      name: "",
      numberOfGroups: 1,
      description: "",
      rounds: 1,
    },
  });

  const createGameMutation = api.game.create.useMutation({
    onSuccess: async () => {
      await utils.game.getAll.invalidate();
      setIsDialogOpen(false);
      setEditingGame(null);
      form.reset();
      toast.success("Jeu créé avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la création du jeu: ${error.message}`);
    },
  });

  const updateGameMutation = api.game.update.useMutation({
    onSuccess: async () => {
      await utils.game.getAll.invalidate();
      setIsDialogOpen(false);
      setEditingGame(null);
      form.reset();
      toast.success("Jeu mis à jour avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la mise à jour du jeu: ${error.message}`);
    },
  });

  const deleteGameMutation = api.game.delete.useMutation({
    onSuccess: async () => {
      await utils.game.getAll.invalidate();
      toast.success("Jeu supprimé avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la suppression du jeu: ${error.message}`);
    },
  });

  const handleOpenDialog = (game: Game | null = null) => {
    setEditingGame(game);
    if (game) {
      form.reset({
        id: game.id,
        name: game.name,
        numberOfGroups: game.numberOfGroups,
        description: game.description ?? "",
        rounds: game.rounds ?? 1,
      });
    } else {
      form.reset({ 
        name: "", 
        numberOfGroups: 1, 
        description: "", 
        rounds: 1 
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: GameFormValues) => {
    if (editingGame) {
      updateGameMutation.mutate({ ...values, id: editingGame.id });
    } else {
      createGameMutation.mutate(values);
    }
  };

  const handleDelete = (id: number) => {
    setGameToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (gameToDelete === null) return;
    
    toast.loading('Suppression du jeu...');
    
    deleteGameMutation.mutate(
      { id: gameToDelete },
      {
        onSuccess: () => {
          toast.success('Jeu supprimé avec succès !');
          setIsDeleteDialogOpen(false);
          setGameToDelete(null);
        },
        onError: (err) => {
          const errorMessage = err instanceof Error 
            ? `Erreur: ${err.message}` 
            : 'Échec de la suppression du jeu';
          toast.error(errorMessage);
          setIsDeleteDialogOpen(false);
          setGameToDelete(null);
        }
      }
    );
  };

  const isSubmitting = createGameMutation.isPending || updateGameMutation.isPending;
  const isDeleting = deleteGameMutation.isPending;

  if (isLoading) return <div className="text-center p-4">Chargement des jeux...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur lors du chargement des jeux: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold oriental-title">Jeux</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Jeu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingGame ? "Modifier le Jeu" : "Créer un Nouveau Jeu"}</DialogTitle>
              <DialogDescription>
                {editingGame ? "Mettez à jour les détails de ce jeu." : "Remplissez les détails pour le nouveau jeu."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Course de Chariots" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfGroups"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Jeunesses <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Nombre de jeunesses nécessaires pour ce jeu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rounds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Tours <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Nombre de fois que chaque groupe doit jouer à ce jeu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optionel)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description des règles du jeu..." 
                          className="resize-none" 
                          {...field} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingGame ? "Enregistrement..." : "Création...") : "Sauvegarder"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Tours</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                  Aucun jeu trouvé. Cliquez sur &quot;Ajouter un Jeu&quot; pour en créer un.
                </TableCell>
              </TableRow>
            ) : (
              games?.map((game) => {
                let badgeText = "";
                let badgeClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
                switch (game.numberOfGroups) {
                  case 1:
                    badgeText = "1 jeunesse";
                    badgeClasses += " bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                    break;
                  case 2:
                    badgeText = "2 jeunesses";
                    badgeClasses += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
                    break;
                  case 3:
                    badgeText = "3 jeunesses";
                    badgeClasses += " bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
                    break;
                  default:
                    badgeText = `${game.numberOfGroups} jeunesses`; 
                    badgeClasses += " bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                }

                return (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium text-slate-700">{game.name}</TableCell>
                    <TableCell>
                      <span className={badgeClasses}>
                        {badgeText}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">{game.rounds > 1 ? `${game.rounds} tours` : "1 tour"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleOpenDialog(game)} aria-label="Editer">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)} disabled={isDeleting} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmation de suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce jeu? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 