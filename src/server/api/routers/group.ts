import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { groups } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Validation schema for creating/updating a group
const groupInputSchema = z.object({
  name: z.string().min(1, "Group name cannot be empty"),
  contactName: z.string().nullish(), // Allow null or undefined
  contactPhone: z.string().nullish(), // Allow null or undefined
});

export const groupRouter = createTRPCRouter({
  create: publicProcedure
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

  update: publicProcedure
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

  delete: publicProcedure
    .input(z.object({ id: z.number() })) // Require ID for deleting
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(groups).where(eq(groups.id, input.id));
      // Consider returning the deleted ID or success status
    }),
}); 