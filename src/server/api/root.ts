// import { postRouter } from "~/server/api/routers/post";
import { groupRouter } from "~/server/api/routers/group";
import { gameRouter } from "~/server/api/routers/game";
import { scheduleRouter } from "~/server/api/routers/schedule";
import { scoreRouter } from "~/server/api/routers/score";
import { adminRouter } from "~/server/api/routers/admin";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Remove the post router registration
  // post: postRouter,
  group: groupRouter,
  game: gameRouter,
  schedule: scheduleRouter,
  score: scoreRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
