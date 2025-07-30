import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { groups, scheduleEntries } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createSlug } from "~/app/_utils/slug-utils";

// Validation schema for creating/updating a group
const groupInputSchema = z.object({
  name: z.string().min(1, "Group name cannot be empty"),
  contactName: z.string().nullish(), // Allow null or undefined
  contactPhone: z.string().nullish(), // Allow null or undefined
});

export const groupRouter = createTRPCRouter({
  create: adminProcedure
    .input(groupInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(groups).values({
        name: input.name,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
      });
      // Consider returning the created group ID or object if needed
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    // Fetch all groups, ordered by name
    return ctx.db.query.groups.findMany({
      orderBy: (groups, { asc }) => [asc(groups.name)],
    });
  }),

  update: adminProcedure
    .input(
      groupInputSchema.extend({
        id: z.number(), // Require ID for updating
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(groups)
        .set({
          name: input.name,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          // updatedAt is handled by $onUpdate in the schema
        })
        .where(eq(groups.id, input.id));
       // Consider returning the updated group or success status
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() })) // Require ID for deleting
    .mutation(async ({ ctx, input }) => {
      // Use a transaction to ensure all operations succeed or fail together
      return await ctx.db.transaction(async (tx) => {
        // Check if the group exists first
        const group = await tx.query.groups.findFirst({
          where: eq(groups.id, input.id),
        });
        
        if (!group) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Group not found",
          });
        }
        
        // First, delete all schedule entries that reference this group
        await tx.delete(scheduleEntries).where(eq(scheduleEntries.groupId, input.id));
        
        // Then delete the group (scores will be automatically deleted due to CASCADE)
        await tx.delete(groups).where(eq(groups.id, input.id));
        
        return { success: true };
      });
    }),

  // Get group by slug
  getBySlug: publicProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all groups and find the one matching the slug
      const groups = await ctx.db.query.groups.findMany();
      const group = groups.find(g => createSlug(g.name) === input.slug);
      
      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }
      
      return group;
    }),
}); 