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
      toast.success("Group created successfully.");
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  const updateGroupMutation = api.group.update.useMutation({
    onSuccess: async () => {
      await utils.group.getAll.invalidate();
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
      toast.success("Group updated successfully.");
    },
    onError: (error) => {
      toast.error(`Failed to update group: ${error.message}`);
    },
  });

  const deleteGroupMutation = api.group.delete.useMutation({
    onSuccess: async () => {
      await utils.group.getAll.invalidate();
      toast.success("Group deleted successfully.");
    },
    onError: (error) => {
      toast.error(`Failed to delete group: ${error.message}`);
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
    toast.promise(
      new Promise<void>((resolve, reject) => {
        if (window.confirm("Are you sure you want to delete this group?")) {
          deleteGroupMutation.mutate({ id }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        } else {
          reject(new Error("Deletion cancelled"));
        }
      }),
      {
        loading: 'Deleting group...',
        success: 'Group deleted successfully!',
        error: (err) => err instanceof Error ? `Error: ${err.message}` : 'Failed to delete group',
      }
    );
  };

  const isSubmitting = createGroupMutation.isPending || updateGroupMutation.isPending;
  const isDeleting = deleteGroupMutation.isPending;

  if (isLoading) return <div className="text-center p-4">Loading groups...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Error loading groups: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Group Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
              <DialogDescription>
                {editingGroup ? "Update the details for this group." : "Fill in the details for the new group."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name <span className="text-red-500">*</span></FormLabel>
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
                      <FormLabel>Contact Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Smith" {...field} value={field.value ?? ''} />
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
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 555-0123" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingGroup ? "Saving..." : "Creating...") : "Save Group"}
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
              <TableHead>Group Name</TableHead>
              <TableHead>Contact Name</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No groups found. Click &quot;Create Group&quot; to add one.
                </TableCell>
              </TableRow>
            ) : (
              groups?.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.contactName ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{group.contactPhone ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleOpenDialog(group)} aria-label="Edit Group">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)} disabled={isDeleting} aria-label="Delete Group">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 