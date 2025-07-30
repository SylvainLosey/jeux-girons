// src/server/api/routers/schedule.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { schedules, timeRanges, timeSlots, scheduleEntries } from "~/server/db/schema";
import { eq, count } from "drizzle-orm";


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
      isSecondChance: z.boolean().default(false),
    }))
  }))
});

export const scheduleRouter = createTRPCRouter({
    getAll: publicProcedure
    .query(async ({ ctx }) => {
      // First, get all schedules
      const allSchedules = await ctx.db.query.schedules.findMany({
        orderBy: (schedules, { desc }) => [desc(schedules.createdAt)],
      });
      
      // For each schedule, fetch the counts separately
      const schedulesWithCounts = await Promise.all(
        allSchedules.map(async (schedule) => {
          // Get time slot count with proper count() import
          const slotCountResult = await ctx.db
            .select({ count: count() })
            .from(timeSlots)
            .where(eq(timeSlots.scheduleId, schedule.id));
          

          
          return {
            ...schedule,
            slotCount: Number(slotCountResult[0]?.count ?? 0),
          };
        })
      );
      
      return schedulesWithCounts;
    }),

    getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Find the requested schedule
      const schedule = await ctx.db.query.schedules.findFirst({
        where: eq(schedules.id, input.id),
      });
      
      if (!schedule) {
        throw new Error("Schedule not found");
      }
      
      // Now fetch all related data separately
      const timeRangesData = await ctx.db.query.timeRanges.findMany({
        where: eq(timeRanges.scheduleId, schedule.id),
      });
      
      const timeSlotData = await ctx.db.query.timeSlots.findMany({
        where: eq(timeSlots.scheduleId, schedule.id),
      });
      
      // Get all entries for these time slots
      const slotIds = timeSlotData.map(slot => slot.id);
      const entriesData = slotIds.length > 0 
        ? await ctx.db.query.scheduleEntries.findMany({
            where: (entries, { inArray }) => inArray(entries.timeSlotId, slotIds),
            with: {
              group: true,
              game: true,
            },
          })
        : [];
      
      // Group entries by timeSlotId
      const entriesBySlot = entriesData.reduce((acc, entry) => {
        acc[entry.timeSlotId] ??= [];
        acc[entry.timeSlotId]!.push(entry);
        return acc;
      }, {} as Record<number, typeof entriesData>);
      
      // Reconstruct the full schedule structure
      const formattedTimeSlots = timeSlotData.map(slot => {
        const entries = entriesBySlot[slot.id] ?? [];
        return {
          slotIndex: slot.slotIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
          entries: entries.map(entry => ({
            id: entry.id,
            group: entry.group,
            game: entry.game,
            round: entry.round,
            timeSlotId: entry.timeSlotId,
            isSecondChance: entry.isSecondChance,
          })),
        };
      });
      
      // Sort the time slots by start time
      formattedTimeSlots.sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      
      // Build the final response
      return {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        gameDurationMs: schedule.gameDurationMs,
        transitionTimeMs: schedule.transitionTimeMs,
        isLive: schedule.isLive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        timeRanges: timeRangesData.map(range => ({
          id: String(range.id),
          startTime: range.startTime,
          endTime: range.endTime,
        })),
        schedule: formattedTimeSlots,
      };
    }),

  save: adminProcedure
    .input(saveScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Use a transaction to ensure all operations succeed or fail together
        return await ctx.db.transaction(async (tx) => {
          // 1. Create the schedule record
          const [savedSchedule] = await tx.insert(schedules).values({
            name: input.name,
            description: input.description ?? null,
            gameDurationMs: input.gameDurationMs,
            transitionTimeMs: input.transitionTimeMs,
          }).returning();

          if (!savedSchedule) {
            throw new Error("Failed to create schedule");
          }

          // 2. Save the time ranges
          if (input.timeRanges.length > 0) {
            await tx.insert(timeRanges).values(
              input.timeRanges.map((range) => ({
                scheduleId: savedSchedule.id,
                startTime: range.startTime,
                endTime: range.endTime,
              }))
            );
          }

          // 3. Save time slots in batches to avoid overwhelming the database
          const batchSize = 10; // Process 10 slots at a time
          for (let i = 0; i < input.schedule.length; i += batchSize) {
            const batch = input.schedule.slice(i, i + batchSize);
            
            for (const slot of batch) {
              const [savedSlot] = await tx.insert(timeSlots).values({
                scheduleId: savedSchedule.id,
                slotIndex: slot.slotIndex,
                startTime: slot.startTime,
                endTime: slot.endTime,
              }).returning();

              if (!savedSlot) {
                throw new Error(`Failed to create time slot ${slot.slotIndex}`);
              }

              // 4. Save all entries for this slot in a single batch
              if (slot.entries.length > 0) {
                await tx.insert(scheduleEntries).values(
                  slot.entries.map((entry) => ({
                    timeSlotId: savedSlot.id,
                    groupId: entry.groupId,
                    gameId: entry.gameId,
                    round: entry.round,
                    isSecondChance: entry.isSecondChance,
                  }))
                );
              }
            }
          }

          return savedSchedule;
        });
      } catch (error) {
        console.error("Error saving schedule:", error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes("connection") || error.message.includes("stream")) {
            throw new Error("Erreur de connexion à la base de données. Veuillez réessayer.");
          }
          if (error.message.includes("timeout")) {
            throw new Error("L'opération a pris trop de temps. Veuillez réessayer.");
          }
          throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
        }
        
        throw new Error("Erreur inconnue lors de l'enregistrement du planning");
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(schedules).where(eq(schedules.id, input.id));
      return { success: true };
    }),

  setLive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // First, set all schedules to not live
        await tx
          .update(schedules)
          .set({ isLive: false });
        
        // Then set the selected schedule to live
        await tx
          .update(schedules)
          .set({ isLive: true })
          .where(eq(schedules.id, input.id));
        
        return { success: true };
      });
    }),

  getLive: publicProcedure
    .query(async ({ ctx }) => {
      // First find the live schedule
      const liveSched = await ctx.db.query.schedules.findFirst({
        where: eq(schedules.isLive, true),
      });
      
      if (!liveSched) {
        return null;
      }
      
      // Now fetch all related data separately
      const timeRangesData = await ctx.db.query.timeRanges.findMany({
        where: eq(timeRanges.scheduleId, liveSched.id),
      });
      
      const timeSlotData = await ctx.db.query.timeSlots.findMany({
        where: eq(timeSlots.scheduleId, liveSched.id),
      });
      
      // Get all entries for these time slots
      const slotIds = timeSlotData.map(slot => slot.id);
      const entriesData = slotIds.length > 0 
        ? await ctx.db.query.scheduleEntries.findMany({
            where: (entries, { inArray }) => inArray(entries.timeSlotId, slotIds),
            with: {
              group: true,
              game: true,
            },
          })
        : [];
      
      // Group entries by timeSlotId
      const entriesBySlot = entriesData.reduce((acc, entry) => {
        acc[entry.timeSlotId] ??= [];
        acc[entry.timeSlotId]!.push(entry);
        return acc;
      }, {} as Record<number, typeof entriesData>);
      
      // Construct the return data
      return {
        id: liveSched.id,
        name: liveSched.name,
        description: liveSched.description,
        gameDurationMs: liveSched.gameDurationMs,
        transitionTimeMs: liveSched.transitionTimeMs,
        isLive: liveSched.isLive,
        timeRanges: timeRangesData.map(range => ({
          id: String(range.id),
          startTime: range.startTime,
          endTime: range.endTime,
        })),
        schedule: timeSlotData.map(slot => ({
          slotIndex: slot.slotIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
          entries: (entriesBySlot[slot.id] ?? []).map(entry => ({
            group: entry.group,
            game: entry.game,
            round: entry.round,
            isSecondChance: entry.isSecondChance,
          }))
        }))
      };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1, "Schedule name cannot be empty"),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schedules)
        .set({
          name: input.name,
          description: input.description ?? null,
          // updatedAt is handled automatically by $onUpdate in the schema
        })
        .where(eq(schedules.id, input.id));
      
      return { success: true };
    }),

  // Get schedule data organized by time slots for admin score management
  getCreneauxForAdmin: adminProcedure
    .query(async ({ ctx }) => {
      // Find the live schedule
      const liveSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schedules.isLive, true),
      });
      
      if (!liveSchedule) {
        return null;
      }
      
      // Get all time slots for this schedule
      const scheduledTimeSlots = await ctx.db.query.timeSlots.findMany({
        where: eq(timeSlots.scheduleId, liveSchedule.id),
        orderBy: (timeSlotsTable, { asc }) => [asc(timeSlotsTable.startTime)],
      });
      
      // Get all entries for these time slots
      const slotIds = scheduledTimeSlots.map(slot => slot.id);
      const entries = slotIds.length > 0 
        ? await ctx.db.query.scheduleEntries.findMany({
            where: (entries, { inArray }) => inArray(entries.timeSlotId, slotIds),
            with: {
              group: true,
              game: true,
            },
          })
        : [];
      
      // Get all scores for completion status
      const allScores = await ctx.db.query.scores.findMany({
        with: {
          group: true,
          game: true,
        },
      });
      
      // Group entries by time slot
      const entriesBySlot = entries.reduce((acc, entry) => {
        acc[entry.timeSlotId] ??= [];
        acc[entry.timeSlotId]!.push(entry);
        return acc;
      }, {} as Record<number, typeof entries>);
      
              // Build the créneau data structure
        const creneaux = scheduledTimeSlots.map(slot => {
        const slotEntries = entriesBySlot[slot.id] ?? [];
        
        // Calculate completion status for this slot
        const gamesWithScores = slotEntries.map(entry => {
          const hasScore = allScores.some(score => 
            score.groupId === entry.groupId && 
            score.gameId === entry.gameId && 
            score.round === entry.round
          );
          
          return {
            ...entry,
            hasScore,
          };
        });
        
        const completedCount = gamesWithScores.filter(g => g.hasScore).length;
        const totalCount = gamesWithScores.length;
        const isComplete = totalCount > 0 && completedCount === totalCount;
        
        return {
          slotIndex: slot.slotIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
          games: gamesWithScores,
          completedCount,
          totalCount,
          isComplete,
        };
      });
      
      return {
        schedule: liveSchedule,
        creneaux,
      };
    }),
});