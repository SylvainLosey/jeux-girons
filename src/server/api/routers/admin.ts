import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

export const adminRouter = createTRPCRouter({
  /**
   * Authenticate admin with password
   */
  authenticate: publicProcedure
    .input(z.object({
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const isValid = input.password === env.ADMIN_PASSWORD;
      return { success: isValid };
    }),

  /**
   * Validate admin session (for client-side validation)
   */
  validate: publicProcedure
    .input(z.object({
      password: z.string(),
    }))
    .query(async ({ input }) => {
      const isValid = input.password === env.ADMIN_PASSWORD;
      return { isValid };
    }),
}); 