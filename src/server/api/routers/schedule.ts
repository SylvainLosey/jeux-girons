// src/server/api/routers/schedule.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { schedules, timeRanges, timeSlots, scheduleEntries } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Schema for saving a schedule
const saveScheduleSchema = z.object({
  name: z.string().min(1, "Schedule name cannot be empty"),
  description: z.string().optional(),
  gameDurationMs: z.number().int().positive(),
  transitionTimeMs: z.number().int().min(0),
  timeRanges: z.array(z.object({
    startTime: z.date(),
    endTime: z.date(),
  })),
  schedule: z.array(z.object({
    slotIndex: z.number().int(),
    startTime: z.date(),
    endTime: z.date(),
    entries: z.array(z.object({
      groupId: z.number().int(),
      gameId: z.number().int(),
      round: z.number().int().default(1),
    }))
  }))
});

export const scheduleRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.schedules.findMany({
        orderBy: (schedules, { desc }) => [desc(schedules.createdAt)],
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const scheduleData = await ctx.db.query.schedules.findFirst({
        where: eq(schedules.id, input.id),
        with: {
          timeRanges: true,
          timeSlots: {
            with: {
              entries: {
                with: {
                  group: true,
                  game: true,
                }
              }
            }
          }
        }
      });

      if (!scheduleData) {
        throw new Error("Schedule not found");
      }

      // Transform database data to match your Schedule type
      return {
        id: scheduleData.id,
        name: scheduleData.name,
        description: scheduleData.description,
        gameDurationMs: scheduleData.gameDurationMs,
        transitionTimeMs: scheduleData.transitionTimeMs,
        timeRanges: scheduleData.timeRanges.map(range => ({
          id: String(range.id),
          startTime: range.startTime,
          endTime: range.endTime,
        })),
        schedule: scheduleData.timeSlots.map(slot => ({
          slotIndex: slot.slotIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
          entries: slot.entries.map(entry => ({
            group: entry.group,
            game: entry.game,
            round: entry.round,
          }))
        }))
      };
    }),

  save: publicProcedure
    .input(saveScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      // Use a transaction to ensure all operations succeed or fail together
      return await ctx.db.transaction(async (tx) => {
        // 1. Create the schedule record
        const [savedSchedule] = await tx.insert(schedules).values({
          name: input.name,
          description: input.description || null,
          gameDurationMs: input.gameDurationMs,
          transitionTimeMs: input.transitionTimeMs,
        }).returning();

        // 2. Save the time ranges
        await tx.insert(timeRanges).values(
          input.timeRanges.map((range) => ({
            scheduleId: savedSchedule.id,
            startTime: range.startTime,
            endTime: range.endTime,
          }))
        );

        // 3. Save each time slot and its entries
        for (const slot of input.schedule) {
          const [savedSlot] = await tx.insert(timeSlots).values({
            scheduleId: savedSchedule.id,
            slotIndex: slot.slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }).returning();

          // 4. Save all entries for this slot
          if (slot.entries.length > 0) {
            await tx.insert(scheduleEntries).values(
              slot.entries.map((entry) => ({
                timeSlotId: savedSlot.id,
                groupId: entry.groupId,
                gameId: entry.gameId,
                round: entry.round,
              }))
            );
          }
        }

        return savedSchedule;
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(schedules).where(eq(schedules.id, input.id));
      return { success: true };
    }),
});