import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { games } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Validation schema for creating/updating a game
const gameInputSchema = z.object({
  name: z.string().min(1, "Game name cannot be empty"),
  numberOfGroups: z.number().int().min(1).max(3),
  description: z.string().nullish(), // Allow null or undefined
  rounds: z.number().int().min(1).max(2).default(1),
  imageUrl: z.string().url().nullish().or(z.literal("")), // Allow empty string or valid URL
});

export const gameRouter = createTRPCRouter({
  create: publicProcedure
    .input(gameInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(games).values({
        name: input.name,
        numberOfGroups: input.numberOfGroups,
        description: input.description,
        rounds: input.rounds,
        imageUrl: input.imageUrl ?? null,
      });
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    // Fetch all games, ordered by name
    return ctx.db.query.games.findMany({
      orderBy: (games, { asc }) => [asc(games.name)],
    });
  }),

  update: publicProcedure
    .input(
      gameInputSchema.extend({
        id: z.number(), // Require ID for updating
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(games)
        .set({
          name: input.name,
          numberOfGroups: input.numberOfGroups,
          description: input.description,
          rounds: input.rounds,
          imageUrl: input.imageUrl ?? null,
          // updatedAt is handled by $onUpdate in the schema
        })
        .where(eq(games.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() })) // Require ID for deleting
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(games).where(eq(games.id, input.id));
    }),
}); 