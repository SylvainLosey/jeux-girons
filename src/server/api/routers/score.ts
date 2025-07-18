import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { scores } from "~/server/db/schema";
import { eq, and, desc, gte, or } from "drizzle-orm";

export const scoreRouter = createTRPCRouter({
  // Get scores for a specific group-game-round combination
  getScore: publicProcedure
    .input(z.object({
      groupId: z.number(),
      gameId: z.number(),
      round: z.number().default(1),
    }))
    .query(async ({ ctx, input }) => {
      const score = await ctx.db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.groupId, input.groupId),
            eq(scores.gameId, input.gameId),
            eq(scores.round, input.round)
          )
        )
        .limit(1);

      return score[0] ?? null;
    }),

  // Get all scores for a specific group
  getByGroup: publicProcedure
    .input(z.object({
      groupId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(scores)
        .where(eq(scores.groupId, input.groupId));
    }),

  // Get all scores for a specific game
  getByGame: publicProcedure
    .input(z.object({
      gameId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(scores)
        .where(eq(scores.gameId, input.gameId));
    }),

  // Get all scores (useful for rankings)
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(scores);
    }),

  // Get recent scores for live display
  getRecent: publicProcedure
    .input(z.object({
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.scores.findMany({
        limit: input.limit,
        orderBy: desc(scores.updatedAt),
        with: {
          group: true,
          game: true,
        },
      });
    }),

  // Set or update a score
  setScore: adminProcedure
    .input(z.object({
      groupId: z.number(),
      gameId: z.number(),
      round: z.number().default(1),
      score: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Try to find existing score
      const existingScore = await ctx.db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.groupId, input.groupId),
            eq(scores.gameId, input.gameId),
            eq(scores.round, input.round)
          )
        )
        .limit(1);

      if (existingScore[0]) {
        // Update existing score
        const [updatedScore] = await ctx.db
          .update(scores)
          .set({
            score: input.score,
            updatedAt: new Date(),
          })
          .where(eq(scores.id, existingScore[0].id))
          .returning();

        return updatedScore;
      } else {
        // Create new score
        const [newScore] = await ctx.db
          .insert(scores)
          .values({
            groupId: input.groupId,
            gameId: input.gameId,
            round: input.round,
            score: input.score,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return newScore;
      }
    }),

  // Delete a score
  deleteScore: adminProcedure
    .input(z.object({
      groupId: z.number(),
      gameId: z.number(),
      round: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(scores)
        .where(
          and(
            eq(scores.groupId, input.groupId),
            eq(scores.gameId, input.gameId),
            eq(scores.round, input.round)
          )
        );

      return { success: true };
    }),

  // Delete all scores
  deleteAllScores: adminProcedure
    .mutation(async ({ ctx }) => {
      // Explicitly delete all scores with a where clause to satisfy linter
      await ctx.db.delete(scores).where(gte(scores.id, 0));
      return { success: true };
    }),

  // Get multiple scores at once for better performance
  getScores: publicProcedure
    .input(z.array(z.object({
      groupId: z.number(),
      gameId: z.number(),
      round: z.number().default(1),
    })))
    .query(async ({ ctx, input }) => {
      if (input.length === 0) {
        return [];
      }

      // Build OR conditions for each score request
      const conditions = input.map(req => 
        and(
          eq(scores.groupId, req.groupId),
          eq(scores.gameId, req.gameId),
          eq(scores.round, req.round)
        )
      );

      // Use OR to get all matching scores in a single query
      const allScores = await ctx.db
        .select()
        .from(scores)
        .where(or(...conditions));

      // Return results in the same order as input, with null for missing scores
      return input.map(req => {
        const score = allScores.find(s => 
          s.groupId === req.groupId && 
          s.gameId === req.gameId && 
          s.round === req.round
        );
        return score ?? null;
      });
    }),
}); 