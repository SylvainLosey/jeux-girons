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
} from "~/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const groupFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Group name is required"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;
type Group = RouterOutputs["group"]["getAll"][number];

export function GroupManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);

  const utils = api.useUtils();

  const { data: groups, isLoading, error } = api.group.getAll.useQuery();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactPhone: "",
    },
  });

  const createGroupMutation = api.group.create.useMutation({
    onSuccess: async () => {
      await utils.group.getAll.invalidate();
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
      toast.success("Jeunesse créée avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la création de la jeunesse: ${error.message}`);
    },
  });

  const updateGroupMutation = api.group.update.useMutation({
    onSuccess: async () => {
      await utils.group.getAll.invalidate();
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
      toast.success("Jeunesse mise à jour avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la mise à jour de la jeunesse: ${error.message}`);
    },
  });

  const deleteGroupMutation = api.group.delete.useMutation({
    onSuccess: async () => {
      await utils.group.getAll.invalidate();
      toast.success("Jeunesse supprimée avec succès.");
    },
    onError: (error) => {
      toast.error(`Échec de la suppression de la jeunesse: ${error.message}`);
    },
  });

  const handleOpenDialog = (group: Group | null = null) => {
    setEditingGroup(group);
    if (group) {
      form.reset({
        id: group.id,
        name: group.name,
        contactName: group.contactName ?? "",
        contactPhone: group.contactPhone ?? "",
      });
    } else {
      form.reset({ name: "", contactName: "", contactPhone: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: GroupFormValues) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ ...values, id: editingGroup.id });
    } else {
      createGroupMutation.mutate(values);
    }
  };

  const handleDelete = (id: number) => {
    setGroupToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (groupToDelete === null) return;
    
    toast.loading('Suppression de la jeunesse...');
    
    deleteGroupMutation.mutate(
      { id: groupToDelete },
      {
        onSuccess: () => {
          toast.success('Jeunesse supprimée avec succès !');
          setIsDeleteDialogOpen(false);
          setGroupToDelete(null);
        },
        onError: (err) => {
          const errorMessage = err instanceof Error 
            ? `Erreur: ${err.message}` 
            : 'Échec de la suppression de la jeunesse';
          toast.error(errorMessage);
          setIsDeleteDialogOpen(false);
          setGroupToDelete(null);
        }
      }
    );
  };

  const isSubmitting = createGroupMutation.isPending || updateGroupMutation.isPending;
  const isDeleting = deleteGroupMutation.isPending;

  if (isLoading) return <div className="text-center p-4 text-slate-500">Chargement des jeunesses...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur lors du chargement des jeunesses: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold oriental-title">Jeunesses</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Jeunesse
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Modifier la Jeunesse" : "Créer une Nouvelle Jeunesse"}</DialogTitle>
              <DialogDescription>
                {editingGroup ? "Mettez à jour les détails de cette jeunesse." : "Remplissez les détails pour la nouvelle jeunesse."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jeunesse <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Marketing Team" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact (Optionel)</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone (Optionel)</FormLabel>
                      <FormControl>
                        <Input placeholder="079 273 18 21" {...field} value={field.value ?? ''} />
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
                    {isSubmitting ? (editingGroup ? "Enregistrement..." : "Création...") : "Sauvegarder"}
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
              <TableHead>Jeunesse</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                  Aucune jeunesse trouvée. Cliquez sur &quot;Ajouter une Jeunesse&quot; pour en créer une.
                </TableCell>
              </TableRow>
            ) : (
              groups?.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium text-slate-700">{group.name}</TableCell>
                  <TableCell className="text-slate-600">{group.contactName ?? <span className="text-slate-500">-</span>}</TableCell>
                  <TableCell className="text-slate-600">{group.contactPhone ?? <span className="text-slate-500">-</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleOpenDialog(group)} aria-label="Editer">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)} disabled={isDeleting} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmation de suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette jeunesse? Cette action ne peut pas être annulée.
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